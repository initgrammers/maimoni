import { describe, expect, it } from 'bun:test';
import { getEnv } from '../../../packages/utils/src/index';

describe('getEnv', () => {
  it('returns a single env value', () => {
    const previous = process.env.SINGLE_ENV;
    process.env.SINGLE_ENV = 'value';

    expect(getEnv('SINGLE_ENV')).toBe('value');

    if (previous === undefined) {
      delete process.env.SINGLE_ENV;
    } else {
      process.env.SINGLE_ENV = previous;
    }
  });

  it('returns multiple env values', () => {
    const previousA = process.env.ENV_A;
    const previousB = process.env.ENV_B;
    process.env.ENV_A = 'a';
    process.env.ENV_B = 'b';

    expect(getEnv(['ENV_A', 'ENV_B'])).toEqual({ ENV_A: 'a', ENV_B: 'b' });

    if (previousA === undefined) {
      delete process.env.ENV_A;
    } else {
      process.env.ENV_A = previousA;
    }

    if (previousB === undefined) {
      delete process.env.ENV_B;
    } else {
      process.env.ENV_B = previousB;
    }
  });

  it('throws when env is missing', () => {
    const previous = process.env.MISSING_ENV;
    delete process.env.MISSING_ENV;

    expect(() => getEnv('MISSING_ENV')).toThrow(
      'Environment variable MISSING_ENV is required but not defined.',
    );

    if (previous !== undefined) {
      process.env.MISSING_ENV = previous;
    }
  });
});
