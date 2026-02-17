import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import {
  boardMembers,
  boards,
  expenses,
  incomes,
  invitations,
  users,
} from './schema';

type DatabaseInstance = NeonHttpDatabase<Record<string, never>>;

type DbLike = {
  select: DatabaseInstance['select'];
  insert: DatabaseInstance['insert'];
  update: DatabaseInstance['update'];
  delete: DatabaseInstance['delete'];
  transaction?: (
    callback: (tx: DbLike) => Promise<{ success: boolean }>,
  ) => Promise<{ success: boolean }>;
};

export async function syncUser(
  db: DbLike,
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
  db: DbLike,
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
  db: DbLike,
  { realUserId, anonymousId }: { realUserId: string; anonymousId: string },
) {
  const runClaim = async (client: DbLike) => {
    const [anonUser] = await client
      .select()
      .from(users)
      .where(eq(users.id, anonymousId))
      .limit(1);

    if (!anonUser) {
      throw new Error('Anonymous user not found');
    }

    if (anonUser.phoneNumber) {
      throw new Error('User is not anonymous');
    }

    await client
      .update(boards)
      .set({ ownerId: realUserId, updatedAt: new Date() })
      .where(eq(boards.ownerId, anonymousId));

    await client
      .update(incomes)
      .set({ userId: realUserId, updatedAt: new Date() })
      .where(eq(incomes.userId, anonymousId));

    await client
      .update(expenses)
      .set({ userId: realUserId, updatedAt: new Date() })
      .where(eq(expenses.userId, anonymousId));

    await client
      .update(boardMembers)
      .set({ userId: realUserId, updatedAt: new Date() })
      .where(eq(boardMembers.userId, anonymousId));

    await client
      .update(invitations)
      .set({ invitedAnonymousId: null, updatedAt: new Date() })
      .where(eq(invitations.invitedAnonymousId, anonymousId));

    await client.delete(users).where(eq(users.id, anonymousId));

    return { success: true };
  };

  if ('transaction' in db && typeof db.transaction === 'function') {
    try {
      return await db.transaction(async (tx) => runClaim(tx));
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
