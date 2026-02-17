import { describe, expect, it } from 'vitest';
import { createToken, decodeSubject, hashToUuid } from './auth';

describe('auth helpers', () => {
  it('creates token containing subject', () => {
    const token = createToken('user-123');
    expect(decodeSubject(token)).toBe('user-123');
  });

  it('hashToUuid is deterministic', async () => {
    const a = await hashToUuid('+593999111222');
    const b = await hashToUuid('+593999111222');
    expect(a).toBe(b);
  });

  it('hashToUuid returns uuid-like format', async () => {
    const value = await hashToUuid('+593999111222');
    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
