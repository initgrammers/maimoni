import type { BoardAccessService } from '../../shared/application/board-access';
import type { InvitationAvailabilityService } from '../../shared/application/invitation-availability';
import { isUuid } from '../../shared/domain/ids';
import {
  buildInvitationToken,
  isInvitationExpired,
  parseInvitationToken,
} from '../domain/invitation';
import type {
  InvitationListItem,
  InvitationRecord,
  InvitationRepository,
  InvitationResolution,
} from './ports';

export type CreateInvitationInput = {
  actorId: string;
  boardId: string;
  targetRole: 'editor' | 'viewer';
  phoneNumber?: string;
  ttlHours?: number;
};

export type CreateInvitationResult =
  | {
      status: 'created';
      invitation: InvitationRecord;
      inviteToken: string;
    }
  | { status: 'schema-not-ready'; error: string }
  | { status: 'invalid-board-id' | 'board-not-found' | 'forbidden' };

export type ListInvitationsInput = {
  actorId: string;
  boardId: string;
  status?: string;
};

export type ListInvitationsResult =
  | { status: 'listed'; invitations: InvitationListItem[] }
  | { status: 'schema-not-ready'; error: string }
  | { status: 'invalid-board-id' | 'board-not-found' };

export type RevokeInvitationInput = {
  actorId: string;
  invitationId: string;
};

export type RevokeInvitationResult =
  | { status: 'revoked'; invitation: InvitationRecord }
  | { status: 'schema-not-ready'; error: string }
  | {
      status:
        | 'invalid-invitation-id'
        | 'invitation-not-found'
        | 'forbidden'
        | 'not-pending';
    };

export type ResolveInvitationInput = {
  token: string;
};

export type ResolveInvitationResult =
  | { status: 'resolved'; resolution: InvitationResolution }
  | { status: 'schema-not-ready'; error: string }
  | { status: 'invitation-not-found' };

export type AcceptInvitationInput = {
  actorId: string;
  token: string;
};

export type AcceptInvitationResult =
  | {
      status: 'accepted';
      invitation: InvitationRecord;
      boardId: string;
      alreadyMember: boolean;
    }
  | { status: 'schema-not-ready'; error: string }
  | {
      status:
        | 'invitation-not-found'
        | 'invitation-unavailable'
        | 'invitation-expired'
        | 'board-not-found';
    };

export type DeclineInvitationInput = {
  token: string;
};

export type DeclineInvitationResult =
  | { status: 'declined'; invitation: InvitationRecord }
  | { status: 'schema-not-ready'; error: string }
  | { status: 'invitation-not-found' | 'invitation-unavailable' };

export function createCreateInvitation(deps: {
  boardAccessService: BoardAccessService;
  invitationAvailabilityService: InvitationAvailabilityService;
  invitationRepository: InvitationRepository;
}) {
  const {
    boardAccessService,
    invitationAvailabilityService,
    invitationRepository,
  } = deps;

  return async (
    input: CreateInvitationInput,
  ): Promise<CreateInvitationResult> => {
    const schemaError =
      await invitationAvailabilityService.ensureInvitationsSchemaIsReady();
    if (schemaError) {
      return { status: 'schema-not-ready', error: schemaError };
    }

    if (!isUuid(input.boardId)) {
      return { status: 'invalid-board-id' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: input.boardId,
    });

    if (!access) {
      return { status: 'board-not-found' };
    }

    if (access.role === 'viewer') {
      return { status: 'forbidden' };
    }

    const { token, tokenHash } = buildInvitationToken();
    const now = new Date();
    const ttlHours = input.ttlHours ?? 24 * 7;
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const invitation = await invitationRepository.create({
      boardId: input.boardId,
      invitedByUserId: input.actorId,
      invitedPhoneNumber: input.phoneNumber,
      targetRole: input.targetRole,
      expiresAt,
      inviteTokenHash: tokenHash,
    });

    return { status: 'created', invitation, inviteToken: token };
  };
}

export function createListInvitations(deps: {
  boardAccessService: BoardAccessService;
  invitationAvailabilityService: InvitationAvailabilityService;
  invitationRepository: InvitationRepository;
}) {
  const {
    boardAccessService,
    invitationAvailabilityService,
    invitationRepository,
  } = deps;

  return async (
    input: ListInvitationsInput,
  ): Promise<ListInvitationsResult> => {
    const schemaError =
      await invitationAvailabilityService.ensureInvitationsSchemaIsReady();
    if (schemaError) {
      return { status: 'schema-not-ready', error: schemaError };
    }

    if (!isUuid(input.boardId)) {
      return { status: 'invalid-board-id' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: input.boardId,
    });

    if (!access) {
      return { status: 'board-not-found' };
    }

    const invitations = await invitationRepository.listByBoard({
      boardId: input.boardId,
      status: input.status,
    });

    return { status: 'listed', invitations };
  };
}

