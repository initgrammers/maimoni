import {
  authSubjects,
  createOpenAuthClient,
  normalizeAuthIssuer,
} from '@maimoni/auth';
import type { MiddlewareHandler } from 'hono';
import { getEnv } from '../../../../packages/utils/src/index';

type UserContext = {
  Variables: {
    userId: string;
  };
};

type AuthClient = ReturnType<typeof createOpenAuthClient>;

function getBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }
  return authorization.slice('Bearer '.length);
}

function createDefaultAuthClient(): AuthClient {
  const authIssuer = normalizeAuthIssuer(getEnv('AUTH_URL'));
  return createOpenAuthClient(authIssuer, 'webapp');
}

/**
 * Factory function para crear el auth middleware.
 * Permite inyectar un mock client para testing.
 */
export function createAuthMiddleware(
  client: AuthClient = createDefaultAuthClient(),
): MiddlewareHandler<UserContext> {
  return async (c, next) => {
    const logger = c.get('wide-logger');
    const token = getBearerToken(c.req.header('authorization'));

    if (!token) {
      logger.addError(new Error('Authentication failed'), {
        auth_failed: true,
        code: 'missing_token',
        reason: 'No Authorization header or invalid Bearer format',
      });
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const verified = await client.verify(authSubjects, token);

    if (verified.err) {
      logger.addError(new Error('Authentication failed'), {
        auth_failed: true,
        code: 'verification_failed',
        verification_error: verified.err.message,
      });
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (verified.subject.type !== 'user') {
      logger.addError(new Error('Authentication failed'), {
        auth_failed: true,
        code: 'invalid_subject_type',
        subject_type: verified.subject.type,
        expected_type: 'user',
      });
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Auth successful - set userId and add user context to logger
    c.set('userId', verified.subject.properties.id);

    logger.addContext('user', {
      id: verified.subject.properties.id,
    });

    await next();
  };
}

// Middleware por defecto para producción
export const authMiddleware = createAuthMiddleware();

export type { UserContext };
