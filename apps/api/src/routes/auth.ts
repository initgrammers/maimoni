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

  router.post('/auth/claim', async (c) => {
    const logger = c.get('wide-logger');

    addBusinessContext(c, {
      endpoint: 'claim_anonymous_data',
      entityType: 'auth',
      action: 'claim',
    });

    const realUserId = c.get('userId');
    logger.addContext('infra', { realUserId });

    const body = (await c.req.json()) as {
      anonymousId?: string;
      expenses?: unknown[];
      incomes?: unknown[];
      boardId?: string;
      boardName?: string;
      spendingLimitAmount?: string | null;
    };
    logger.addContext('infra', { claimBody: body });

    const anonymousId = body.anonymousId;
    logger.addContext('infra', { anonymousId });

    if (!anonymousId) {
      logger.addError(new Error('anonymousId is required'), {
        code: 'missing_anonymous_id',
      });
      return c.json({ error: 'anonymousId is required' }, 400);
    }

    const result = await claimAnonymousData({
      actorId: realUserId,
      anonymousId,
      expenses: body.expenses,
      incomes: body.incomes,
      boardId: body.boardId,
      boardName: body.boardName,
      spendingLimitAmount: body.spendingLimitAmount,
    }).catch((err) => {
      console.error('[claim] Error:', err);
      logger.addError(err, { code: 'claim_exception', stack: err.stack });
      return { status: 'failed', error: err.message };
    });
    logger.addContext('infra', { claimResult: result });

    if (result.status === 'claimed') {
      return c.json({ success: true });
    }

    if (result.status === 'invalid-anonymous-id') {
      logger.addError(new Error('invalid anonymous ID'), {
        code: 'invalid_anonymous_id',
      });
      return c.json({ error: 'anonymousId is required' }, 400);
    }

    if (result.status === 'invalid-user-id') {
      logger.addError(new Error('invalid user ID'), {
        code: 'invalid_user_id',
      });
      return c.json({ error: 'Failed to claim anonymous data' }, 400);
    }

    logger.addError(new Error('claim failed'), {
      code: 'claim_failed',
      result,
    });
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
