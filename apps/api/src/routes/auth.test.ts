import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createAuthRouter } from './auth';
import { createMockDb } from './route-test-utils';

const USER_ID = 'user-1';
const ANON_ID = '00000000-0000-4000-8000-000000000099';

function createApp(db: unknown) {
  const app = new Hono<UserContext>();
  app.use('/api/*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/api', createAuthRouter({ db } as never));
  return app;
}

describe('auth router', () => {
  it('returns 400 when anonymousId is missing', async () => {
    const db = createMockDb();
    const app = createApp(db);

    const res = await app.request('/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it('claims anonymous data when input is valid', async () => {
    const db = createMockDb({
      selectResults: [[{ id: ANON_ID, phoneNumber: null }]],
      updateResults: [undefined, undefined, undefined, undefined, undefined],
      deleteResults: [undefined],
    });
    const app = createApp(db);

    const res = await app.request('/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousId: ANON_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 when claimAnonymousData fails', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request('/api/auth/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousId: ANON_ID }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Anonymous user not found');
  });
});
