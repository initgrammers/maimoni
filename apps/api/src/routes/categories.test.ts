import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createCategoriesRouter } from './categories';
import { createMockDb } from './route-test-utils';

const USER_ID = 'user-1';

function createApp(db: unknown) {
  const app = new Hono<UserContext>();
  app.use('/api/*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/api', createCategoriesRouter({ db } as never));
  return app;
}

describe('categories router', () => {
  it('returns categories grouped by parent', async () => {
    const db = createMockDb({
      selectResults: [
        [
          { id: 'cat-1', name: 'Food', emoji: 'food', parentId: null },
          { id: 'cat-2', name: 'Lunch', emoji: 'lunch', parentId: 'cat-1' },
        ],
      ],
    });
    const app = createApp(db);

    const res = await app.request('/api/categories');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].id).toBe('cat-1');
    expect(body[0].subcategories[0].id).toBe('cat-2');
  });
});
