import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createExpensesRouter } from './expenses';
import { createMockDb } from './route-test-utils';

const USER_ID = 'user-1';
const BOARD_ID = '00000000-0000-4000-8000-000000000007';
const EXPENSE_ID = '00000000-0000-4000-8000-000000000008';
const CATEGORY_ID = '00000000-0000-4000-8000-000000000009';
const CATEGORY_ID_2 = '00000000-0000-4000-8000-000000000010';

function createApp(db: unknown) {
  const app = new Hono<UserContext>();
  app.use('/api/*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/api', createExpensesRouter({ db } as never));
  return app;
}

describe('expenses router', () => {
  it('requires boardId when listing expenses', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/expenses');

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('boardId is required');
  });

  it('returns 404 when expense is missing', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`);

    expect(res.status).toBe(404);
  });

  it('rejects invalid expense ids on get', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/expenses/not-a-uuid');

    expect(res.status).toBe(400);
  });

  it('returns 403 when expense access is denied', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: EXPENSE_ID, boardId: BOARD_ID, isActive: true }],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`);

    expect(res.status).toBe(403);
  });

  it('rejects invalid category for new expense', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: CATEGORY_ID, type: 'income' }],
      ],
    });
    const app = createApp(db);

    const res = await app.request('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId: BOARD_ID,
        amount: '99.99',
        categoryId: CATEGORY_ID,
      }),
    });

    expect(res.status).toBe(400);
  });

  it('creates an expense with valid data', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: CATEGORY_ID, type: 'expense' }],
      ],
      insertResults: [
        [{ id: EXPENSE_ID, boardId: BOARD_ID, categoryId: CATEGORY_ID }],
      ],
    });
    const app = createApp(db);

    const res = await app.request('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId: BOARD_ID,
        amount: '75.00',
        categoryId: CATEGORY_ID,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].id).toBe(EXPENSE_ID);
  });

  it('updates an expense with valid category', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: EXPENSE_ID, boardId: BOARD_ID, isActive: true }],
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: CATEGORY_ID_2, type: 'expense' }],
      ],
      updateResults: [[{ id: EXPENSE_ID, amount: '55.00' }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '55.00', categoryId: CATEGORY_ID_2 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(EXPENSE_ID);
  });

  it('rejects invalid expense ids on patch', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/expenses/not-a-uuid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '10.00' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 when expense to update is missing', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '10.00' }),
    });

    expect(res.status).toBe(404);
  });

  it('rejects updates when expense access is denied', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: EXPENSE_ID, boardId: BOARD_ID, isActive: true }],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '10.00' }),
    });

    expect(res.status).toBe(403);
  });

  it('rejects invalid category on update', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: EXPENSE_ID, boardId: BOARD_ID, isActive: true }],
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: CATEGORY_ID_2, type: 'income' }],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: CATEGORY_ID_2 }),
    });

    expect(res.status).toBe(400);
  });

  it('deletes an expense when allowed', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: EXPENSE_ID, boardId: BOARD_ID, isActive: true }],
        [{ id: BOARD_ID, ownerId: USER_ID }],
      ],
      updateResults: [[{ id: EXPENSE_ID }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(EXPENSE_ID);
  });

  it('rejects invalid expense ids on delete', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/expenses/not-a-uuid', {
      method: 'DELETE',
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 when expense to delete is missing', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
  });

  it('rejects deletes when expense access is denied', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: EXPENSE_ID, boardId: BOARD_ID, isActive: true }],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/expenses/${EXPENSE_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(403);
  });

  it('rejects listing expenses when access is denied', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/expenses?boardId=${BOARD_ID}`);

    expect(res.status).toBe(403);
  });

  it('lists expenses when access is granted', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: EXPENSE_ID, boardId: BOARD_ID, isActive: true }],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/expenses?boardId=${BOARD_ID}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});
