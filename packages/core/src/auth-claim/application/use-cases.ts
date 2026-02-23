import { isUuid } from '../../shared/domain/ids';
import type { AuthClaimRepository } from './ports';

export type ClaimAnonymousDataInput = {
  actorId: string;
  anonymousId: string;
};

export type ClaimAnonymousDataResult =
  | { status: 'claimed' }
  | { status: 'invalid-user-id' | 'invalid-anonymous-id' }
  | { status: 'failed'; error: string };

export function createClaimAnonymousData(deps: {
  authClaimRepository: AuthClaimRepository;
}) {
  const { authClaimRepository } = deps;

  return async (
    input: ClaimAnonymousDataInput,
  ): Promise<ClaimAnonymousDataResult> => {
    if (!isUuid(input.actorId)) {
      return { status: 'invalid-user-id' };
    }

    if (!isUuid(input.anonymousId)) {
      return { status: 'invalid-anonymous-id' };
    }

    try {
      await authClaimRepository.claimAnonymousData({
        realUserId: input.actorId,
        anonymousId: input.anonymousId,
      });

      return { status: 'claimed' };
    } catch (error) {
      return {
        status: 'failed',
        error:
          error instanceof Error
            ? error.message
            : 'Failed to claim anonymous data',
      };
    }
  };
}
