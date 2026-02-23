export type CreateIncomeInput = {
  actorId: string;
  boardId: string;
  amount: string;
  categoryId: string;
  note?: string;
  date?: string;
};

export type UpdateIncomeInput = {
  amount?: string;
  categoryId?: string;
  note?: string | null;
  date?: string;
};

export type IncomeRecord = {
  id: string;
  boardId: string;
  userId: string;
  amount: string;
  categoryId: string;
  note: string | null;
  date: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type IncomeRepository = {
  create(input: CreateIncomeInput): Promise<IncomeRecord>;
  findById(id: string): Promise<IncomeRecord | null>;
  findCategoryType(categoryId: string): Promise<'income' | 'expense' | null>;
  update(id: string, input: UpdateIncomeInput): Promise<IncomeRecord | null>;
  listByBoard(boardId: string): Promise<IncomeRecord[]>;
  softDelete(id: string): Promise<{ id: string } | null>;
};
