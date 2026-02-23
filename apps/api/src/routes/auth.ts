import { claimAnonymousData } from '@maimoni/db';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import type { ApiDeps } from './types';

export function createAuthRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();

  router.post('/auth/claim', async (c) => {
    const realUserId = c.get('userId');
    const body = (await c.req.json()) as { anonymousId?: string };
    const anonymousId = body.anonymousId;

    if (!anonymousId) {
      return c.json({ error: 'anonymousId is required' }, 400);
    }

    try {
      await claimAnonymousData(db, { realUserId, anonymousId });
      return c.json({ success: true });
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to claim anonymous data',
        },
        400,
      );
    }
  });

  return router;
}
