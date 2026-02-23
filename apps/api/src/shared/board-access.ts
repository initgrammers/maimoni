import { boardMembers, boards, getOrCreateInitialBoard } from '@maimoni/db';
import { and, eq, or } from 'drizzle-orm';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

export type BoardAccessRole = 'owner' | 'editor' | 'viewer';

export async function getUserBoardRole(
  db: DbClient,
  userId: string,
  boardId: string,
) {
  const [board] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.isActive, true)))
    .limit(1);

  if (!board) {
    return null;
  }

  if (board.ownerId === userId) {
    return { board, role: 'owner' as BoardAccessRole };
  }

  const [membership] = await db
    .select()
    .from(boardMembers)
    .where(
      and(
        eq(boardMembers.boardId, boardId),
        eq(boardMembers.userId, userId),
        eq(boardMembers.isActive, true),
      ),
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return { board, role: 'editor' as BoardAccessRole };
}

export async function getOrSelectAccessibleBoard(
  db: DbClient,
  userId: string,
  requestedBoardId?: string,
) {
  if (requestedBoardId) {
    const access = await getUserBoardRole(db, userId, requestedBoardId);
    if (!access) {
      return null;
    }

    return access;
  }

  const [ownedBoard] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.ownerId, userId), eq(boards.isActive, true)))
    .limit(1);

  if (ownedBoard) {
    return { board: ownedBoard, role: 'owner' as BoardAccessRole };
  }

  const [membership] = await db
    .select()
    .from(boardMembers)
    .where(
      and(eq(boardMembers.userId, userId), eq(boardMembers.isActive, true)),
    )
    .limit(1);

  if (membership) {
    const access = await getUserBoardRole(db, userId, membership.boardId);
    if (access) {
      return access;
    }
  }

  const board = await getOrCreateInitialBoard(db, { userId });
  return { board, role: 'owner' as BoardAccessRole };
}

export async function listUserBoards(db: DbClient, userId: string) {
  const [ownedBoards, memberships] = await Promise.all([
    db
      .select({
        id: boards.id,
        name: boards.name,
        spendingLimitAmount: boards.spendingLimitAmount,
      })
      .from(boards)
      .where(and(eq(boards.ownerId, userId), eq(boards.isActive, true))),
    db
      .select({
        boardId: boardMembers.boardId,
      })
      .from(boardMembers)
      .where(
        and(eq(boardMembers.userId, userId), eq(boardMembers.isActive, true)),
      ),
  ]);

  const membershipBoardIds = memberships.map(
    (membership) => membership.boardId,
  );
  const membershipBoards =
    membershipBoardIds.length === 0
      ? []
      : await db
          .select({
            id: boards.id,
            name: boards.name,
            spendingLimitAmount: boards.spendingLimitAmount,
          })
          .from(boards)
          .where(
            and(
              eq(boards.isActive, true),
              or(
                ...membershipBoardIds.map((boardId) => eq(boards.id, boardId)),
              ),
            ),
          );

  const results: Array<{
    id: string;
    name: string;
    spendingLimitAmount: string | null;
    role: BoardAccessRole;
  }> = [];

  for (const board of ownedBoards) {
    results.push({
      id: board.id,
      name: board.name,
      spendingLimitAmount: board.spendingLimitAmount,
      role: 'owner',
    });
  }

  for (const board of membershipBoards) {
    if (results.some((item) => item.id === board.id)) {
      continue;
    }

    results.push({
      id: board.id,
      name: board.name,
      spendingLimitAmount: board.spendingLimitAmount,
      role: 'editor',
    });
  }

  return results;
}
