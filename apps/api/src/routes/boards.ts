import { zValidator } from '@hono/zod-validator';
import { boards } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserContext } from '../middleware';
import { getUserBoardRole, listUserBoards } from '../shared/board-access';
import { boardSettingsSchema } from '../shared/schemas';
import type { ApiDeps } from './types';

export function createBoardsRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();

  router.patch(
    '/boards/:boardId/settings',
    zValidator('json', boardSettingsSchema),
    async (c) => {
      const userId = c.get('userId');
      const boardId = c.req.param('boardId');
      const boardIdResult = z.string().uuid().safeParse(boardId);
      if (!boardIdResult.success) {
        return c.json({ error: 'boardId inválido' }, 400);
      }

      const access = await getUserBoardRole(db, userId, boardIdResult.data);
      if (!access) {
        return c.json({ error: 'Tablero no encontrado' }, 404);
      }

      if (access.role !== 'owner') {
        return c.json(
          { error: 'No tienes permisos para actualizar este tablero' },
          403,
        );
      }

      const body = c.req.valid('json');

      const updateFields: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (body.name !== undefined) {
        updateFields.name = body.name;
      }

      if (body.spendingLimitAmount !== undefined) {
        updateFields.spendingLimitAmount = body.spendingLimitAmount;
      }

      const [updatedBoard] = await db
        .update(boards)
        .set(updateFields)
        .where(eq(boards.id, access.board.id))
        .returning();

      return c.json({ board: updatedBoard });
    },
  );

  router.delete('/boards/:boardId', async (c) => {
    const userId = c.get('userId');
    const boardId = c.req.param('boardId');
    const boardIdResult = z.string().uuid().safeParse(boardId);
    if (!boardIdResult.success) {
      return c.json({ error: 'boardId inválido' }, 400);
    }

    const access = await getUserBoardRole(db, userId, boardIdResult.data);
    if (!access) {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }

    if (access.role !== 'owner') {
      return c.json(
        { error: 'No tienes permisos para eliminar este tablero' },
        403,
      );
    }

    const userBoards = await listUserBoards(db, userId);
    if (userBoards.length <= 1) {
      return c.json({ error: 'No puedes eliminar tu único tablero' }, 400);
    }

    const result = await db
      .update(boards)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(boards.id, boardIdResult.data), eq(boards.isActive, true)))
      .returning({ id: boards.id });

    if (result.length === 0) {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }

    return c.json({ success: true, id: result[0].id });
  });

  return router;
}
