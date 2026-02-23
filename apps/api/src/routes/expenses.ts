import { zValidator } from '@hono/zod-validator';
import { categories, expenses } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserContext } from '../middleware';
import { getUserBoardRole } from '../shared/board-access';
import { expenseSchema, expenseUpdateSchema } from '../shared/schemas';
import type { ApiDeps } from './types';

export function createExpensesRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();

  router.post('/expenses', zValidator('json', expenseSchema), async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const access = await getUserBoardRole(db, userId, body.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este tablero' }, 403);
    }
    if (access.role === 'viewer') {
      return c.json({ error: 'No tienes permisos para crear gastos' }, 403);
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, body.categoryId))
      .limit(1);

    if (!category || category.type !== 'expense') {
      return c.json({ error: 'Categoría de gasto inválida' }, 400);
    }

    const result = await db
      .insert(expenses)
      .values({
        boardId: body.boardId,
        userId,
        amount: body.amount,
        categoryId: body.categoryId,
        note: body.note,
        tags: body.tags,
        receiptUrl: body.receiptUrl,
        date: body.date ? new Date(body.date) : new Date(),
      })
      .returning();

    return c.json(result[0]);
  });

  router.get('/expenses/:expenseId', async (c) => {
    const userId = c.get('userId');
    const expenseId = c.req.param('expenseId');
    const expenseIdResult = z.string().uuid().safeParse(expenseId);
    if (!expenseIdResult.success) {
      return c.json({ error: 'expenseId inválido' }, 400);
    }

    const [expense] = await db
      .select()
      .from(expenses)
      .where(
        and(eq(expenses.id, expenseIdResult.data), eq(expenses.isActive, true)),
      )
      .limit(1);

    if (!expense) {
      return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    const access = await getUserBoardRole(db, userId, expense.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este gasto' }, 403);
    }

    return c.json(expense);
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

      const body = c.req.valid('json');

      const [existingExpense] = await db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.id, expenseIdResult.data),
            eq(expenses.isActive, true),
          ),
        )
        .limit(1);

      if (!existingExpense) {
        return c.json({ error: 'Gasto no encontrado' }, 404);
      }

      const access = await getUserBoardRole(
        db,
        userId,
        existingExpense.boardId,
      );
      if (!access) {
        return c.json({ error: 'No tienes acceso a este gasto' }, 403);
      }
      if (access.role === 'viewer') {
        return c.json({ error: 'No tienes permisos para editar gastos' }, 403);
      }

      if (body.categoryId) {
        const [category] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, body.categoryId))
          .limit(1);

        if (!category || category.type !== 'expense') {
          return c.json({ error: 'Categoría de gasto inválida' }, 400);
        }
      }

      const [updatedExpense] = await db
        .update(expenses)
        .set({
          amount: body.amount,
          categoryId: body.categoryId,
          note: body.note,
          date: body.date ? new Date(body.date) : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expenses.id, expenseIdResult.data),
            eq(expenses.boardId, existingExpense.boardId),
            eq(expenses.isActive, true),
          ),
        )
        .returning();

      return c.json(updatedExpense);
    },
  );

  router.delete('/expenses/:expenseId', async (c) => {
    const userId = c.get('userId');
    const expenseId = c.req.param('expenseId');
    const expenseIdResult = z.string().uuid().safeParse(expenseId);
    if (!expenseIdResult.success) {
      return c.json({ error: 'expenseId inválido' }, 400);
    }

    const existingRows = await db
      .select()
      .from(expenses)
      .where(
        and(eq(expenses.id, expenseIdResult.data), eq(expenses.isActive, true)),
      )
      .limit(1);

    if (existingRows.length === 0) {
      return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    const existingExpense = existingRows[0];
    const access = await getUserBoardRole(db, userId, existingExpense.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este gasto' }, 403);
    }
    if (access.role === 'viewer') {
      return c.json({ error: 'No tienes permisos para eliminar gastos' }, 403);
    }

    const result = await db
      .update(expenses)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(expenses.id, expenseIdResult.data),
          eq(expenses.boardId, existingExpense.boardId),
          eq(expenses.isActive, true),
        ),
      )
      .returning({ id: expenses.id });

    if (result.length === 0) {
      return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    return c.json({ success: true, id: result[0].id });
  });

  router.get('/expenses', async (c) => {
    const userId = c.get('userId');
    const boardId = c.req.query('boardId');
    if (!boardId) return c.json({ error: 'boardId is required' }, 400);

    const access = await getUserBoardRole(db, userId, boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este tablero' }, 403);
    }

    const result = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.boardId, boardId), eq(expenses.isActive, true)));

    return c.json(result);
  });

  return router;
}
