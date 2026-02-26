import { boards, categories, expenses, incomes } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import type {
  DashboardBoard,
  DashboardExpense,
  DashboardIncome,
  DashboardRepository,
} from '../application/ports';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

function toDashboardDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export function createDashboardRepository(db: DbClient): DashboardRepository {
  return {
    async listIncomesByBoard(boardId: string): Promise<DashboardIncome[]> {
      const rows = await db
        .select({
          id: incomes.id,
          amount: incomes.amount,
          categoryId: incomes.categoryId,
          date: incomes.date,
          note: incomes.note,
          categoryName: categories.name,
          categoryEmoji: categories.emoji,
        })
        .from(incomes)
        .innerJoin(categories, eq(incomes.categoryId, categories.id))
        .where(and(eq(incomes.boardId, boardId), eq(incomes.isActive, true)));

      return rows.map((row) => ({
        id: row.id,
        amount: row.amount,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryEmoji: row.categoryEmoji,
        date: toDashboardDate(row.date),
        note: row.note,
      }));
    },

    async listExpensesByBoard(boardId: string): Promise<DashboardExpense[]> {
      const rows = await db
        .select({
          id: expenses.id,
          amount: expenses.amount,
          categoryId: expenses.categoryId,
          date: expenses.date,
          note: expenses.note,
          categoryName: categories.name,
          categoryEmoji: categories.emoji,
        })
        .from(expenses)
        .innerJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(eq(expenses.boardId, boardId), eq(expenses.isActive, true)));

      return rows.map((row) => ({
        id: row.id,
        amount: row.amount,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryEmoji: row.categoryEmoji,
        date: toDashboardDate(row.date),
        note: row.note,
      }));
    },

    async findBoardById(boardId: string): Promise<DashboardBoard | null> {
      const [board] = await db
        .select({
          id: boards.id,
          name: boards.name,
          spendingLimitAmount: boards.spendingLimitAmount,
        })
        .from(boards)
        .where(and(eq(boards.id, boardId), eq(boards.isActive, true)))
        .limit(1);

      return board ?? null;
    },
  };
}
