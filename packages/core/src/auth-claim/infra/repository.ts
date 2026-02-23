import { claimAnonymousData } from '@maimoni/db';
import type { AuthClaimRepository } from '../application/ports';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

export function createAuthClaimRepository(db: DbClient): AuthClaimRepository {
  return {
    async claimAnonymousData(input) {
      await claimAnonymousData(db, {
        realUserId: input.realUserId,
        anonymousId: input.anonymousId,
      });
    },
  };
}
