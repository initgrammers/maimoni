import { categories } from '@maimoni/db';
import { eq } from 'drizzle-orm';
import type { CategoryRepository } from '../application/ports';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

const categoryColumns = {
  id: categories.id,
  name: categories.name,
  emoji: categories.emoji,
  type: categories.type,
  parentId: categories.parentId,
  isActive: categories.isActive,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
};

export function createCategoryRepository(db: DbClient): CategoryRepository {
  return {
    async listAll(input) {
      let query = db.select(categoryColumns).from(categories);

      if (input?.type) {
        query = query.where(eq(categories.type, input.type));
      }

      return query;
    },
  };
}
