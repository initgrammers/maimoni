import type { ErrorHandler } from 'hono';
import type { UserContext } from './auth';

interface DbErrorDetails {
  query?: string;
  params?: unknown[];
  sqlCode?: string;
  sqlMessage?: string;
}

function isDbError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorMessage = error.message.toLowerCase();
  const hasQuery =
    'query' in error ||
    errorMessage.includes('query') ||
    errorMessage.includes('drizzle');

  return (
    hasQuery ||
    error.constructor.name.includes('Drizzle') ||
    error.constructor.name.includes('Neon') ||
    error.constructor.name.includes('Postgres')
  );
}

function extractDbErrorDetails(error: Error): DbErrorDetails {
  const details: DbErrorDetails = {};

  if ('query' in error && typeof error.query === 'string') {
    details.query = error.query;
  }

  if ('params' in error && Array.isArray(error.params)) {
    details.params = error.params;
  }

  if ('cause' in error && error.cause instanceof Error) {
    const cause = error.cause;
    details.sqlMessage = cause.message;

    if ('code' in cause && typeof cause.code === 'string') {
      details.sqlCode = cause.code;
    }
  }

  return details;
}

function extractErrorDetails(error: unknown): {
  type: string;
  message: string;
  stack?: string;
  dbDetails?: DbErrorDetails;
} {
  if (!(error instanceof Error)) {
    return {
      type: typeof error,
      message: String(error),
    };
  }

  const baseDetails = {
    type: error.constructor.name,
    message: error.message,
    stack: error.stack,
  };

  if (isDbError(error)) {
    return {
      ...baseDetails,
      dbDetails: extractDbErrorDetails(error),
    };
  }

  return baseDetails;
}

export function createErrorHandler(): ErrorHandler<UserContext> {
  return (error, c) => {
    const logger = c.get('wide-logger' as never);
    const errorDetails = extractErrorDetails(error);

    const errorMetadata: Record<string, unknown> = {
      error_type: errorDetails.type,
      error_message: errorDetails.message,
    };

    if (errorDetails.stack) {
      errorMetadata.stack = errorDetails.stack;
    }

    if (errorDetails.dbDetails) {
      errorMetadata.is_db_error = true;

      if (errorDetails.dbDetails.query) {
        errorMetadata.sql_query = errorDetails.dbDetails.query;
      }

      if (errorDetails.dbDetails.params) {
        errorMetadata.sql_params = errorDetails.dbDetails.params;
      }

      if (errorDetails.dbDetails.sqlCode) {
        errorMetadata.sql_code = errorDetails.dbDetails.sqlCode;
      }

      if (errorDetails.dbDetails.sqlMessage) {
        errorMetadata.sql_message = errorDetails.dbDetails.sqlMessage;
      }
    }

    if (logger && typeof logger === 'object' && 'addError' in logger) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));

      (
        logger as {
          addError: (error: Error, metadata?: Record<string, unknown>) => void;
        }
      ).addError(errorInstance, errorMetadata);
    }

    return c.json({ error: 'Internal server error' }, 500);
  };
}

export const errorHandler = createErrorHandler();
