import { categories } from '@maimoni/db';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import type { ApiDeps } from './types';

export function createCategoriesRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();

  router.get('/categories', async (c) => {
    const type = c.req.query('type');
    let query = db.select().from(categories);

    if (type === 'income' || type === 'expense') {
      // @ts-expect-error - drizzle type complexity
      query = query.where(eq(categories.type, type));
    }

    const allCategories = await query;

    const parentCategories = allCategories.filter((cat) => !cat.parentId);
    const result = parentCategories.map((parent) => ({
      ...parent,
      subcategories: allCategories
        .filter((cat) => cat.parentId === parent.id)
        .map((sub) => ({
          id: sub.id,
          name: sub.name,
          emoji: sub.emoji,
        })),
    }));

    return c.json(result);
  });

  return router;
}
