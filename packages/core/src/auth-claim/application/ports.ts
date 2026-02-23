export type AuthClaimRepository = {
  claimAnonymousData(input: {
    realUserId: string;
    anonymousId: string;
  }): Promise<void>;
};
