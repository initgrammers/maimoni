import type { BoardAccessService } from '../../shared/application/board-access';
import { isUuid } from '../../shared/domain/ids';
import { isExpenseAmount, isExpenseDate } from '../domain/expense';
import type {
  CreateExpenseInput,
  ExpenseRecord,
  ExpenseRepository,
  UpdateExpenseInput,
} from './ports';

export type ListExpensesInput = {
  actorId: string;
  boardId: string;
};

export type ListExpensesResult =
  | { status: 'listed'; expenses: ExpenseRecord[] }
  | { status: 'invalid-board-id' | 'forbidden' };

export type GetExpenseInput = {
  actorId: string;
  expenseId: string;
};

export type GetExpenseResult =
  | { status: 'found'; expense: ExpenseRecord }
  | { status: 'invalid-expense-id' | 'expense-not-found' | 'forbidden' };

export type CreateExpenseResult =
  | { status: 'created'; expense: ExpenseRecord }
  | {
      status:
        | 'invalid-board-id'
        | 'invalid-category-id'
        | 'invalid-amount'
        | 'invalid-date'
        | 'invalid-category'
        | 'forbidden';
    };

export type UpdateExpenseInputData = {
  actorId: string;
  expenseId: string;
  update: UpdateExpenseInput;
};

export type UpdateExpenseResult =
  | { status: 'updated'; expense: ExpenseRecord }
  | {
      status:
        | 'invalid-expense-id'
        | 'invalid-category-id'
        | 'invalid-amount'
        | 'invalid-date'
        | 'invalid-category'
        | 'expense-not-found'
        | 'forbidden';
    };

export type DeleteExpenseInput = {
  actorId: string;
  expenseId: string;
};

export type DeleteExpenseResult =
  | { status: 'deleted'; id: string }
  | { status: 'invalid-expense-id' | 'expense-not-found' | 'forbidden' };

export function createListExpenses(deps: {
  boardAccessService: BoardAccessService;
  expenseRepository: ExpenseRepository;
}) {
  const { boardAccessService, expenseRepository } = deps;

  return async (input: ListExpensesInput): Promise<ListExpensesResult> => {
    if (!isUuid(input.boardId)) {
      return { status: 'invalid-board-id' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: input.boardId,
    });

    if (!access) {
      return { status: 'forbidden' };
    }

    const expenses = await expenseRepository.listByBoard(input.boardId);

    return { status: 'listed', expenses };
  };
}

export function createGetExpense(deps: {
  boardAccessService: BoardAccessService;
  expenseRepository: ExpenseRepository;
}) {
  const { boardAccessService, expenseRepository } = deps;

  return async (input: GetExpenseInput): Promise<GetExpenseResult> => {
    if (!isUuid(input.expenseId)) {
      return { status: 'invalid-expense-id' };
    }

    const expense = await expenseRepository.findById(input.expenseId);

    if (!expense) {
      return { status: 'expense-not-found' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: expense.boardId,
    });

    if (!access) {
      return { status: 'forbidden' };
    }

    return { status: 'found', expense };
  };
}

export function createCreateExpense(deps: {
  boardAccessService: BoardAccessService;
  expenseRepository: ExpenseRepository;
}) {
  const { boardAccessService, expenseRepository } = deps;

  return async (input: CreateExpenseInput): Promise<CreateExpenseResult> => {
    if (!isUuid(input.boardId)) {
      return { status: 'invalid-board-id' };
    }

    if (!isUuid(input.categoryId)) {
      return { status: 'invalid-category-id' };
    }

    if (!isExpenseAmount(input.amount)) {
      return { status: 'invalid-amount' };
    }

    if (input.date && !isExpenseDate(input.date)) {
      return { status: 'invalid-date' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: input.boardId,
    });

    if (!access || access.role === 'viewer') {
      return { status: 'forbidden' };
    }

    const categoryType = await expenseRepository.findCategoryType(
      input.categoryId,
    );

    if (categoryType !== 'expense') {
      return { status: 'invalid-category' };
    }

    const expense = await expenseRepository.create(input);

    return { status: 'created', expense };
  };
}

export function createUpdateExpense(deps: {
  boardAccessService: BoardAccessService;
  expenseRepository: ExpenseRepository;
}) {
  const { boardAccessService, expenseRepository } = deps;

  return async (
    input: UpdateExpenseInputData,
  ): Promise<UpdateExpenseResult> => {
    if (!isUuid(input.expenseId)) {
      return { status: 'invalid-expense-id' };
    }

    if (
      input.update.amount !== undefined &&
      !isExpenseAmount(input.update.amount)
    ) {
      return { status: 'invalid-amount' };
    }

    if (
      input.update.categoryId !== undefined &&
      !isUuid(input.update.categoryId)
    ) {
      return { status: 'invalid-category-id' };
    }

    if (input.update.date !== undefined && !isExpenseDate(input.update.date)) {
      return { status: 'invalid-date' };
    }

    const expense = await expenseRepository.findById(input.expenseId);

    if (!expense) {
      return { status: 'expense-not-found' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: expense.boardId,
    });

    if (!access || access.role === 'viewer') {
      return { status: 'forbidden' };
    }

    if (input.update.categoryId !== undefined) {
      const categoryType = await expenseRepository.findCategoryType(
        input.update.categoryId,
      );

      if (categoryType !== 'expense') {
        return { status: 'invalid-category' };
      }
    }

    const updated = await expenseRepository.update(
      input.expenseId,
      input.update,
    );

    if (!updated) {
      return { status: 'expense-not-found' };
    }

    return { status: 'updated', expense: updated };
  };
}

export function createDeleteExpense(deps: {
  boardAccessService: BoardAccessService;
  expenseRepository: ExpenseRepository;
}) {
  const { boardAccessService, expenseRepository } = deps;

  return async (input: DeleteExpenseInput): Promise<DeleteExpenseResult> => {
    if (!isUuid(input.expenseId)) {
      return { status: 'invalid-expense-id' };
    }

    const expense = await expenseRepository.findById(input.expenseId);

    if (!expense) {
      return { status: 'expense-not-found' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: expense.boardId,
    });

    if (!access || access.role === 'viewer') {
      return { status: 'forbidden' };
    }

    const deleted = await expenseRepository.softDelete(input.expenseId);

    if (!deleted) {
      return { status: 'expense-not-found' };
    }

    return { status: 'deleted', id: deleted.id };
  };
}
