export type { InvitationRole, InvitationStatus } from '../domain/invitation';

import type { InvitationRole, InvitationStatus } from '../domain/invitation';

export type InvitationRecord = {
  id: string;
  boardId: string;
  invitedByUserId: string | null;
  invitedPhoneNumber: string | null;
  invitedAnonymousId: string | null;
  inviteeUserId: string | null;
  acceptedByUserId: string | null;
  inviteTokenHash: string | null;
  targetRole: InvitationRole;
  status: InvitationStatus;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InvitationListItem = InvitationRecord & {
  inviterName: string | null;
  inviterPhone: string | null;
};

export type InvitationResolution = {
  invitationId: string;
  boardId: string;
  boardName: string;
  targetRole: InvitationRole;
  status: InvitationStatus;
  expiresAt: Date | null;
  inviterName: string | null;
};

export type BoardMembershipRecord = {
  boardId: string;
  userId: string;
  isActive: boolean;
};

export type InvitationRepository = {
  create(input: {
    boardId: string;
    invitedByUserId: string;
    invitedPhoneNumber?: string;
    targetRole: InvitationRole;
    expiresAt: Date;
    inviteTokenHash: string;
  }): Promise<InvitationRecord>;
  findById(id: string): Promise<InvitationRecord | null>;
  findByTokenHash(tokenHash: string): Promise<InvitationRecord | null>;
  resolveByTokenHash(tokenHash: string): Promise<InvitationResolution | null>;
  listByBoard(input: {
    boardId: string;
    status?: string;
  }): Promise<InvitationListItem[]>;
  findActiveBoardById(id: string): Promise<{ id: string } | null>;
  findMembership(input: {
    boardId: string;
    userId: string;
  }): Promise<BoardMembershipRecord | null>;
  activateMembership(input: {
    boardId: string;
    userId: string;
    updatedAt: Date;
  }): Promise<void>;
  createMembership(input: {
    boardId: string;
    userId: string;
    joinedAt: Date;
    updatedAt: Date;
  }): Promise<void>;
  updateStatus(
    id: string,
    input: {
      status: InvitationStatus;
      updatedAt: Date;
      isActive?: boolean;
      acceptedAt?: Date | null;
      declinedAt?: Date | null;
      revokedAt?: Date | null;
      acceptedByUserId?: string | null;
      inviteeUserId?: string | null;
      invitedAnonymousId?: string | null;
    },
  ): Promise<InvitationRecord | null>;
};
