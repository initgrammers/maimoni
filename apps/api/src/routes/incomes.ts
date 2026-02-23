import { zValidator } from '@hono/zod-validator';
import { categories, incomes } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserContext } from '../middleware';
import { getUserBoardRole } from '../shared/board-access';
import { incomeSchema, incomeUpdateSchema } from '../shared/schemas';
import type { ApiDeps } from './types';

export function createIncomesRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();

  router.get('/incomes', async (c) => {
    const userId = c.get('userId');
    const boardId = c.req.query('boardId');
    if (!boardId) return c.json({ error: 'boardId is required' }, 400);

    const access = await getUserBoardRole(db, userId, boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este tablero' }, 403);
    }

    const result = await db
      .select()
      .from(incomes)
      .where(and(eq(incomes.boardId, boardId), eq(incomes.isActive, true)));

    return c.json(result);
  });

  router.get('/incomes/:incomeId', async (c) => {
    const userId = c.get('userId');
    const incomeId = c.req.param('incomeId');
    const incomeIdResult = z.string().uuid().safeParse(incomeId);
    if (!incomeIdResult.success) {
      return c.json({ error: 'incomeId inválido' }, 400);
    }

    const [income] = await db
      .select()
      .from(incomes)
      .where(
        and(eq(incomes.id, incomeIdResult.data), eq(incomes.isActive, true)),
      )
      .limit(1);

    if (!income) {
      return c.json({ error: 'Ingreso no encontrado' }, 404);
    }

    const access = await getUserBoardRole(db, userId, income.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este ingreso' }, 403);
    }

    return c.json(income);
  });

  router.post('/incomes', zValidator('json', incomeSchema), async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const access = await getUserBoardRole(db, userId, body.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este tablero' }, 403);
    }
    if (access.role === 'viewer') {
      return c.json({ error: 'No tienes permisos para crear ingresos' }, 403);
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, body.categoryId))
      .limit(1);

    if (!category || category.type !== 'income') {
      return c.json({ error: 'Categoría de ingreso inválida' }, 400);
    }

    const result = await db
      .insert(incomes)
      .values({
        boardId: body.boardId,
        userId,
        amount: body.amount,
        categoryId: body.categoryId,
        note: body.note,
        date: body.date ? new Date(body.date) : new Date(),
      })
      .returning();

    return c.json(result[0]);
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

      const [existingIncome] = await db
        .select()
        .from(incomes)
        .where(
          and(eq(incomes.id, incomeIdResult.data), eq(incomes.isActive, true)),
        )
        .limit(1);

      if (!existingIncome) {
        return c.json({ error: 'Ingreso no encontrado' }, 404);
      }

      const access = await getUserBoardRole(db, userId, existingIncome.boardId);
      if (!access) {
        return c.json({ error: 'No tienes acceso a este ingreso' }, 403);
      }
      if (access.role === 'viewer') {
        return c.json(
          { error: 'No tienes permisos para editar ingresos' },
          403,
        );
      }

      if (body.categoryId) {
        const [category] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, body.categoryId))
          .limit(1);

        if (!category || category.type !== 'income') {
          return c.json({ error: 'Categoría de ingreso inválida' }, 400);
        }
      }

      const [updatedIncome] = await db
        .update(incomes)
        .set({
          amount: body.amount,
          categoryId: body.categoryId,
          note: body.note,
          date: body.date ? new Date(body.date) : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(incomes.id, incomeIdResult.data),
            eq(incomes.boardId, existingIncome.boardId),
            eq(incomes.isActive, true),
          ),
        )
        .returning();

      return c.json(updatedIncome);
    },
  );

  router.delete('/incomes/:incomeId', async (c) => {
    const userId = c.get('userId');
    const incomeId = c.req.param('incomeId');
    const incomeIdResult = z.string().uuid().safeParse(incomeId);
    if (!incomeIdResult.success) {
      return c.json({ error: 'incomeId inválido' }, 400);
    }

    const result = await db
      .select()
      .from(incomes)
      .where(
        and(eq(incomes.id, incomeIdResult.data), eq(incomes.isActive, true)),
      )
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: 'Ingreso no encontrado' }, 404);
    }

    const existingIncome = result[0];
    const access = await getUserBoardRole(db, userId, existingIncome.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este ingreso' }, 403);
    }
    if (access.role === 'viewer') {
      return c.json(
        { error: 'No tienes permisos para eliminar ingresos' },
        403,
      );
    }

    const deleted = await db
      .update(incomes)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(incomes.id, incomeIdResult.data),
          eq(incomes.boardId, existingIncome.boardId),
          eq(incomes.isActive, true),
        ),
      )
      .returning({ id: incomes.id });

    if (deleted.length === 0) {
      return c.json({ error: 'Ingreso no encontrado' }, 404);
    }

    return c.json({ success: true, id: deleted[0].id });
  });

  return router;
}
