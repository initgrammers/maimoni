export type BoardAccessRole = 'owner' | 'editor' | 'viewer';

export type BoardAccessBoard = {
  id: string;
  name: string;
  spendingLimitAmount: string | null;
};

export type BoardAccess = {
  board: BoardAccessBoard;
  role: BoardAccessRole;
};

export type BoardAccessService = {
  getUserBoardRole(input: {
    userId: string;
    boardId: string;
  }): Promise<BoardAccess | null>;
  getOrSelectAccessibleBoard(input: {
    userId: string;
    requestedBoardId?: string;
  }): Promise<BoardAccess | null>;
  listUserBoards(input: {
    userId: string;
  }): Promise<Array<BoardAccessBoard & { role: BoardAccessRole }>>;
};
