import { boardMembers, boards, invitations, users } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import type {
  BoardMembershipRecord,
  InvitationListItem,
  InvitationRecord,
  InvitationRepository,
  InvitationResolution,
} from '../application/ports';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

const invitationColumns = {
  id: invitations.id,
  boardId: invitations.boardId,
  invitedByUserId: invitations.invitedByUserId,
  invitedPhoneNumber: invitations.invitedPhoneNumber,
  invitedAnonymousId: invitations.invitedAnonymousId,
  inviteeUserId: invitations.inviteeUserId,
  acceptedByUserId: invitations.acceptedByUserId,
  inviteTokenHash: invitations.inviteTokenHash,
  targetRole: invitations.targetRole,
  status: invitations.status,
  expiresAt: invitations.expiresAt,
  acceptedAt: invitations.acceptedAt,
  declinedAt: invitations.declinedAt,
  revokedAt: invitations.revokedAt,
  isActive: invitations.isActive,
  createdAt: invitations.createdAt,
  updatedAt: invitations.updatedAt,
};

export function createInvitationRepository(db: DbClient): InvitationRepository {
  return {
    async create(input): Promise<InvitationRecord> {
      const [invitation] = await db
        .insert(invitations)
        .values({
          boardId: input.boardId,
          invitedByUserId: input.invitedByUserId,
          invitedPhoneNumber: input.invitedPhoneNumber ?? null,
          inviteTokenHash: input.inviteTokenHash,
          targetRole: input.targetRole,
          status: 'pending',
          expiresAt: input.expiresAt,
          isActive: true,
        })
        .returning(invitationColumns);

      if (!invitation) {
        throw new Error('Invitation not created');
      }

      return invitation;
    },

    async findById(id: string): Promise<InvitationRecord | null> {
      const [invitation] = await db
        .select(invitationColumns)
        .from(invitations)
        .where(and(eq(invitations.id, id), eq(invitations.isActive, true)))
        .limit(1);

      return invitation ?? null;
    },

    async findByTokenHash(tokenHash: string): Promise<InvitationRecord | null> {
      const [invitation] = await db
        .select(invitationColumns)
        .from(invitations)
        .where(
          and(
            eq(invitations.inviteTokenHash, tokenHash),
            eq(invitations.isActive, true),
          ),
        )
        .limit(1);

      return invitation ?? null;
    },

    async resolveByTokenHash(
      tokenHash: string,
    ): Promise<InvitationResolution | null> {
      const [resolved] = await db
        .select({
          invitation: invitationColumns,
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
        return null;
      }

      return {
        invitationId: resolved.invitation.id,
        boardId: resolved.invitation.boardId,
        boardName: resolved.boardName,
        targetRole: resolved.invitation.targetRole,
        status: resolved.invitation.status,
        expiresAt: resolved.invitation.expiresAt,
        inviterName: resolved.inviterName,
      };
    },

    async listByBoard(input): Promise<InvitationListItem[]> {
      const baseWhere = and(
        eq(invitations.boardId, input.boardId),
        eq(invitations.isActive, true),
      );

      const rows = await db
        .select({
          invitation: invitationColumns,
          inviterName: users.name,
          inviterPhone: users.phoneNumber,
        })
        .from(invitations)
        .leftJoin(users, eq(invitations.invitedByUserId, users.id))
        .where(
          input.status
            ? and(baseWhere, eq(invitations.status, input.status))
            : baseWhere,
        );

      return rows.map(({ invitation, inviterName, inviterPhone }) => ({
        ...invitation,
        inviterName,
        inviterPhone,
      }));
    },

    async findActiveBoardById(id: string): Promise<{ id: string } | null> {
      const [board] = await db
        .select({ id: boards.id })
        .from(boards)
        .where(and(eq(boards.id, id), eq(boards.isActive, true)))
        .limit(1);

      return board ?? null;
    },

    async findMembership(input): Promise<BoardMembershipRecord | null> {
      const [membership] = await db
        .select({
          boardId: boardMembers.boardId,
          userId: boardMembers.userId,
          isActive: boardMembers.isActive,
        })
        .from(boardMembers)
        .where(
          and(
            eq(boardMembers.boardId, input.boardId),
            eq(boardMembers.userId, input.userId),
          ),
        )
        .limit(1);

      return membership ?? null;
    },

    async activateMembership(input): Promise<void> {
      await db
        .update(boardMembers)
        .set({
          isActive: true,
          updatedAt: input.updatedAt,
        })
        .where(
          and(
            eq(boardMembers.boardId, input.boardId),
            eq(boardMembers.userId, input.userId),
          ),
        );
    },

    async createMembership(input): Promise<void> {
      await db.insert(boardMembers).values({
        boardId: input.boardId,
        userId: input.userId,
        isActive: true,
        joinedAt: input.joinedAt,
        updatedAt: input.updatedAt,
      });
    },

    async updateStatus(id, input): Promise<InvitationRecord | null> {
      const updateFields: Record<string, unknown> = {
        status: input.status,
        updatedAt: input.updatedAt,
      };

      if (input.isActive !== undefined) {
        updateFields.isActive = input.isActive;
      }

      if (input.acceptedAt !== undefined) {
        updateFields.acceptedAt = input.acceptedAt;
      }

      if (input.declinedAt !== undefined) {
        updateFields.declinedAt = input.declinedAt;
      }

      if (input.revokedAt !== undefined) {
        updateFields.revokedAt = input.revokedAt;
      }

      if (input.acceptedByUserId !== undefined) {
        updateFields.acceptedByUserId = input.acceptedByUserId;
      }

      if (input.inviteeUserId !== undefined) {
        updateFields.inviteeUserId = input.inviteeUserId;
      }

      if (input.invitedAnonymousId !== undefined) {
        updateFields.invitedAnonymousId = input.invitedAnonymousId;
      }

      const [invitation] = await db
        .update(invitations)
        .set(updateFields)
        .where(eq(invitations.id, id))
        .returning(invitationColumns);

      return invitation ?? null;
    },
  };
}
