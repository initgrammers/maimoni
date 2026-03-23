export type AuthClaimRepository = {
  claimAnonymousData(input: {
    realUserId: string;
    anonymousId: string;
    expenses?: unknown[];
    incomes?: unknown[];
    boardId?: string;
    boardName?: string;
    spendingLimitAmount?: string | null;
  }): Promise<void>;
};
