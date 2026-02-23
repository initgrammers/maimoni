export type Board = {
  id: string;
  ownerId: string;
  name: string;
  spendingLimitAmount: string | null;
  isActive: boolean;
};

export function isBoardOwner(board: Board, userId: string) {
  return board.ownerId === userId;
}
