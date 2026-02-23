import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createInvitationsRouter } from './invitations';
import { createMockDb } from './route-test-utils';

const USER_ID = 'user-1';
const BOARD_ID = '00000000-0000-4000-8000-000000000011';
const INVITATION_ID = '00000000-0000-4000-8000-000000000012';
const TOKEN = 'token-token-token-token-12345';

function createApp(db: unknown) {
  const app = new Hono<UserContext>();
  app.use('/api/*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/api', createInvitationsRouter({ db } as never));
  return app;
}

describe('invitations router', () => {
  it('returns 503 when invitation schema is not ready', async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: () => Promise.reject({ code: '42703' }),
        }),
      }),
    };
    const app = createApp(db as never);

    const res = await app.request(`/api/boards/${BOARD_ID}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole: 'editor', phoneNumber: '12345' }),
    });

    expect(res.status).toBe(503);
  });

  it('rejects invalid board ids on create', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request('/api/boards/not-a-uuid/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole: 'editor', phoneNumber: '12345' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 when board access is missing on create', async () => {
    const db = createMockDb({ selectResults: [[], []] });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole: 'editor', phoneNumber: '12345' }),
    });

    expect(res.status).toBe(404);
  });
  it('creates invitations when access is granted', async () => {
    const db = createMockDb({
      selectResults: [[], [{ id: BOARD_ID, ownerId: USER_ID, isActive: true }]],
      insertResults: [
        [
          {
            id: INVITATION_ID,
            boardId: BOARD_ID,
            invitedByUserId: USER_ID,
            status: 'pending',
          },
        ],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole: 'editor', phoneNumber: '12345' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation.id).toBe(INVITATION_ID);
    expect(body.inviteToken.length).toBeGreaterThan(0);
  });

  it('lists invitations for a board', async () => {
    const db = createMockDb({
      selectResults: [
        [],
        [{ id: BOARD_ID, ownerId: USER_ID, isActive: true }],
        [
          {
            invitation: {
              id: INVITATION_ID,
              boardId: BOARD_ID,
              status: 'pending',
            },
            inviterName: 'Alice',
            inviterPhone: '123',
          },
        ],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}/invitations`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].id).toBe(INVITATION_ID);
  });

  it('rejects invalid board ids on list', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request('/api/boards/not-a-uuid/invitations');

    expect(res.status).toBe(400);
  });

  it('returns 404 when board access is missing on list', async () => {
    const db = createMockDb({ selectResults: [[], []] });
    const app = createApp(db);

    const res = await app.request(`/api/boards/${BOARD_ID}/invitations`);

    expect(res.status).toBe(404);
  });

  it('revokes pending invitations', async () => {
    const db = createMockDb({
      selectResults: [
        [],
        [
          {
            id: INVITATION_ID,
            boardId: BOARD_ID,
            status: 'pending',
            isActive: true,
          },
        ],
        [{ id: BOARD_ID, ownerId: USER_ID, isActive: true }],
      ],
      updateResults: [[{ id: INVITATION_ID, status: 'revoked' }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/invitations/${INVITATION_ID}/revoke`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation.status).toBe('revoked');
  });

  it('rejects invalid invitation ids on revoke', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request('/api/invitations/not-a-uuid/revoke', {
      method: 'POST',
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 when invitation is missing on revoke', async () => {
    const db = createMockDb({ selectResults: [[], []] });
    const app = createApp(db);

    const res = await app.request(`/api/invitations/${INVITATION_ID}/revoke`, {
      method: 'POST',
    });

    expect(res.status).toBe(404);
  });

  it('rejects revoking non-pending invitations', async () => {
    const db = createMockDb({
      selectResults: [
        [],
        [
          {
            id: INVITATION_ID,
            boardId: BOARD_ID,
            status: 'accepted',
            isActive: true,
          },
        ],
        [{ id: BOARD_ID, ownerId: USER_ID, isActive: true }],
      ],
    });
    const app = createApp(db);

    const res = await app.request(`/api/invitations/${INVITATION_ID}/revoke`, {
      method: 'POST',
    });

    expect(res.status).toBe(400);
  });

  it('resolves expired invitations', async () => {
    const expiredDate = new Date(Date.now() - 1000);
    const db = createMockDb({
      selectResults: [
        [],
        [
          {
            invitation: {
              id: INVITATION_ID,
              boardId: BOARD_ID,
              status: 'pending',
              expiresAt: expiredDate,
              targetRole: 'editor',
            },
            boardName: 'Board',
            inviterName: 'Alice',
          },
        ],
      ],
      updateResults: [[{ id: INVITATION_ID, status: 'expired' }]],
    });
    const app = createApp(db);

    const res = await app.request(`/api/invitations/resolve?token=${TOKEN}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('expired');
  });

  it('requires a token on resolve', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = createApp(db);

    const res = await app.request('/api/invitations/resolve');

    expect(res.status).toBe(400);
  });

  it('returns 404 when resolve cannot find invitation', async () => {
    const db = createMockDb({ selectResults: [[], []] });
    const app = createApp(db);

    const res = await app.request(`/api/invitations/resolve?token=${TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('accepts invitations for new members', async () => {
    const db = createMockDb({
      selectResults: [
        [],
        [
          {
            id: INVITATION_ID,
            boardId: BOARD_ID,
            status: 'pending',
            expiresAt: null,
            isActive: true,
          },
        ],
        [{ id: BOARD_ID, isActive: true }],
        [],
      ],
      insertResults: [undefined],
      updateResults: [[{ id: INVITATION_ID, status: 'accepted' }]],
    });
    const app = createApp(db);

    const res = await app.request('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation.status).toBe('accepted');
    expect(body.alreadyMember).toBe(false);
  });

  it('returns 404 when accepting missing invitation', async () => {
    const db = createMockDb({ selectResults: [[], []] });
    const app = createApp(db);

    const res = await app.request('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(404);
  });

  it('rejects accepting non-pending invitations', async () => {
    const db = createMockDb({
      selectResults: [
        [],
        [
          {
            id: INVITATION_ID,
            boardId: BOARD_ID,
            status: 'accepted',
            isActive: true,
          },
        ],
      ],
    });
    const app = createApp(db);

    const res = await app.request('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects accepting expired invitations', async () => {
    const expiredDate = new Date(Date.now() - 1000);
    const db = createMockDb({
      selectResults: [
        [],
        [
          {
            id: INVITATION_ID,
            boardId: BOARD_ID,
            status: 'pending',
            expiresAt: expiredDate,
            isActive: true,
          },
        ],
      ],
    });
    const app = createApp(db);

    const res = await app.request('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 when board is missing on accept', async () => {
    const db = createMockDb({
      selectResults: [
        [],
        [
          {
            id: INVITATION_ID,
            boardId: BOARD_ID,
            status: 'pending',
            expiresAt: null,
            isActive: true,
          },
        ],
        [],
      ],
    });
    const app = createApp(db);

    const res = await app.request('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(404);
  });

  it('accepts invitations for existing members', async () => {
    const db = createMockDb({
      selectResults: [
        [],
        [
          {
            id: INVITATION_ID,
            boardId: BOARD_ID,
            status: 'pending',
            expiresAt: null,
            isActive: true,
          },
        ],
        [{ id: BOARD_ID, isActive: true }],
        [{ boardId: BOARD_ID, userId: USER_ID }],
      ],
      updateResults: [undefined, [{ id: INVITATION_ID, status: 'accepted' }]],
    });
    const app = createApp(db);

    const res = await app.request('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyMember).toBe(true);
  });

  it('declines invitations when valid', async () => {
    const db = createMockDb({
      selectResults: [
        [],
        [{ id: INVITATION_ID, status: 'pending', isActive: true }],
      ],
      updateResults: [[{ id: INVITATION_ID, status: 'declined' }]],
    });
    const app = createApp(db);

    const res = await app.request('/api/invitations/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation.status).toBe('declined');
  });

  it('returns 503 when schema is not ready on decline', async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: () => Promise.reject({ code: '42703' }),
        }),
      }),
    };
    const app = createApp(db as never);

    const res = await app.request('/api/invitations/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(503);
  });

  it('returns 404 when declining missing invitations', async () => {
    const db = createMockDb({ selectResults: [[], []] });
    const app = createApp(db);

    const res = await app.request('/api/invitations/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });

    expect(res.status).toBe(404);
  });
});
