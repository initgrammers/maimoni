import { zValidator } from '@hono/zod-validator';
import { expenseSchema, expenseUpdateSchema } from '@maimoni/core';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserContext } from '../middleware';
import {
  type ApiDeps,
  addBusinessContext,
  createCoreDeps,
  createCoreUseCases,
} from './types';

export function createExpensesRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const {
    listExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpense,
  } = createCoreUseCases(coreDeps);
  const { boardAccessService } = coreDeps.services;

  const resolveBoardAccess = async (userId: string, boardId: string) =>
    boardAccessService.getUserBoardRole({ userId, boardId });

  router.post('/expenses', zValidator('json', expenseSchema), async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    addBusinessContext(c, {
      endpoint: 'create_expense',
      entityType: 'expense',
      action: 'create',
      boardId: body.boardId,
    });

    const result = await createExpense({ ...body, actorId: userId });

    if (result.status === 'created') {
      return c.json([result.expense]);
    }

    if (result.status === 'invalid-category') {
      return c.json({ error: 'Categoría de gasto inválida' }, 400);
    }

    if (result.status === 'forbidden') {
      const access = await resolveBoardAccess(userId, body.boardId);
      if (!access) {
        return c.json({ error: 'No tienes acceso a este tablero' }, 403);
      }
      if (access.role === 'viewer') {
        return c.json({ error: 'No tienes permisos para crear gastos' }, 403);
      }
    }

    return c.json({ error: 'Datos inválidos' }, 400);
  });

  router.get('/expenses/:expenseId', async (c) => {
    const userId = c.get('userId');
    const expenseId = c.req.param('expenseId');
    const expenseIdResult = z.string().uuid().safeParse(expenseId);
    if (!expenseIdResult.success) {
      return c.json({ error: 'expenseId inválido' }, 400);
    }

    addBusinessContext(c, {
      endpoint: 'get_expense',
      entityType: 'expense',
      action: 'get',
      entityId: expenseIdResult.data,
    });

    const result = await getExpense({
      actorId: userId,
      expenseId: expenseIdResult.data,
    });

    if (result.status === 'found') {
      return c.json(result.expense);
    }

    if (result.status === 'expense-not-found') {
      return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    if (result.status === 'forbidden') {
      return c.json({ error: 'No tienes acceso a este gasto' }, 403);
    }

    return c.json({ error: 'expenseId inválido' }, 400);
  });

  router.patch(
    '/expenses/:expenseId',
    zValidator('json', expenseUpdateSchema),
    async (c) => {
      const userId = c.get('userId');
      const expenseId = c.req.param('expenseId');
      const expenseIdResult = z.string().uuid().safeParse(expenseId);
      if (!expenseIdResult.success) {
        return c.json({ error: 'expenseId inválido' }, 400);
      }

      addBusinessContext(c, {
        endpoint: 'update_expense',
        entityType: 'expense',
        action: 'update',
        entityId: expenseIdResult.data,
      });

      const body = c.req.valid('json');

      const result = await updateExpense({
        actorId: userId,
        expenseId: expenseIdResult.data,
        update: body,
      });

      if (result.status === 'updated') {
        return c.json(result.expense);
      }

      if (result.status === 'expense-not-found') {
        return c.json({ error: 'Gasto no encontrado' }, 404);
      }

      if (result.status === 'invalid-category') {
        return c.json({ error: 'Categoría de gasto inválida' }, 400);
      }

      if (result.status === 'forbidden') {
        return c.json({ error: 'No tienes permisos para editar gastos' }, 403);
      }

      return c.json({ error: 'expenseId inválido' }, 400);
    },
  );

  router.delete('/expenses/:expenseId', async (c) => {
    const userId = c.get('userId');
    const expenseId = c.req.param('expenseId');
    const expenseIdResult = z.string().uuid().safeParse(expenseId);
    if (!expenseIdResult.success) {
      return c.json({ error: 'expenseId inválido' }, 400);
    }

    addBusinessContext(c, {
      endpoint: 'delete_expense',
      entityType: 'expense',
      action: 'delete',
      entityId: expenseIdResult.data,
    });

    const result = await deleteExpense({
      actorId: userId,
      expenseId: expenseIdResult.data,
    });

    if (result.status === 'deleted') {
      return c.json({ success: true, id: result.id });
    }

    if (result.status === 'expense-not-found') {
      return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    if (result.status === 'forbidden') {
      return c.json({ error: 'No tienes permisos para eliminar gastos' }, 403);
    }

    return c.json({ error: 'expenseId inválido' }, 400);
  });

  router.get('/expenses', async (c) => {
    const userId = c.get('userId');
    const boardId = c.req.query('boardId');
    if (!boardId) return c.json({ error: 'boardId is required' }, 400);

    addBusinessContext(c, {
      endpoint: 'list_expenses',
      entityType: 'expense',
      action: 'list',
      boardId,
    });

    const result = await listExpenses({ actorId: userId, boardId });

    if (result.status === 'listed') {
      return c.json(result.expenses);
    }

    return c.json({ error: 'No tienes acceso a este tablero' }, 403);
  });

  return router;
}
