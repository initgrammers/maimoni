import { zValidator } from '@hono/zod-validator';
import { incomeSchema, incomeUpdateSchema } from '@maimoni/core';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserContext } from '../middleware';
import { type ApiDeps, createCoreDeps, createCoreUseCases } from './types';

export function createIncomesRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const { listIncomes, getIncome, createIncome, updateIncome, deleteIncome } =
    createCoreUseCases(coreDeps);
  const { boardAccessService } = coreDeps.services;

  const resolveBoardAccess = async (userId: string, boardId: string) =>
    boardAccessService.getUserBoardRole({ userId, boardId });

  router.get('/incomes', async (c) => {
    const userId = c.get('userId');
    const boardId = c.req.query('boardId');
    if (!boardId) return c.json({ error: 'boardId is required' }, 400);

    const result = await listIncomes({ actorId: userId, boardId });

    if (result.status === 'listed') {
      return c.json(result.incomes);
    }

    return c.json({ error: 'No tienes acceso a este tablero' }, 403);
  });

  router.get('/incomes/:incomeId', async (c) => {
    const userId = c.get('userId');
    const incomeId = c.req.param('incomeId');
    const incomeIdResult = z.string().uuid().safeParse(incomeId);
    if (!incomeIdResult.success) {
      return c.json({ error: 'incomeId inválido' }, 400);
    }

    const result = await getIncome({
      actorId: userId,
      incomeId: incomeIdResult.data,
    });

    if (result.status === 'found') {
      return c.json(result.income);
    }

    if (result.status === 'income-not-found') {
      return c.json({ error: 'Ingreso no encontrado' }, 404);
    }

    if (result.status === 'forbidden') {
      return c.json({ error: 'No tienes acceso a este ingreso' }, 403);
    }

    return c.json({ error: 'incomeId inválido' }, 400);
  });

  router.post('/incomes', zValidator('json', incomeSchema), async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const result = await createIncome({ ...body, actorId: userId });

    if (result.status === 'created') {
      return c.json([result.income]);
    }

    if (result.status === 'invalid-category') {
      return c.json({ error: 'Categoría de ingreso inválida' }, 400);
    }

    if (result.status === 'forbidden') {
      const access = await resolveBoardAccess(userId, body.boardId);
      if (!access) {
        return c.json({ error: 'No tienes acceso a este tablero' }, 403);
      }
      if (access.role === 'viewer') {
        return c.json({ error: 'No tienes permisos para crear ingresos' }, 403);
      }
    }

    return c.json({ error: 'Datos inválidos' }, 400);
  });

  router.patch(
    '/incomes/:incomeId',
    zValidator('json', incomeUpdateSchema),
    async (c) => {
      const userId = c.get('userId');
      const incomeId = c.req.param('incomeId');
      const incomeIdResult = z.string().uuid().safeParse(incomeId);
      if (!incomeIdResult.success) {
        return c.json({ error: 'incomeId inválido' }, 400);
      }

      const body = c.req.valid('json');

      const result = await updateIncome({
        actorId: userId,
        incomeId: incomeIdResult.data,
        update: body,
      });

      if (result.status === 'updated') {
        return c.json(result.income);
      }

      if (result.status === 'income-not-found') {
        return c.json({ error: 'Ingreso no encontrado' }, 404);
      }

      if (result.status === 'invalid-category') {
        return c.json({ error: 'Categoría de ingreso inválida' }, 400);
      }

      if (result.status === 'forbidden') {
        return c.json(
          { error: 'No tienes permisos para editar ingresos' },
          403,
        );
      }

      return c.json({ error: 'incomeId inválido' }, 400);
    },
  );

  router.delete('/incomes/:incomeId', async (c) => {
    const userId = c.get('userId');
    const incomeId = c.req.param('incomeId');
    const incomeIdResult = z.string().uuid().safeParse(incomeId);
    if (!incomeIdResult.success) {
      return c.json({ error: 'incomeId inválido' }, 400);
    }

    const result = await deleteIncome({
      actorId: userId,
      incomeId: incomeIdResult.data,
    });

    if (result.status === 'deleted') {
      return c.json({ success: true, id: result.id });
    }

    if (result.status === 'income-not-found') {
      return c.json({ error: 'Ingreso no encontrado' }, 404);
    }

    if (result.status === 'forbidden') {
      return c.json(
        { error: 'No tienes permisos para eliminar ingresos' },
        403,
      );
    }

    return c.json({ error: 'incomeId inválido' }, 400);
  });

  return router;
}
