import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { type ApiDeps, createCoreDeps, createCoreUseCases } from './types';

export function createCategoriesRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const { listCategories } = createCoreUseCases(coreDeps);

  router.get('/categories', async (c) => {
    const type = c.req.query('type');
    const result = await listCategories({ type });
    return c.json(result);
  });

  return router;
}
