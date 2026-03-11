import { getOrCreateInitialBoard, syncUser } from '@maimoni/db';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import {
  type ApiDeps,
  addBusinessContext,
  createCoreDeps,
  createCoreUseCases,
} from './types';

export function createAuthRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const { claimAnonymousData } = createCoreUseCases(coreDeps);

  router.post('/auth/anonymous', async (c) => {
    addBusinessContext(c, {
      endpoint: 'create_anonymous_user',
      entityType: 'auth',
      action: 'create_anonymous',
    });

    // Generate anonymous user ID
    const anonymousId = crypto.randomUUID();

    try {
      // Create anonymous user in database
      const user = await syncUser(db, {
        id: anonymousId,
        phoneNumber: null,
      });

      // Create initial board for the anonymous user
      await getOrCreateInitialBoard(db, { userId: anonymousId });

      // Return anonymous ID - the webapp will handle token creation
      return c.json({
        anonymousId: user.id,
        name: user.name,
      });
    } catch (error) {
      console.error('Error creating anonymous user:', error);
      return c.json({ error: 'Failed to create anonymous user' }, 500);
    }
  });

  router.post('/auth/claim', async (c) => {
    const realUserId = c.get('userId');
    const body = (await c.req.json()) as {
      anonymousId?: string;
      expenses?: unknown[];
      incomes?: unknown[];
    };
    const anonymousId = body.anonymousId;

    addBusinessContext(c, {
      endpoint: 'claim_anonymous_data',
      entityType: 'auth',
      action: 'claim',
    });

    if (!anonymousId) {
      return c.json({ error: 'anonymousId is required' }, 400);
    }

    const result = await claimAnonymousData({
      actorId: realUserId,
      anonymousId,
      expenses: body.expenses,
      incomes: body.incomes,
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

    return c.json(
      {
        error:
          result.status === 'failed'
            ? result.error
            : 'Failed to claim anonymous data',
      },
      400,
    );
  });

  return router;
}
