import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from './auth';
import { createErrorHandler } from './error-handler';

function createMockWideLogger() {
  const errors: Array<{
    error: Error;
    metadata?: Record<string, unknown>;
  }> = [];

  return {
    errors,
    addContext: () => {},
    addError: (error: Error, metadata?: Record<string, unknown>) => {
      errors.push({ error, metadata });
    },
    getEvent: () => ({}),
  };
}

describe('Error Handler', () => {
  it('should catch unhandled errors and log them', async () => {
    const mockLogger = createMockWideLogger();

    const app = new Hono<UserContext>();

    // Mount mock logger
    app.use('/api/*', async (c, next) => {
      c.set('wide-logger' as never, mockLogger);
      await next();
    });

    // Register error handler
    app.onError(createErrorHandler());

    // Route that throws an error
    app.get('/api/test', () => {
      throw new Error('Test error');
    });

    const res = await app.request('/api/test');

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });

    // Verify error was logged
    expect(mockLogger.errors.length).toBe(1);
    expect(mockLogger.errors[0].error.message).toBe('Test error');
    expect(mockLogger.errors[0].metadata?.error_type).toBe('Error');
  });

  it('should extract DB error details', async () => {
    const mockLogger = createMockWideLogger();

    const app = new Hono<UserContext>();

    app.use('/api/*', async (c, next) => {
      c.set('wide-logger' as never, mockLogger);
      await next();
    });

    app.onError(createErrorHandler());

    // Simulate Drizzle error
    app.get('/api/test', () => {
      const error = new Error('Failed query') as Error & {
        query: string;
        params: unknown[];
        cause: Error & { code: string };
      };
      error.query = 'SELECT * FROM users WHERE id = $1';
      error.params = ['invalid-uuid'];
      error.cause = new Error('invalid input syntax for type uuid') as Error & {
        code: string;
      };
      error.cause.code = '22P02';
      throw error;
    });

    const res = await app.request('/api/test');

    expect(res.status).toBe(500);

    // Verify DB error details were logged
    expect(mockLogger.errors.length).toBe(1);
    const metadata = mockLogger.errors[0].metadata;
    expect(metadata?.is_db_error).toBe(true);
    expect(metadata?.sql_query).toBe('SELECT * FROM users WHERE id = $1');
    expect(metadata?.sql_params).toEqual(['invalid-uuid']);
    expect(metadata?.sql_code).toBe('22P02');
    expect(metadata?.sql_message).toBe('invalid input syntax for type uuid');
  });

  it('should handle non-Error throws', async () => {
    const mockLogger = createMockWideLogger();

    const app = new Hono<UserContext>();

    app.use('/api/*', async (c, next) => {
      c.set('wide-logger' as never, mockLogger);
      await next();
    });

    app.onError(createErrorHandler());

    app.get('/api/test', () => {
      throw 'String error';
    });

    const res = await app.request('/api/test');

    expect(res.status).toBe(500);
    expect(mockLogger.errors.length).toBe(1);
    expect(mockLogger.errors[0].metadata?.error_type).toBe('string');
  });
});
