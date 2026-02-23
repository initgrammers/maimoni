import { boardMembers, boards } from '@maimoni/db';
import { and, eq, or } from 'drizzle-orm';
import type {
  BoardRepository,
  BoardSettingsInput,
  BoardSummary,
} from '../application/ports';
import type { Board } from '../domain/board';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

export function createBoardRepository(db: DbClient): BoardRepository {
  return {
    async findById(id: string): Promise<Board | null> {
      const [board] = await db
        .select({
          id: boards.id,
          ownerId: boards.ownerId,
          name: boards.name,
          spendingLimitAmount: boards.spendingLimitAmount,
          isActive: boards.isActive,
        })
        .from(boards)
        .where(and(eq(boards.id, id), eq(boards.isActive, true)))
        .limit(1);

      return board ?? null;
    },

    async listByUser(userId: string): Promise<BoardSummary[]> {
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
            and(
              eq(boardMembers.userId, userId),
              eq(boardMembers.isActive, true),
            ),
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
                    ...membershipBoardIds.map((boardId) =>
                      eq(boards.id, boardId),
                    ),
                  ),
                ),
              );

      const results: BoardSummary[] = [];

      for (const board of ownedBoards) {
        results.push(board);
      }

      for (const board of membershipBoards) {
        if (results.some((item) => item.id === board.id)) {
          continue;
        }

        results.push(board);
      }

      return results;
    },

    async softDelete(id: string): Promise<{ id: string } | null> {
      const [result] = await db
        .update(boards)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(boards.id, id), eq(boards.isActive, true)))
        .returning({ id: boards.id });

      return result ?? null;
    },

    async updateSettings(
      id: string,
      input: BoardSettingsInput,
    ): Promise<Board> {
      const updateFields: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) {
        updateFields.name = input.name;
      }

      if (input.spendingLimitAmount !== undefined) {
        updateFields.spendingLimitAmount = input.spendingLimitAmount;
      }

      const [updatedBoard] = await db
        .update(boards)
        .set(updateFields)
        .where(eq(boards.id, id))
        .returning({
          id: boards.id,
          ownerId: boards.ownerId,
          name: boards.name,
          spendingLimitAmount: boards.spendingLimitAmount,
          isActive: boards.isActive,
        });

      if (!updatedBoard) {
        throw new Error('Board not found');
      }

      return updatedBoard;
    },
  };
}
