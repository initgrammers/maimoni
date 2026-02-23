import { zValidator } from '@hono/zod-validator';
import { createInvitationSchema, invitationActionSchema } from '@maimoni/core';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserContext } from '../middleware';
import { type ApiDeps, createCoreDeps, createCoreUseCases } from './types';

export function createInvitationsRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const {
    createInvitation,
    listInvitations,
    revokeInvitation,
    resolveInvitation,
    acceptInvitation,
    declineInvitation,
  } = createCoreUseCases(coreDeps);
  const { boardAccessService } = coreDeps.services;
  const { invitationRepository } = coreDeps.repositories;

  router.post(
    '/boards/:boardId/invitations',
    zValidator('json', createInvitationSchema),
    async (c) => {
      const userId = c.get('userId');
      const boardId = c.req.param('boardId');
      const boardIdResult = z.string().uuid().safeParse(boardId);
      if (!boardIdResult.success) {
        return c.json({ error: 'boardId inválido' }, 400);
      }

      const body = c.req.valid('json');

      const result = await createInvitation({
        actorId: userId,
        boardId: boardIdResult.data,
        targetRole: body.targetRole,
        phoneNumber: body.phoneNumber,
        ttlHours: body.ttlHours,
      });

      if (result.status === 'created') {
        return c.json({
          invitation: result.invitation,
          inviteToken: result.inviteToken,
        });
      }

      if (result.status === 'schema-not-ready') {
        return c.json({ error: result.error }, 503);
      }

      if (result.status === 'board-not-found') {
        return c.json({ error: 'Tablero no encontrado' }, 404);
      }

      if (result.status === 'forbidden') {
        return c.json(
          { error: 'No tienes permisos para invitar en este tablero' },
          403,
        );
      }

      return c.json({ error: 'boardId inválido' }, 400);
    },
  );

  router.get('/boards/:boardId/invitations', async (c) => {
    const userId = c.get('userId');
    const boardId = c.req.param('boardId');
    const status = c.req.query('status');
    const boardIdResult = z.string().uuid().safeParse(boardId);
    if (!boardIdResult.success) {
      return c.json({ error: 'boardId inválido' }, 400);
    }

    const result = await listInvitations({
      actorId: userId,
      boardId: boardIdResult.data,
      status,
    });

    if (result.status === 'listed') {
      return c.json(result.invitations);
    }

    if (result.status === 'schema-not-ready') {
      return c.json({ error: result.error }, 503);
    }

    if (result.status === 'board-not-found') {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }

    return c.json({ error: 'boardId inválido' }, 400);
  });

  router.post('/invitations/:invitationId/revoke', async (c) => {
    const userId = c.get('userId');
    const invitationId = c.req.param('invitationId');
    const invitationIdResult = z.string().uuid().safeParse(invitationId);
    if (!invitationIdResult.success) {
      return c.json({ error: 'invitationId inválido' }, 400);
    }

    const result = await revokeInvitation({
      actorId: userId,
      invitationId: invitationIdResult.data,
    });

    if (result.status === 'revoked') {
      return c.json({ invitation: result.invitation });
    }

    if (result.status === 'schema-not-ready') {
      return c.json({ error: result.error }, 503);
    }

    if (result.status === 'invitation-not-found') {
      return c.json({ error: 'Invitación no encontrada' }, 404);
    }

    if (result.status === 'not-pending') {
      return c.json(
        { error: 'Solo se pueden revocar invitaciones pendientes' },
        400,
      );
    }

    if (result.status === 'forbidden') {
      const invitation = await invitationRepository.findById(
        invitationIdResult.data,
      );
      if (!invitation) {
        return c.json({ error: 'Invitación no encontrada' }, 404);
      }

      const access = await boardAccessService.getUserBoardRole({
        userId,
        boardId: invitation.boardId,
      });
      if (!access) {
        return c.json({ error: 'No tienes acceso a esta invitación' }, 403);
      }
      return c.json(
        { error: 'No tienes permisos para revocar invitaciones' },
        403,
      );
    }

    return c.json({ error: 'invitationId inválido' }, 400);
  });

  router.get('/invitations/resolve', async (c) => {
    const token = c.req.query('token');
    if (!token) {
      return c.json({ error: 'token es requerido' }, 400);
    }

    const result = await resolveInvitation({ token });

    if (result.status === 'resolved') {
      const resolution = result.resolution;
      return c.json({
        invitationId: resolution.invitationId,
        boardId: resolution.boardId,
        boardName: resolution.boardName,
        targetRole: resolution.targetRole,
        status: resolution.status,
        expiresAt: resolution.expiresAt,
        inviterName: resolution.inviterName,
      });
    }

    if (result.status === 'schema-not-ready') {
      return c.json({ error: result.error }, 503);
    }

    return c.json({ error: 'Invitación no encontrada' }, 404);
  });

  router.post(
    '/invitations/accept',
    zValidator('json', invitationActionSchema),
    async (c) => {
      const userId = c.get('userId');
      const body = c.req.valid('json');

      const result = await acceptInvitation({
        actorId: userId,
        token: body.token,
      });

      if (result.status === 'accepted') {
        return c.json({
          invitation: result.invitation,
          boardId: result.boardId,
          alreadyMember: result.alreadyMember,
        });
      }

      if (result.status === 'schema-not-ready') {
        return c.json({ error: result.error }, 503);
      }

      if (result.status === 'invitation-not-found') {
        return c.json({ error: 'Invitación no encontrada' }, 404);
      }

      if (result.status === 'invitation-unavailable') {
        return c.json({ error: 'Esta invitación ya no está disponible' }, 400);
      }

      if (result.status === 'invitation-expired') {
        return c.json({ error: 'Esta invitación expiró' }, 400);
      }

      if (result.status === 'board-not-found') {
        return c.json({ error: 'Tablero no encontrado' }, 404);
      }

      return c.json({ error: 'Invitación no encontrada' }, 404);
    },
  );

  router.post(
    '/invitations/decline',
    zValidator('json', invitationActionSchema),
    async (c) => {
      const body = c.req.valid('json');

      const result = await declineInvitation({ token: body.token });

      if (result.status === 'declined') {
        return c.json({ invitation: result.invitation });
      }

      if (result.status === 'schema-not-ready') {
        return c.json({ error: result.error }, 503);
      }

      if (result.status === 'invitation-not-found') {
        return c.json({ error: 'Invitación no encontrada' }, 404);
      }

      if (result.status === 'invitation-unavailable') {
        return c.json({ error: 'Esta invitación ya fue procesada' }, 400);
      }

      return c.json({ error: 'Invitación no encontrada' }, 404);
    },
  );

  return router;
}
