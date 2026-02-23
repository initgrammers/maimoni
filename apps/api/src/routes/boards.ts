import { zValidator } from '@hono/zod-validator';
import { boardSettingsSchema } from '@maimoni/core';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserContext } from '../middleware';
import { type ApiDeps, createCoreDeps, createCoreUseCases } from './types';

export function createBoardsRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const { updateBoardSettings, deleteBoard } = createCoreUseCases(coreDeps);
  const { boardAccessService } = coreDeps.services;

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

      const body = c.req.valid('json');

      const result = await updateBoardSettings({
        actorId: userId,
        boardId: boardIdResult.data,
        settings: body,
      });

      if (result.status === 'updated') {
        return c.json({ board: result.board });
      }

      if (result.status === 'board-not-found') {
        return c.json({ error: 'Tablero no encontrado' }, 404);
      }

      if (result.status === 'forbidden') {
        const access = await boardAccessService.getUserBoardRole({
          userId,
          boardId: boardIdResult.data,
        });
        if (!access) {
          return c.json({ error: 'Tablero no encontrado' }, 404);
        }
        return c.json(
          { error: 'No tienes permisos para actualizar este tablero' },
          403,
        );
      }

      return c.json({ error: 'boardId inválido' }, 400);
    },
  );

  router.delete('/boards/:boardId', async (c) => {
    const userId = c.get('userId');
    const boardId = c.req.param('boardId');
    const boardIdResult = z.string().uuid().safeParse(boardId);
    if (!boardIdResult.success) {
      return c.json({ error: 'boardId inválido' }, 400);
    }

    const result = await deleteBoard({
      actorId: userId,
      boardId: boardIdResult.data,
    });

    if (result.status === 'deleted') {
      return c.json({ success: true, id: result.id });
    }

    if (result.status === 'last-board') {
      return c.json({ error: 'No puedes eliminar tu único tablero' }, 400);
    }

    if (result.status === 'board-not-found') {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }

    if (result.status === 'forbidden') {
      const access = await boardAccessService.getUserBoardRole({
        userId,
        boardId: boardIdResult.data,
      });
      if (!access) {
        return c.json({ error: 'Tablero no encontrado' }, 404);
      }
      return c.json(
        { error: 'No tienes permisos para eliminar este tablero' },
        403,
      );
    }

    return c.json({ error: 'boardId inválido' }, 400);
  });

  return router;
}
