export type AuthClaimRepository = {
  claimAnonymousData(input: {
    realUserId: string;
    anonymousId: string;
    expenses?: unknown[];
    incomes?: unknown[];
  }): Promise<void>;
};
