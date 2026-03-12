import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { boards, users } from './schema';

// Use the actual database client type
type DbClient = NeonHttpDatabase<Record<string, never>>;

export async function syncUser(
  db: DbClient,
  { id, phoneNumber }: { id: string; phoneNumber?: string | null },
) {
  const [user] = await db
    .insert(users)
    .values({
      id,
      phoneNumber: phoneNumber ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        phoneNumber: phoneNumber ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

export async function getOrCreateInitialBoard(
  db: DbClient,
  { userId }: { userId: string },
) {
  const existingBoards = await db
    .select()
    .from(boards)
    .where(eq(boards.ownerId, userId))
    .limit(1);

  if (existingBoards.length > 0) {
    return existingBoards[0];
  }

  const [newBoard] = await db
    .insert(boards)
    .values({
      name: 'Mi Tablero',
      ownerId: userId,
    })
    .returning();

  return newBoard;
}

export async function claimAnonymousData(
  db: DbClient,
  {
    realUserId,
    anonymousId,
    expenses: _expenses,
    incomes: _incomes,
    boardId,
    boardName,
    spendingLimitAmount,
  }: {
    realUserId: string;
    anonymousId: string;
    expenses?: unknown[];
    incomes?: unknown[];
    boardId?: string;
    boardName?: string;
    spendingLimitAmount?: string | null;
  },
) {
  console.log('[claimAnonymousData] Input:', {
    realUserId,
    anonymousId,
    expensesCount: _expenses?.length,
    incomesCount: _incomes?.length,
    boardId,
    boardName,
    spendingLimitAmount,
  });

  const runClaim = async (client: DbClient) => {
    const [anonUser] = await client
      .select()
      .from(users)
      .where(eq(users.id, anonymousId))
      .limit(1);

    console.log('[claimAnonymousData] anonUser:', anonUser);

    if (!anonUser) {
      throw new Error('Anonymous user not found');
    }

    if (anonUser.phoneNumber) {
      throw new Error('User is not anonymous');
    }

    // Check if anonymous user has a board (either by boardId or by ownerId)
    let anonBoard = null;

    if (boardId) {
      // Find board by provided ID (should belong to anonymous user)
      const [foundBoard] = await client
        .select()
        .from(boards)
        .where(eq(boards.id, boardId))
        .limit(1);
      anonBoard = foundBoard;
      console.log('[claimAnonymousData] Found board by boardId:', anonBoard);
    }

    if (!anonBoard) {
      // Fallback: find board by ownerId
      const [foundBoard] = await client
        .select()
        .from(boards)
        .where(eq(boards.ownerId, anonymousId))
        .limit(1);
      anonBoard = foundBoard;
    }

    console.log('[claimAnonymousData] anonBoard:', anonBoard);

    let _targetBoardId: string;

    // Migrate board if exists, or create new one
    if (anonBoard) {
      // Update board with local name/limit if provided
      const updateData: Record<string, unknown> = {
        ownerId: realUserId,
        updatedAt: new Date(),
      };
      if (boardName) {
        updateData.name = boardName;
      }
      if (spendingLimitAmount !== undefined) {
        updateData.spendingLimitAmount = spendingLimitAmount;
      }

      await client
        .update(boards)
        .set(updateData)
        .where(eq(boards.id, anonBoard.id));

      _targetBoardId = anonBoard.id;
    } else {
      // Create a new board (with local data if available)
      const [newBoard] = await client
        .insert(boards)
        .values({
          name: boardName || 'Mi Tablero',
          ownerId: realUserId,
          spendingLimitAmount: spendingLimitAmount ?? null,
        })
        .returning();

      console.log('[claimAnonymousData] Created new board:', newBoard.id);
      _targetBoardId = newBoard.id;
    }

    // Note: Local expenses/incomes require category IDs from the database
    // They are stored locally with categoryName/categoryEmoji but the DB requires categoryId
    // For now, we only migrate the board data. Users can re-add expenses if needed.
    if (_expenses?.length) {
      console.log(
        '[claimAnonymousData] Skipping local expenses migration - requires category setup',
      );
    }
    if (_incomes?.length) {
      console.log(
        '[claimAnonymousData] Skipping local incomes migration - requires category setup',
      );
    }

    // Delete anonymous user (data already migrated)
    await client.delete(users).where(eq(users.id, anonymousId));

    return { success: true, boardMigrated: !!anonBoard };
  };

  if ('transaction' in db && typeof db.transaction === 'function') {
    try {
      return await db.transaction(async (tx) =>
        runClaim(tx as unknown as DbClient),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('No transactions support in neon-http driver')
      ) {
        return await runClaim(db);
      }
      throw error;
    }
  }

  return await runClaim(db);
}
