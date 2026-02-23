export type CreateExpenseInput = {
  actorId: string;
  boardId: string;
  amount: string;
  categoryId: string;
  note?: string;
  tags?: string[];
  receiptUrl?: string;
  date?: string;
};

export type UpdateExpenseInput = {
  amount?: string;
  categoryId?: string;
  note?: string | null;
  date?: string;
};

export type ExpenseRecord = {
  id: string;
  boardId: string;
  userId: string;
  amount: string;
  categoryId: string;
  note: string | null;
  tags: string[] | null;
  receiptUrl: string | null;
  date: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpenseRepository = {
  create(input: CreateExpenseInput): Promise<ExpenseRecord>;
  findById(id: string): Promise<ExpenseRecord | null>;
  findCategoryType(categoryId: string): Promise<'income' | 'expense' | null>;
  update(id: string, input: UpdateExpenseInput): Promise<ExpenseRecord | null>;
  listByBoard(boardId: string): Promise<ExpenseRecord[]>;
  softDelete(id: string): Promise<{ id: string } | null>;
};
