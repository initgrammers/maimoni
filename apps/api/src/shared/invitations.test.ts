import '../test-setup';
import { describe, expect, it } from 'bun:test';
import {
  buildInvitationToken,
  ensureInvitationsSchemaIsReady,
  parseInvitationToken,
} from './invitations';

describe('invitation helpers', () => {
  it('builds and parses tokens deterministically', () => {
    const { token, tokenHash } = buildInvitationToken();

    expect(token.length).toBeGreaterThan(0);
    expect(parseInvitationToken(token)).toBe(tokenHash);
  });

  it('returns null when schema is ready', async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    };

    const result = await ensureInvitationsSchemaIsReady(db as never);

    expect(result).toBeNull();
  });

  it('detects missing column errors', async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: () => Promise.reject({ code: '42703' }),
        }),
      }),
    };

    const result = await ensureInvitationsSchemaIsReady(db as never);

    expect(result).toContain('Invitaciones no disponibles');
  });

  it('detects missing column errors from nested causes', async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: () =>
            Promise.reject({
              message: 'wrapped',
              cause: { message: 'column does not exist' },
            }),
        }),
      }),
    };

    const result = await ensureInvitationsSchemaIsReady(db as never);

    expect(result).toContain('Invitaciones no disponibles');
  });

  it('detects missing column errors from nested properties', async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: () =>
            Promise.reject({
              detail: { message: 'column does not exist' },
            }),
        }),
      }),
    };

    const result = await ensureInvitationsSchemaIsReady(db as never);

    expect(result).toContain('Invitaciones no disponibles');
  });

  it('returns generic message for other failures', async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: () =>
            Promise.reject(new Error('failed query invitations problem')),
        }),
      }),
    };

    const result = await ensureInvitationsSchemaIsReady(db as never);

    expect(result).toContain('Invitaciones temporalmente no disponibles');
  });

  it('returns generic message for failed invitation queries', async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: () => Promise.reject(new Error('failed query invitations')),
        }),
      }),
    };

    const result = await ensureInvitationsSchemaIsReady(db as never);

    expect(result).toContain('Invitaciones temporalmente no disponibles');
  });
});
