import { isUuid } from '../../shared/domain/ids';
import type { Board } from '../domain/board';
import { isBoardOwner } from '../domain/board';
import type {
  BoardRepository,
  BoardSettingsInput,
  BoardSummary,
} from './ports';

export type UpdateBoardSettingsInput = {
  actorId: string;
  boardId: string;
  settings: BoardSettingsInput;
};

export type UpdateBoardSettingsResult =
  | {
      status: 'updated';
      board: Board;
    }
  | { status: 'invalid-board-id' | 'board-not-found' | 'forbidden' };

export type DeleteBoardInput = {
  actorId: string;
  boardId: string;
};

export type DeleteBoardResult =
  | { status: 'deleted'; id: string }
  | {
      status:
        | 'invalid-board-id'
        | 'board-not-found'
        | 'forbidden'
        | 'last-board';
    };

export type ListBoardsInput = {
  actorId: string;
};

export type ListBoardsResult = BoardSummary[];

export function createUpdateBoardSettings(deps: {
  boardRepository: BoardRepository;
}) {
  const { boardRepository } = deps;

  return async (
    input: UpdateBoardSettingsInput,
  ): Promise<UpdateBoardSettingsResult> => {
    if (!isUuid(input.boardId)) {
      return { status: 'invalid-board-id' };
    }

    const board = await boardRepository.findById(input.boardId);

    if (!board) {
      return { status: 'board-not-found' };
    }

    if (!isBoardOwner(board, input.actorId)) {
      return { status: 'forbidden' };
    }

    const updatedBoard = await boardRepository.updateSettings(
      board.id,
      input.settings,
    );

    return { status: 'updated', board: updatedBoard };
  };
}

export function createDeleteBoard(deps: { boardRepository: BoardRepository }) {
  const { boardRepository } = deps;

  return async (input: DeleteBoardInput): Promise<DeleteBoardResult> => {
    if (!isUuid(input.boardId)) {
      return { status: 'invalid-board-id' };
    }

    const board = await boardRepository.findById(input.boardId);

    if (!board) {
      return { status: 'board-not-found' };
    }

    if (!isBoardOwner(board, input.actorId)) {
      return { status: 'forbidden' };
    }

    const accessibleBoards = await boardRepository.listByUser(input.actorId);

    if (accessibleBoards.length <= 1) {
      return { status: 'last-board' };
    }

    const result = await boardRepository.softDelete(board.id);

    if (!result) {
      return { status: 'board-not-found' };
    }

    return { status: 'deleted', id: result.id };
  };
}

export function createListBoards(deps: { boardRepository: BoardRepository }) {
  const { boardRepository } = deps;

  return async (input: ListBoardsInput): Promise<ListBoardsResult> => {
    return boardRepository.listByUser(input.actorId);
  };
}
