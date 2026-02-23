import { categories, expenses } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import type { ExpenseRepository } from '../application/ports';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

const expenseColumns = {
  id: expenses.id,
  boardId: expenses.boardId,
  userId: expenses.userId,
  amount: expenses.amount,
  categoryId: expenses.categoryId,
  note: expenses.note,
  tags: expenses.tags,
  receiptUrl: expenses.receiptUrl,
  date: expenses.date,
  isActive: expenses.isActive,
  createdAt: expenses.createdAt,
  updatedAt: expenses.updatedAt,
};

export function createExpenseRepository(db: DbClient): ExpenseRepository {
  return {
    async create(input) {
      const [expense] = await db
        .insert(expenses)
        .values({
          boardId: input.boardId,
          userId: input.actorId,
          amount: input.amount,
          categoryId: input.categoryId,
          note: input.note ?? null,
          tags: input.tags ?? null,
          receiptUrl: input.receiptUrl ?? null,
          date: input.date ? new Date(input.date) : new Date(),
          isActive: true,
        })
        .returning(expenseColumns);

      if (!expense) {
        throw new Error('Expense not created');
      }

      return expense;
    },

    async findById(id) {
      const [expense] = await db
        .select(expenseColumns)
        .from(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.isActive, true)))
        .limit(1);

      return expense ?? null;
    },

    async findCategoryType(categoryId) {
      const [category] = await db
        .select({ type: categories.type })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      return category?.type ?? null;
    },

    async update(id, input) {
      const updateFields: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.amount !== undefined) {
        updateFields.amount = input.amount;
      }

      if (input.categoryId !== undefined) {
        updateFields.categoryId = input.categoryId;
      }

      if (input.note !== undefined) {
        updateFields.note = input.note;
      }

      if (input.date !== undefined) {
        updateFields.date = new Date(input.date);
      }

      const [expense] = await db
        .update(expenses)
        .set(updateFields)
        .where(and(eq(expenses.id, id), eq(expenses.isActive, true)))
        .returning(expenseColumns);

      return expense ?? null;
    },

    async listByBoard(boardId) {
      return db
        .select(expenseColumns)
        .from(expenses)
        .where(and(eq(expenses.boardId, boardId), eq(expenses.isActive, true)));
    },

    async softDelete(id) {
      const [expense] = await db
        .update(expenses)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(expenses.id, id), eq(expenses.isActive, true)))
        .returning({ id: expenses.id });

      return expense ?? null;
    },
  };
}
