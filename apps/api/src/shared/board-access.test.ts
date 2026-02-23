import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { createMockDb } from '../routes/route-test-utils';
import {
  getOrSelectAccessibleBoard,
  getUserBoardRole,
  listUserBoards,
} from './board-access';

const USER_ID = 'user-1';
const BOARD_ID = '00000000-0000-4000-8000-000000000201';

describe('board access helpers', () => {
  it('returns owner role when board is owned', async () => {
    const db = createMockDb({
      selectResults: [[{ id: BOARD_ID, ownerId: USER_ID, isActive: true }]],
    });

    const access = await getUserBoardRole(db as never, USER_ID, BOARD_ID);

    expect(access?.role).toBe('owner');
  });

  it('returns editor role for active membership', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, ownerId: 'other', isActive: true }],
        [{ boardId: BOARD_ID, userId: USER_ID, isActive: true }],
      ],
    });

    const access = await getUserBoardRole(db as never, USER_ID, BOARD_ID);

    expect(access?.role).toBe('editor');
  });

  it('returns null when board is missing', async () => {
    const db = createMockDb({ selectResults: [[]] });

    const access = await getUserBoardRole(db as never, USER_ID, BOARD_ID);

    expect(access).toBeNull();
  });

  it('selects requested board when access exists', async () => {
    const db = createMockDb({
      selectResults: [[{ id: BOARD_ID, ownerId: USER_ID, isActive: true }]],
    });

    const access = await getOrSelectAccessibleBoard(
      db as never,
      USER_ID,
      BOARD_ID,
    );

    expect(access?.board.id).toBe(BOARD_ID);
  });

  it('returns null when requested board is inaccessible', async () => {
    const db = createMockDb({ selectResults: [[]] });

    const access = await getOrSelectAccessibleBoard(
      db as never,
      USER_ID,
      BOARD_ID,
    );

    expect(access).toBeNull();
  });

  it('selects member board when no owned board exists', async () => {
    const memberBoardId = '00000000-0000-4000-8000-000000000202';
    const db = createMockDb({
      selectResults: [
        [],
        [{ boardId: memberBoardId }],
        [{ id: memberBoardId, ownerId: 'other', isActive: true }],
        [{ boardId: memberBoardId, userId: USER_ID, isActive: true }],
      ],
    });

    const access = await getOrSelectAccessibleBoard(db as never, USER_ID);

    expect(access?.board.id).toBe(memberBoardId);
    expect(access?.role).toBe('editor');
  });

  it('creates initial board when no boards exist', async () => {
    const db = createMockDb({
      selectResults: [[], [], []],
      insertResults: [[{ id: BOARD_ID, ownerId: USER_ID }]],
    });

    const access = await getOrSelectAccessibleBoard(db as never, USER_ID);

    expect(access?.board.id).toBe(BOARD_ID);
    expect(access?.role).toBe('owner');
  });

  it('lists owned and member boards', async () => {
    const otherBoardId = '00000000-0000-4000-8000-000000000202';
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, name: 'Main', spendingLimitAmount: null }],
        [{ boardId: otherBoardId }],
        [{ id: otherBoardId, name: 'Shared', spendingLimitAmount: null }],
      ],
    });

    const boards = await listUserBoards(db as never, USER_ID);

    expect(boards).toHaveLength(2);
    expect(boards[0].role).toBe('owner');
    expect(boards[1].role).toBe('editor');
  });

  it('skips duplicate membership boards', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, name: 'Main', spendingLimitAmount: null }],
        [{ boardId: BOARD_ID }],
        [{ id: BOARD_ID, name: 'Main', spendingLimitAmount: null }],
      ],
    });

    const boards = await listUserBoards(db as never, USER_ID);

    expect(boards).toHaveLength(1);
    expect(boards[0].role).toBe('owner');
  });

  it('returns only owned boards when there are no memberships', async () => {
    const db = createMockDb({
      selectResults: [
        [{ id: BOARD_ID, name: 'Main', spendingLimitAmount: null }],
        [],
      ],
    });

    const boards = await listUserBoards(db as never, USER_ID);

    expect(boards).toHaveLength(1);
    expect(boards[0].role).toBe('owner');
  });
});
