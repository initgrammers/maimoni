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

const authIssuer = normalizeAuthIssuer(getEnv('AUTH_URL'));
const authClient = createOpenAuthClient(authIssuer, 'webapp');

function getBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice('Bearer '.length);
}

export const authMiddleware: MiddlewareHandler<UserContext> = async (
  c,
  next,
) => {
  const token = getBearerToken(c.req.header('authorization'));
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const verified = await authClient.verify(authSubjects, token);

  if (verified.err || verified.subject.type !== 'user') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userId', verified.subject.properties.id);
  await next();
};

export type { UserContext };
