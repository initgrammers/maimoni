import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createBoardsRouter } from './boards';
import { createMockDb } from './route-test-utils';

const USER_ID = 'user-1';
const BOARD_ID = '00000000-0000-4000-8000-000000000002';

function createApp(db: unknown) {
  const app = new Hono<UserContext>();
  app.use('/api/*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/api', createBoardsRouter({ db } as never));
  return app;
}

describe('boards router', () => {
  it('rejects invalid board ids on patch', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/boards/not-a-uuid/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Board' }),
    });

    expect(res.status).toBe(400);
  });

  it('updates board settings for owners', async () => {
    const db = createMockDb({
      selectResults: [[{ id: BOARD_ID, ownerId: USER_ID }]],
      updateResults: [[{ id: BOARD_ID, name: 'Updated' }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.board.id).toBe(BOARD_ID);
  });

  it('returns 404 when board is not found on patch', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Board' }),
    });

    expect(res.status).toBe(404);
  });

  it('rejects patch updates for non-owners', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: 'other', isActive: true }],
        [{ id: BOARD_ID, ownerId: 'other', isActive: true }],
        [{ boardId: BOARD_ID, userId: USER_ID, isActive: true }],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Board' }),
    });

    expect(res.status).toBe(403);
  });

  it('updates spending limits when provided', async () => {
    const db = createMockDb({
      selectResults: [[{ id: BOARD_ID, ownerId: USER_ID, isActive: true }]],
      updateResults: [[{ id: BOARD_ID, spendingLimitAmount: '100.00' }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spendingLimitAmount: '100.00' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.board.spendingLimitAmount).toBe('100.00');
  });

  it('prevents deleting the last board', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID }],
        [{ id: BOARD_ID, name: 'Board', spendingLimitAmount: null }],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(400);
  });

  it('rejects invalid board ids on delete', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/boards/not-a-uuid', {
      method: 'DELETE',
    });

    expect(res.status).toBe(400);
  });

  it('rejects deletes for non-owners', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: 'other', isActive: true }],
        [{ id: BOARD_ID, ownerId: 'other', isActive: true }],
        [{ boardId: BOARD_ID, userId: USER_ID, isActive: true }],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(403);
  });

  it('returns 404 when delete update does not find board', async () => {
    const otherBoardId = '00000000-0000-4000-8000-000000000099';
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID, isActive: true }],
        [{ id: BOARD_ID, name: 'Main', spendingLimitAmount: null }],
        [{ boardId: otherBoardId }],
        [{ id: otherBoardId, name: 'Shared', spendingLimitAmount: null }],
      ],
      updateResults: [[]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
  });

  it('deletes boards when allowed', async () => {
    const otherBoardId = '00000000-0000-4000-8000-000000000100';
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: USER_ID, isActive: true }],
        [{ id: BOARD_ID, name: 'Main', spendingLimitAmount: null }],
        [{ boardId: otherBoardId }],
        [{ id: otherBoardId, name: 'Shared', spendingLimitAmount: null }],
      ],
      updateResults: [[{ id: BOARD_ID }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(BOARD_ID);
  });
});
