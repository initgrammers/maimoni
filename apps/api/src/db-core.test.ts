import { describe, expect, it } from 'bun:test';
import {
  claimAnonymousData,
  getOrCreateInitialBoard,
  syncUser,
} from '../../../packages/db/src/core';

describe('db core helpers', () => {
  it('syncs users with upsert', async () => {
    const db = {
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: () => Promise.resolve([{ id: 'user-1' }]),
          }),
        }),
      }),
    };

    const user = await syncUser(db as never, {
      id: 'user-1',
      phoneNumber: null,
    });

    expect(user.id).toBe('user-1');
  });

  it('returns an existing board when present', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 'board-1' }]),
          }),
        }),
      }),
    };

    const board = await getOrCreateInitialBoard(db as never, {
      userId: 'user-1',
    });

    expect(board.id).toBe('board-1');
  });

  it('creates a board when none exists', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: 'board-new' }]),
        }),
      }),
    };

    const board = await getOrCreateInitialBoard(db as never, {
      userId: 'user-1',
    });

    expect(board.id).toBe('board-new');
  });

  it('claims anonymous data when available', async () => {
    let updateCalls = 0;
    let deleteCalls = 0;
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 'anon', phoneNumber: null }]),
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => {
            updateCalls += 1;
            return Promise.resolve(undefined);
          },
        }),
      }),
      delete: () => ({
        where: () => {
          deleteCalls += 1;
          return Promise.resolve(undefined);
        },
      }),
    };

    const result = await claimAnonymousData(db as never, {
      realUserId: 'user-1',
      anonymousId: 'anon',
    });

    expect(result.success).toBe(true);
    expect(updateCalls).toBeGreaterThan(0);
    expect(deleteCalls).toBe(1);
  });

  it('throws when anonymous user is missing', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    };

    await expect(
      claimAnonymousData(db as never, {
        realUserId: 'user-1',
        anonymousId: 'anon',
      }),
    ).rejects.toThrow('Anonymous user not found');
  });
});