export function createRevokeInvitation(deps: {
  boardAccessService: BoardAccessService;
  invitationAvailabilityService: InvitationAvailabilityService;
  invitationRepository: InvitationRepository;
}) {
  const {
    boardAccessService,
    invitationAvailabilityService,
    invitationRepository,
  } = deps;

  return async (
    input: RevokeInvitationInput,
  ): Promise<RevokeInvitationResult> => {
    const schemaError =
      await invitationAvailabilityService.ensureInvitationsSchemaIsReady();
    if (schemaError) {
      return { status: 'schema-not-ready', error: schemaError };
    }

    if (!isUuid(input.invitationId)) {
      return { status: 'invalid-invitation-id' };
    }

    const invitation = await invitationRepository.findById(input.invitationId);

    if (!invitation) {
      return { status: 'invitation-not-found' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: invitation.boardId,
    });

    if (!access || access.role === 'viewer') {
      return { status: 'forbidden' };
    }

    if (invitation.status !== 'pending') {
      return { status: 'not-pending' };
    }

    const now = new Date();
    const updated = await invitationRepository.updateStatus(invitation.id, {
      status: 'revoked',
      revokedAt: now,
      updatedAt: now,
      isActive: false,
    });

    if (!updated) {
      return { status: 'invitation-not-found' };
    }

    return { status: 'revoked', invitation: updated };
  };
}

export function createResolveInvitation(deps: {
  invitationAvailabilityService: InvitationAvailabilityService;
  invitationRepository: InvitationRepository;
}) {
  const { invitationAvailabilityService, invitationRepository } = deps;

  return async (
    input: ResolveInvitationInput,
  ): Promise<ResolveInvitationResult> => {
    const schemaError =
      await invitationAvailabilityService.ensureInvitationsSchemaIsReady();
    if (schemaError) {
      return { status: 'schema-not-ready', error: schemaError };
    }

    const tokenHash = parseInvitationToken(input.token);
    const resolved = await invitationRepository.resolveByTokenHash(tokenHash);

    if (!resolved) {
      return { status: 'invitation-not-found' };
    }

    let status = resolved.status;
    if (
      isInvitationExpired({
        status: resolved.status,
        expiresAt: resolved.expiresAt,
      })
    ) {
      const now = new Date();
      await invitationRepository.updateStatus(resolved.invitationId, {
        status: 'expired',
        updatedAt: now,
        isActive: false,
      });
      status = 'expired';
    }

    return { status: 'resolved', resolution: { ...resolved, status } };
  };
}

export function createAcceptInvitation(deps: {
  invitationAvailabilityService: InvitationAvailabilityService;
  invitationRepository: InvitationRepository;
}) {
  const { invitationAvailabilityService, invitationRepository } = deps;

  return async (
    input: AcceptInvitationInput,
  ): Promise<AcceptInvitationResult> => {
    const schemaError =
      await invitationAvailabilityService.ensureInvitationsSchemaIsReady();
    if (schemaError) {
      return { status: 'schema-not-ready', error: schemaError };
    }

    const tokenHash = parseInvitationToken(input.token);
    const invitation = await invitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      return { status: 'invitation-not-found' };
    }

    if (invitation.status !== 'pending') {
      return { status: 'invitation-unavailable' };
    }

    if (
      isInvitationExpired({
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      })
    ) {
      const now = new Date();
      await invitationRepository.updateStatus(invitation.id, {
        status: 'expired',
        updatedAt: now,
        isActive: false,
      });
      return { status: 'invitation-expired' };
    }

    const board = await invitationRepository.findActiveBoardById(
      invitation.boardId,
    );
    if (!board) {
      return { status: 'board-not-found' };
    }

    const now = new Date();
    const membership = await invitationRepository.findMembership({
      boardId: invitation.boardId,
      userId: input.actorId,
    });

    let alreadyMember = false;
    if (membership) {
      alreadyMember = true;
      await invitationRepository.activateMembership({
        boardId: invitation.boardId,
        userId: input.actorId,
        updatedAt: now,
      });
    } else {
      await invitationRepository.createMembership({
        boardId: invitation.boardId,
        userId: input.actorId,
        joinedAt: now,
        updatedAt: now,
      });
    }

    const updated = await invitationRepository.updateStatus(invitation.id, {
      status: 'accepted',
      acceptedAt: now,
      acceptedByUserId: input.actorId,
      inviteeUserId: input.actorId,
      invitedAnonymousId: null,
      updatedAt: now,
      isActive: false,
    });

    if (!updated) {
      return { status: 'invitation-not-found' };
    }

    return {
      status: 'accepted',
      invitation: updated,
      boardId: invitation.boardId,
      alreadyMember,
    };
  };
}

export function createDeclineInvitation(deps: {
  invitationAvailabilityService: InvitationAvailabilityService;
  invitationRepository: InvitationRepository;
}) {
  const { invitationAvailabilityService, invitationRepository } = deps;

  return async (
    input: DeclineInvitationInput,
  ): Promise<DeclineInvitationResult> => {
    const schemaError =
      await invitationAvailabilityService.ensureInvitationsSchemaIsReady();
    if (schemaError) {
      return { status: 'schema-not-ready', error: schemaError };
    }

    const tokenHash = parseInvitationToken(input.token);
    const invitation = await invitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      return { status: 'invitation-not-found' };
    }

    if (invitation.status !== 'pending') {
      return { status: 'invitation-unavailable' };
    }

    const now = new Date();
    const updated = await invitationRepository.updateStatus(invitation.id, {
      status: 'declined',
      declinedAt: now,
      updatedAt: now,
      isActive: false,
    });

    if (!updated) {
      return { status: 'invitation-not-found' };
    }

    return { status: 'declined', invitation: updated };
  };
}
