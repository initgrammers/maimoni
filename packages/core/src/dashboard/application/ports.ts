export type DashboardBoard = {
  id: string;
  name: string;
  spendingLimitAmount: string | null;
};

export type DashboardIncome = {
  id: string;
  amount: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string | null;
  date: string | null;
  note: string | null;
};

export type DashboardExpense = {
  id: string;
  amount: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string | null;
  date: string | null;
  note: string | null;
};

export type DashboardRepository = {
  listIncomesByBoard(boardId: string): Promise<DashboardIncome[]>;
  listExpensesByBoard(boardId: string): Promise<DashboardExpense[]>;
  findBoardById(boardId: string): Promise<DashboardBoard | null>;
};
