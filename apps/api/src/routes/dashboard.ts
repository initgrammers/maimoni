import { categories, expenses, incomes } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import {
  getOrSelectAccessibleBoard,
  listUserBoards,
} from '../shared/board-access';
import type { ApiDeps } from './types';

export function createDashboardRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();

  router.get('/dashboard', async (c) => {
    const userId = c.get('userId');
    const requestedBoardId = c.req.query('boardId');
    const access = await getOrSelectAccessibleBoard(
      db,
      userId,
      requestedBoardId,
    );

    if (!access) {
      return c.json({ error: 'No tienes acceso a este tablero' }, 403);
    }

    const { board, role } = access;

    const [incomeRows, expenseRows] = await Promise.all([
      db
        .select({
          income: incomes,
          categoryName: categories.name,
          categoryEmoji: categories.emoji,
        })
        .from(incomes)
        .innerJoin(categories, eq(incomes.categoryId, categories.id))
        .where(and(eq(incomes.boardId, board.id), eq(incomes.isActive, true))),
      db
        .select({
          expense: expenses,
          categoryName: categories.name,
          categoryEmoji: categories.emoji,
        })
        .from(expenses)
        .innerJoin(categories, eq(expenses.categoryId, categories.id))
        .where(
          and(eq(expenses.boardId, board.id), eq(expenses.isActive, true)),
        ),
    ]);

    const incomesWithCategory = incomeRows.map(
      ({ income, categoryName, categoryEmoji }) => ({
        ...income,
        categoryName,
        categoryEmoji,
      }),
    );

    const expensesWithCategory = expenseRows.map(
      ({ expense, categoryName, categoryEmoji }) => ({
        ...expense,
        categoryName,
        categoryEmoji,
      }),
    );

    return c.json({
      board,
      role,
      boards: await listUserBoards(db, userId),
      incomes: incomesWithCategory,
      expenses: expensesWithCategory,
    });
  });

  return router;
}
