import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createIncomesRouter } from './incomes';
import { createMockDb } from './route-test-utils';

const USER_ID = 'user-1';
const BOARD_ID = '00000000-0000-4000-8000-000000000003';
const INCOME_ID = '00000000-0000-4000-8000-000000000004';
const CATEGORY_ID = '00000000-0000-4000-8000-000000000005';
const CATEGORY_ID_2 = '00000000-0000-4000-8000-000000000006';

function createApp(db: unknown) {
  const app = new Hono<UserContext>();
  app.use('/api/*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/api', createIncomesRouter({ db } as never));
  return app;
}

describe('incomes router', () => {
  it('requires boardId when listing incomes', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/incomes');

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('boardId is required');
  });

  it('returns income list when access is granted', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: INCOME_ID, boardId: BOARD_ID, isActive: true }],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/incomes?boardId=${BOARD_ID}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('rejects listing incomes when access is denied', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/incomes?boardId=${BOARD_ID}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 when income is missing', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`);

    expect(res.status).toBe(404);
  });

  it('rejects invalid income ids on get', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/incomes/not-a-uuid');

    expect(res.status).toBe(400);
  });

  it('returns 403 when income access is denied', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: INCOME_ID, boardId: BOARD_ID, isActive: true }],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`);

    expect(res.status).toBe(403);
  });

  it('rejects invalid category for new income', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: CATEGORY_ID, type: 'expense' }],
      ],
    });
    const app = createApp(db);

    const res = await app.request('/api/incomes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId: BOARD_ID,
        amount: '100.00',
        categoryId: CATEGORY_ID,
      }),
    });

    expect(res.status).toBe(400);
  });

  it('creates an income with valid data', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: CATEGORY_ID, type: 'income' }],
      ],
      insertResults: [
        [{ id: INCOME_ID, boardId: BOARD_ID, categoryId: CATEGORY_ID }],
      ],
    });
    const app = createApp(db);

    const res = await app.request('/api/incomes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId: BOARD_ID,
        amount: '200.00',
        categoryId: CATEGORY_ID,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(INCOME_ID);
  });

  it('updates an income with valid category', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: INCOME_ID, boardId: BOARD_ID, isActive: true }],
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: CATEGORY_ID_2, type: 'income' }],
      ],
      updateResults: [[{ id: INCOME_ID, amount: '250.00' }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '250.00', categoryId: CATEGORY_ID_2 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(INCOME_ID);
  });

  it('rejects invalid income ids on patch', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/incomes/not-a-uuid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '10.00' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 when income to update is missing', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '10.00' }),
    });

    expect(res.status).toBe(404);
  });

  it('rejects updates when income access is denied', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: INCOME_ID, boardId: BOARD_ID, isActive: true }],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '10.00' }),
    });

    expect(res.status).toBe(403);
  });

  it('rejects invalid category on update', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: INCOME_ID, boardId: BOARD_ID, isActive: true }],
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: CATEGORY_ID_2, type: 'expense' }],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: CATEGORY_ID_2 }),
    });

    expect(res.status).toBe(400);
  });

  it('deletes an income when allowed', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: INCOME_ID, boardId: BOARD_ID, isActive: true }],
        [{ id: BOARD_ID, ownerId: USER_ID }],
      ],
      updateResults: [[{ id: INCOME_ID }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(INCOME_ID);
  });

  it('rejects invalid income ids on delete', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/incomes/not-a-uuid', {
      method: 'DELETE',
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 when income to delete is missing', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
  });

  it('rejects deletes when income access is denied', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: INCOME_ID, boardId: BOARD_ID, isActive: true }],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/incomes/${INCOME_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(403);
  });
});
