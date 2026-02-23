import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { type ApiDeps, createCoreDeps, createCoreUseCases } from './types';

export function createDashboardRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const { getDashboard } = createCoreUseCases(coreDeps);

  router.get('/dashboard', async (c) => {
    const userId = c.get('userId');
    const requestedBoardId = c.req.query('boardId');
    const result = await getDashboard({
      actorId: userId,
      boardId: requestedBoardId,
    });

    if (result.status === 'forbidden') {
      return c.json({ error: 'No tienes acceso a este tablero' }, 403);
    }

    return c.json({
      board: result.board,
      role: result.role,
      boards: result.boards,
      incomes: result.incomes,
      expenses: result.expenses,
    });
  });

  return router;
}
