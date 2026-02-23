import type { Board } from '../domain/board';

export type BoardSettingsInput = {
  name?: string;
  spendingLimitAmount?: string | null;
};

export type BoardSummary = {
  id: string;
  name: string;
  spendingLimitAmount: string | null;
};

export type BoardRepository = {
  findById(id: string): Promise<Board | null>;
  listByUser(userId: string): Promise<BoardSummary[]>;
  softDelete(id: string): Promise<{ id: string } | null>;
  updateSettings(id: string, input: BoardSettingsInput): Promise<Board>;
};
