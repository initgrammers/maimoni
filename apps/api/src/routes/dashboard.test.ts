import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createDashboardRouter } from './dashboard';
import { createMockDb } from './route-test-utils';

const USER_ID = 'user-1';
const BOARD_ID = '00000000-0000-4000-8000-000000000001';

function createApp(db: unknown) {
  const app = new Hono<UserContext>();
  app.use('/api/*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/api', createDashboardRouter({ db } as never));
  return app;
}

describe('dashboard router', () => {
  it('returns 403 when board access is missing', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/dashboard?boardId=${BOARD_ID}`);

    expect(res.status).toBe(403);
  });

  it('returns board data when access is available', async () => {
    const db = createMockDb({
      selectResults: [
        [
          {
            id: BOARD_ID,
            ownerId: USER_ID,
            name: 'Board',
            spendingLimitAmount: null,
          },
        ],
        [
          {
            income: {
              id: 'income-1',
              boardId: BOARD_ID,
              categoryId: 'category-1',
              isActive: true,
            },
            categoryName: 'Salary',
            categoryEmoji: 'money',
          },
        ],
        [
          {
            expense: {
              id: 'expense-1',
              boardId: BOARD_ID,
              categoryId: 'category-2',
              isActive: true,
            },
            categoryName: 'Food',
            categoryEmoji: 'food',
          },
        ],
        [
          {
            id: BOARD_ID,
            name: 'Board',
            spendingLimitAmount: null,
          },
        ],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/dashboard?boardId=${BOARD_ID}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.board.id).toBe(BOARD_ID);
    expect(body.incomes[0].categoryName).toBe('Salary');
    expect(body.expenses[0].categoryEmoji).toBe('food');
    expect(body.boards[0].role).toBe('owner');
  });

  it('returns note field for incomes and expenses', async () => {
    const db = createMockDb({
      selectResults: [
        [
          {
            id: BOARD_ID,
            ownerId: USER_ID,
            name: 'Board',
            spendingLimitAmount: null,
          },
        ],
        [
          {
            id: 'income-1',
            boardId: BOARD_ID,
            categoryId: 'category-1',
            amount: '5000',
            date: new Date('2026-01-15'),
            note: 'Monthly salary',
            categoryName: 'Salary',
            categoryEmoji: 'money',
          },
        ],
        [
          {
            id: 'expense-1',
            boardId: BOARD_ID,
            categoryId: 'category-2',
            amount: '50',
            date: new Date('2026-01-20'),
            note: 'Lunch with team',
            categoryName: 'Food',
            categoryEmoji: 'food',
          },
        ],
        [
          {
            id: BOARD_ID,
            name: 'Board',
            spendingLimitAmount: null,
          },
        ],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/dashboard?boardId=${BOARD_ID}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.incomes[0].note).toBe('Monthly salary');
    expect(body.expenses[0].note).toBe('Lunch with team');
  });
});
