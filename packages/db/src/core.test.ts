import { describe, expect, test } from 'bun:test';
import { claimAnonymousData } from './core';

type QueryChain<T> = {
  from: () => {
    where: () => {
      limit: () => Promise<T[]>;
    };
  };
};

type UpdateChain = {
  set: () => {
    where: () => Promise<void>;
  };
};

function createDb(selectRows: Array<{ phoneNumber: string | null }>) {
  const calls = {
    update: 0,
    delete: 0,
  };

  const tx = {
    select: () =>
      ({
        from: () => ({
          where: () => ({
            limit: async () => selectRows,
          }),
        }),
      }) satisfies QueryChain<{ phoneNumber: string | null }>,
    update: () => {
      calls.update += 1;
      return {
        set: () => ({
          where: async () => {},
        }),
      } satisfies UpdateChain;
    },
    delete: () => {
      calls.delete += 1;
      return {
        where: async () => {},
      };
    },
  };

  const db = {
    transaction: async (
      callback: (value: {
        select: typeof tx.select;
        update: typeof tx.update;
        delete: typeof tx.delete;
      }) => Promise<{ success: true }>,
    ) => callback(tx),
  };

  return { db, calls };
}

describe('claimAnonymousData', () => {
  test('throws when anonymous user does not exist', async () => {
    const { db } = createDb([]);

    await expect(
      claimAnonymousData(db as never, {
        realUserId: 'real-user',
        anonymousId: 'anon-user',
      }),
    ).rejects.toThrow('Anonymous user not found');
  });

  test('throws when user is not anonymous', async () => {
    const { db } = createDb([{ phoneNumber: '+593111111111' }]);

    await expect(
      claimAnonymousData(db as never, {
        realUserId: 'real-user',
        anonymousId: 'anon-user',
      }),
    ).rejects.toThrow('User is not anonymous');
  });

  test('runs all transfer updates and delete on success', async () => {
    const { db, calls } = createDb([{ phoneNumber: null }]);

    const result = await claimAnonymousData(db as never, {
      realUserId: 'real-user',
      anonymousId: 'anon-user',
    });

    expect(result).toEqual({ success: true });
    expect(calls.update).toBe(5);
    expect(calls.delete).toBe(1);
  });
});
