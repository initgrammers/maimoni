import { categories, incomes } from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import type { IncomeRepository } from '../application/ports';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

const incomeColumns = {
  id: incomes.id,
  boardId: incomes.boardId,
  userId: incomes.userId,
  amount: incomes.amount,
  categoryId: incomes.categoryId,
  note: incomes.note,
  date: incomes.date,
  isActive: incomes.isActive,
  createdAt: incomes.createdAt,
  updatedAt: incomes.updatedAt,
};

export function createIncomeRepository(db: DbClient): IncomeRepository {
  return {
    async create(input) {
      const [income] = await db
        .insert(incomes)
        .values({
          boardId: input.boardId,
          userId: input.actorId,
          amount: input.amount,
          categoryId: input.categoryId,
          note: input.note ?? null,
          date: input.date ? new Date(input.date) : new Date(),
          isActive: true,
        })
        .returning(incomeColumns);

      if (!income) {
        throw new Error('Income not created');
      }

      return income;
    },

    async findById(id) {
      const [income] = await db
        .select(incomeColumns)
        .from(incomes)
        .where(and(eq(incomes.id, id), eq(incomes.isActive, true)))
        .limit(1);

      return income ?? null;
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

      const [income] = await db
        .update(incomes)
        .set(updateFields)
        .where(and(eq(incomes.id, id), eq(incomes.isActive, true)))
        .returning(incomeColumns);

      return income ?? null;
    },

    async listByBoard(boardId) {
      return db
        .select(incomeColumns)
        .from(incomes)
        .where(and(eq(incomes.boardId, boardId), eq(incomes.isActive, true)));
    },

    async softDelete(id) {
      const [income] = await db
        .update(incomes)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(incomes.id, id), eq(incomes.isActive, true)))
        .returning({ id: incomes.id });

      return income ?? null;
    },
  };
}
