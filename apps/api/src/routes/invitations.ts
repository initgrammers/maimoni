import { zValidator } from '@hono/zod-validator';
import { boardMembers, boards, invitations, users } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserContext } from '../middleware';
import { getUserBoardRole } from '../shared/board-access';
import {
  buildInvitationToken,
  ensureInvitationsSchemaIsReady,
  parseInvitationToken,
} from '../shared/invitations';
import {
  createInvitationSchema,
  invitationActionSchema,
} from '../shared/schemas';
import type { ApiDeps } from './types';

export function createInvitationsRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();

  router.post(
    '/boards/:boardId/invitations',
    zValidator('json', createInvitationSchema),
    async (c) => {
      const invitationSchemaError = await ensureInvitationsSchemaIsReady(db);
      if (invitationSchemaError) {
        return c.json({ error: invitationSchemaError }, 503);
      }

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
      if (access.role === 'viewer') {
        return c.json(
          { error: 'No tienes permisos para invitar en este tablero' },
          403,
        );
      }

      const body = c.req.valid('json');
      const { token, tokenHash } = buildInvitationToken();
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + (body.ttlHours ?? 24 * 7) * 60 * 60 * 1000,
      );

      const [invitation] = await db
        .insert(invitations)
        .values({
          boardId: boardIdResult.data,
          invitedByUserId: userId,
          invitedPhoneNumber: body.phoneNumber,
          inviteTokenHash: tokenHash,
          targetRole: body.targetRole,
          status: 'pending',
          expiresAt,
          isActive: true,
        })
        .returning();

      return c.json({
        invitation,
        inviteToken: token,
      });
    },
  );

  router.get('/boards/:boardId/invitations', async (c) => {
    const invitationSchemaError = await ensureInvitationsSchemaIsReady(db);
    if (invitationSchemaError) {
      return c.json({ error: invitationSchemaError }, 503);
    }

    const userId = c.get('userId');
    const boardId = c.req.param('boardId');
    const status = c.req.query('status');
    const boardIdResult = z.string().uuid().safeParse(boardId);
    if (!boardIdResult.success) {
      return c.json({ error: 'boardId inválido' }, 400);
    }

    const access = await getUserBoardRole(db, userId, boardIdResult.data);
    if (!access) {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }

    const baseWhere = and(
      eq(invitations.boardId, boardIdResult.data),
      eq(invitations.isActive, true),
    );

    const rows = await db
      .select({
        invitation: invitations,
        inviterName: users.name,
        inviterPhone: users.phoneNumber,
      })
      .from(invitations)
      .leftJoin(users, eq(invitations.invitedByUserId, users.id))
      .where(
        status ? and(baseWhere, eq(invitations.status, status)) : baseWhere,
      );

    return c.json(
      rows.map(({ invitation, inviterName, inviterPhone }) => ({
        ...invitation,
        inviterName,
        inviterPhone,
      })),
    );
  });

  router.post('/invitations/:invitationId/revoke', async (c) => {
    const invitationSchemaError = await ensureInvitationsSchemaIsReady(db);
    if (invitationSchemaError) {
      return c.json({ error: invitationSchemaError }, 503);
    }

    const userId = c.get('userId');
    const invitationId = c.req.param('invitationId');
    const invitationIdResult = z.string().uuid().safeParse(invitationId);
    if (!invitationIdResult.success) {
      return c.json({ error: 'invitationId inválido' }, 400);
    }

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationIdResult.data),
          eq(invitations.isActive, true),
        ),
      )
      .limit(1);

    if (!invitation) {
      return c.json({ error: 'Invitación no encontrada' }, 404);
    }

    const access = await getUserBoardRole(db, userId, invitation.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a esta invitación' }, 403);
    }
    if (access.role === 'viewer') {
      return c.json(
        { error: 'No tienes permisos para revocar invitaciones' },
        403,
      );
    }

    if (invitation.status !== 'pending') {
      return c.json(
        { error: 'Solo se pueden revocar invitaciones pendientes' },
        400,
      );
    }

    const [updated] = await db
      .update(invitations)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
        updatedAt: new Date(),
        isActive: false,
      })
      .where(eq(invitations.id, invitation.id))
      .returning();

    return c.json({ invitation: updated });
  });

  router.get('/invitations/resolve', async (c) => {
    const invitationSchemaError = await ensureInvitationsSchemaIsReady(db);
    if (invitationSchemaError) {
      return c.json({ error: invitationSchemaError }, 503);
    }

    const token = c.req.query('token');
    if (!token) {
      return c.json({ error: 'token es requerido' }, 400);
    }

    const tokenHash = parseInvitationToken(token);
    const [resolved] = await db
      .select({
        invitation: invitations,
        boardName: boards.name,
        inviterName: users.name,
      })
      .from(invitations)
      .innerJoin(boards, eq(invitations.boardId, boards.id))
      .leftJoin(users, eq(invitations.invitedByUserId, users.id))
      .where(
        and(
          eq(invitations.inviteTokenHash, tokenHash),
          eq(invitations.isActive, true),
        ),
      )
      .limit(1);

    if (!resolved) {
      return c.json({ error: 'Invitación no encontrada' }, 404);
    }

    let status = resolved.invitation.status;
    const now = new Date();
    if (
      status === 'pending' &&
      resolved.invitation.expiresAt &&
      resolved.invitation.expiresAt <= now
    ) {
      const [expiredInvitation] = await db
        .update(invitations)
        .set({
          status: 'expired',
          isActive: false,
          updatedAt: now,
        })
        .where(eq(invitations.id, resolved.invitation.id))
        .returning();
      status = expiredInvitation?.status ?? 'expired';
    }

    return c.json({
      invitationId: resolved.invitation.id,
      boardId: resolved.invitation.boardId,
      boardName: resolved.boardName,
      targetRole: resolved.invitation.targetRole,
      status,
      expiresAt: resolved.invitation.expiresAt,
      inviterName: resolved.inviterName,
    });
  });

  router.post(
    '/invitations/accept',
    zValidator('json', invitationActionSchema),
    async (c) => {
      const invitationSchemaError = await ensureInvitationsSchemaIsReady(db);
      if (invitationSchemaError) {
        return c.json({ error: invitationSchemaError }, 503);
      }

      const userId = c.get('userId');
      const body = c.req.valid('json');
      const tokenHash = parseInvitationToken(body.token);

      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.inviteTokenHash, tokenHash),
            eq(invitations.isActive, true),
          ),
        )
        .limit(1);

      if (!invitation) {
        return c.json({ error: 'Invitación no encontrada' }, 404);
      }

      if (invitation.status !== 'pending') {
        return c.json({ error: 'Esta invitación ya no está disponible' }, 400);
      }

      if (invitation.expiresAt && invitation.expiresAt <= new Date()) {
        await db
          .update(invitations)
          .set({
            status: 'expired',
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(invitations.id, invitation.id));
        return c.json({ error: 'Esta invitación expiró' }, 400);
      }

      const [board] = await db
        .select()
        .from(boards)
        .where(
          and(eq(boards.id, invitation.boardId), eq(boards.isActive, true)),
        )
        .limit(1);
      if (!board) {
        return c.json({ error: 'Tablero no encontrado' }, 404);
      }

      const [existingMembership] = await db
        .select()
        .from(boardMembers)
        .where(
          and(
            eq(boardMembers.boardId, invitation.boardId),
            eq(boardMembers.userId, userId),
          ),
        )
        .limit(1);

      if (existingMembership) {
        await db
          .update(boardMembers)
          .set({
            isActive: true,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(boardMembers.boardId, invitation.boardId),
              eq(boardMembers.userId, userId),
            ),
          );
      } else {
        await db.insert(boardMembers).values({
          boardId: invitation.boardId,
          userId,
          isActive: true,
          joinedAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const [updatedInvitation] = await db
        .update(invitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedByUserId: userId,
          inviteeUserId: userId,
          invitedAnonymousId: null,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id))
        .returning();

      return c.json({
        invitation: updatedInvitation,
        boardId: invitation.boardId,
        alreadyMember: Boolean(existingMembership),
      });
    },
  );

  router.post(
    '/invitations/decline',
    zValidator('json', invitationActionSchema),
    async (c) => {
      const invitationSchemaError = await ensureInvitationsSchemaIsReady(db);
      if (invitationSchemaError) {
        return c.json({ error: invitationSchemaError }, 503);
      }

      const body = c.req.valid('json');
      const tokenHash = parseInvitationToken(body.token);

      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.inviteTokenHash, tokenHash),
            eq(invitations.isActive, true),
          ),
        )
        .limit(1);

      if (!invitation) {
        return c.json({ error: 'Invitación no encontrada' }, 404);
      }

      if (invitation.status !== 'pending') {
        return c.json({ error: 'Esta invitación ya fue procesada' }, 400);
      }

      const [updatedInvitation] = await db
        .update(invitations)
        .set({
          status: 'declined',
          declinedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id))
        .returning();

      return c.json({ invitation: updatedInvitation });
    },
  );

  return router;
}
