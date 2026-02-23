import { describe, expect, it } from 'bun:test';

async function loadServer() {
  return import('../../../packages/auth/src/server');
}

describe('auth server helpers', () => {
  it('creates memory storage', async () => {
    const { createStorage } = await loadServer();

    const storage = createStorage({ type: 'memory', options: {} });

    expect(storage).toBeDefined();
  });

  it('creates dynamo storage', async () => {
    const { createStorage } = await loadServer();

    const storage = createStorage({ type: 'dynamo', options: { table: 't' } });

    expect(storage).toBeDefined();
  });

  it('extracts subject id from access tokens', async () => {
    const { getSubjectIdFromAccessToken } = await loadServer();
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-1' }),
      'utf-8',
    ).toString('base64url');
    const token = `header.${payload}.sig`;

    expect(getSubjectIdFromAccessToken(token)).toBe('user-1');
    expect(getSubjectIdFromAccessToken('invalid')).toBeUndefined();
  });

  it('derives a deterministic subject from phone number', async () => {
    const { subjectFromPhone } = await loadServer();
    const subject = await subjectFromPhone('+123456789');

    expect(subject).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
