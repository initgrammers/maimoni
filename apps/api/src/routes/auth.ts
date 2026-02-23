import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { type ApiDeps, createCoreDeps, createCoreUseCases } from './types';

export function createAuthRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const { claimAnonymousData } = createCoreUseCases(coreDeps);

  router.post('/auth/claim', async (c) => {
    const realUserId = c.get('userId');
    const body = (await c.req.json()) as { anonymousId?: string };
    const anonymousId = body.anonymousId;

    if (!anonymousId) {
      return c.json({ error: 'anonymousId is required' }, 400);
    }

    const result = await claimAnonymousData({
      actorId: realUserId,
      anonymousId,
    });

    if (result.status === 'claimed') {
      return c.json({ success: true });
    }

    if (result.status === 'invalid-anonymous-id') {
      return c.json({ error: 'anonymousId is required' }, 400);
    }

    if (result.status === 'invalid-user-id') {
      return c.json({ error: 'Failed to claim anonymous data' }, 400);
    }

    return c.json({ error: result.error }, 400);
  });

  return router;
}
