import {
  type BoardAccessService,
  createAcceptInvitation,
  createAuthClaimRepository,
  createBoardRepository,
  createCategoryRepository,
  createClaimAnonymousData,
  createInvitationAvailabilityService as createCoreInvitationAvailabilityService,
  createCreateExpense,
  createCreateIncome,
  createCreateInvitation,
  createDashboardRepository,
  createDeclineInvitation,
  createDeleteBoard,
  createDeleteExpense,
  createDeleteIncome,
  createExpenseRepository,
  createGetDashboard,
  createGetExpense,
  createGetIncome,
  createIncomeRepository,
  createInvitationRepository,
  createListBoards,
  createListCategories,
  createListExpenses,
  createListIncomes,
  createListInvitations,
  createResolveInvitation,
  createRevokeInvitation,
  createScanAiClient,
  createScanReceipt,
  createUpdateBoardSettings,
  createUpdateExpense,
  createUpdateIncome,
  type InvitationAvailabilityService,
  type ScanAiClient,
} from '@maimoni/core';
import {
  getOrSelectAccessibleBoard,
  getUserBoardRole,
  listUserBoards,
} from '../shared/board-access';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

export type ApiDeps = {
  db: DbClient;
};

export type CoreRepositories = {
  authClaimRepository: ReturnType<typeof createAuthClaimRepository>;
  boardRepository: ReturnType<typeof createBoardRepository>;
  categoryRepository: ReturnType<typeof createCategoryRepository>;
  dashboardRepository: ReturnType<typeof createDashboardRepository>;
  expenseRepository: ReturnType<typeof createExpenseRepository>;
  incomeRepository: ReturnType<typeof createIncomeRepository>;
  invitationRepository: ReturnType<typeof createInvitationRepository>;
};

export type CoreServices = {
  boardAccessService: BoardAccessService;
  invitationAvailabilityService: InvitationAvailabilityService;
  scanAiClient: ScanAiClient;
};

export type CoreDeps = {
  repositories: CoreRepositories;
  services: CoreServices;
};

export type CoreUseCases = ReturnType<typeof createCoreUseCases>;

export function createBoardAccessService(db: DbClient): BoardAccessService {
  const boardAccessService: BoardAccessService = {
    getUserBoardRole: ({
      userId,
      boardId,
    }: {
      userId: string;
      boardId: string;
    }) => getUserBoardRole(db, userId, boardId),
    getOrSelectAccessibleBoard: ({
      userId,
      requestedBoardId,
    }: {
      userId: string;
      requestedBoardId?: string;
    }) => getOrSelectAccessibleBoard(db, userId, requestedBoardId),
    listUserBoards: ({ userId }: { userId: string }) =>
      listUserBoards(db, userId),
  };

  return boardAccessService;
}

export function createCoreRepositories(db: DbClient): CoreRepositories {
  return {
    authClaimRepository: createAuthClaimRepository(db),
    boardRepository: createBoardRepository(db),
    categoryRepository: createCategoryRepository(db),
    dashboardRepository: createDashboardRepository(db),
    expenseRepository: createExpenseRepository(db),
    incomeRepository: createIncomeRepository(db),
    invitationRepository: createInvitationRepository(db),
  };
}

export function createCoreServices(db: DbClient): CoreServices {
  return {
    boardAccessService: createBoardAccessService(db),
    invitationAvailabilityService: createCoreInvitationAvailabilityService(db),
    scanAiClient: createScanAiClient(),
  };
}

export function createCoreDeps({ db }: ApiDeps): CoreDeps {
  return {
    repositories: createCoreRepositories(db),
    services: createCoreServices(db),
  };
}

export function createCoreUseCases(deps: CoreDeps) {
  const { repositories, services } = deps;

  return {
    listBoards: createListBoards({
      boardRepository: repositories.boardRepository,
    }),
    updateBoardSettings: createUpdateBoardSettings({
      boardRepository: repositories.boardRepository,
    }),
    deleteBoard: createDeleteBoard({
      boardRepository: repositories.boardRepository,
    }),
    createInvitation: createCreateInvitation({
      boardAccessService: services.boardAccessService,
      invitationAvailabilityService: services.invitationAvailabilityService,
      invitationRepository: repositories.invitationRepository,
    }),
    listInvitations: createListInvitations({
      boardAccessService: services.boardAccessService,
      invitationAvailabilityService: services.invitationAvailabilityService,
      invitationRepository: repositories.invitationRepository,
    }),
    revokeInvitation: createRevokeInvitation({
      boardAccessService: services.boardAccessService,
      invitationAvailabilityService: services.invitationAvailabilityService,
      invitationRepository: repositories.invitationRepository,
    }),
    resolveInvitation: createResolveInvitation({
      invitationAvailabilityService: services.invitationAvailabilityService,
      invitationRepository: repositories.invitationRepository,
    }),
    acceptInvitation: createAcceptInvitation({
      invitationAvailabilityService: services.invitationAvailabilityService,
      invitationRepository: repositories.invitationRepository,
    }),
    declineInvitation: createDeclineInvitation({
      invitationAvailabilityService: services.invitationAvailabilityService,
      invitationRepository: repositories.invitationRepository,
    }),
    listCategories: createListCategories({
      categoryRepository: repositories.categoryRepository,
    }),
    listExpenses: createListExpenses({
      boardAccessService: services.boardAccessService,
      expenseRepository: repositories.expenseRepository,
    }),
    getExpense: createGetExpense({
      boardAccessService: services.boardAccessService,
      expenseRepository: repositories.expenseRepository,
    }),
    createExpense: createCreateExpense({
      boardAccessService: services.boardAccessService,
      expenseRepository: repositories.expenseRepository,
    }),
    updateExpense: createUpdateExpense({
      boardAccessService: services.boardAccessService,
      expenseRepository: repositories.expenseRepository,
    }),
    deleteExpense: createDeleteExpense({
      boardAccessService: services.boardAccessService,
      expenseRepository: repositories.expenseRepository,
    }),
    listIncomes: createListIncomes({
      boardAccessService: services.boardAccessService,
      incomeRepository: repositories.incomeRepository,
    }),
    getIncome: createGetIncome({
      boardAccessService: services.boardAccessService,
      incomeRepository: repositories.incomeRepository,
    }),
    createIncome: createCreateIncome({
      boardAccessService: services.boardAccessService,
      incomeRepository: repositories.incomeRepository,
    }),
    updateIncome: createUpdateIncome({
      boardAccessService: services.boardAccessService,
      incomeRepository: repositories.incomeRepository,
    }),
    deleteIncome: createDeleteIncome({
      boardAccessService: services.boardAccessService,
      incomeRepository: repositories.incomeRepository,
    }),
    getDashboard: createGetDashboard({
      boardAccessService: services.boardAccessService,
      dashboardRepository: repositories.dashboardRepository,
    }),
    scanReceipt: createScanReceipt({
      scanAiClient: services.scanAiClient,
    }),
    claimAnonymousData: createClaimAnonymousData({
      authClaimRepository: repositories.authClaimRepository,
    }),
  };
}
