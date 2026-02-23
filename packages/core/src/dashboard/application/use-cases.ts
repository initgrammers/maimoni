import type {
  BoardAccessRole,
  BoardAccessService,
} from '../../shared/application/board-access';
import type {
  DashboardBoard,
  DashboardExpense,
  DashboardIncome,
  DashboardRepository,
} from './ports';

export type GetDashboardInput = {
  actorId: string;
  boardId?: string;
};

export type DashboardBoardWithRole = DashboardBoard & {
  role: BoardAccessRole;
};

export type GetDashboardResult =
  | {
      status: 'loaded';
      board: DashboardBoard;
      role: BoardAccessRole;
      boards: DashboardBoardWithRole[];
      incomes: DashboardIncome[];
      expenses: DashboardExpense[];
    }
  | { status: 'forbidden' };

export function createGetDashboard(deps: {
  boardAccessService: BoardAccessService;
  dashboardRepository: DashboardRepository;
}) {
  const { boardAccessService, dashboardRepository } = deps;

  return async (input: GetDashboardInput): Promise<GetDashboardResult> => {
    const access = await boardAccessService.getOrSelectAccessibleBoard({
      userId: input.actorId,
      requestedBoardId: input.boardId,
    });

    if (!access) {
      return { status: 'forbidden' };
    }

    const [incomes, expenses, boards] = await Promise.all([
      dashboardRepository.listIncomesByBoard(access.board.id),
      dashboardRepository.listExpensesByBoard(access.board.id),
      boardAccessService.listUserBoards({ userId: input.actorId }),
    ]);

    return {
      status: 'loaded',
      board: {
        id: access.board.id,
        name: access.board.name,
        spendingLimitAmount: access.board.spendingLimitAmount,
      },
      role: access.role,
      boards,
      incomes,
      expenses,
    };
  };
}
