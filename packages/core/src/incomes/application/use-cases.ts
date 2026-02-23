import type { BoardAccessService } from '../../shared/application/board-access';
import { isUuid } from '../../shared/domain/ids';
import { isIncomeAmount, isIncomeDate } from '../domain/income';
import type {
  CreateIncomeInput,
  IncomeRecord,
  IncomeRepository,
  UpdateIncomeInput,
} from './ports';

export type ListIncomesInput = {
  actorId: string;
  boardId: string;
};

export type ListIncomesResult =
  | { status: 'listed'; incomes: IncomeRecord[] }
  | { status: 'invalid-board-id' | 'forbidden' };

export type GetIncomeInput = {
  actorId: string;
  incomeId: string;
};

export type GetIncomeResult =
  | { status: 'found'; income: IncomeRecord }
  | { status: 'invalid-income-id' | 'income-not-found' | 'forbidden' };

export type CreateIncomeResult =
  | { status: 'created'; income: IncomeRecord }
  | {
      status:
        | 'invalid-board-id'
        | 'invalid-category-id'
        | 'invalid-amount'
        | 'invalid-date'
        | 'invalid-category'
        | 'forbidden';
    };

export type UpdateIncomeInputData = {
  actorId: string;
  incomeId: string;
  update: UpdateIncomeInput;
};

export type UpdateIncomeResult =
  | { status: 'updated'; income: IncomeRecord }
  | {
      status:
        | 'invalid-income-id'
        | 'invalid-category-id'
        | 'invalid-amount'
        | 'invalid-date'
        | 'invalid-category'
        | 'income-not-found'
        | 'forbidden';
    };

export type DeleteIncomeInput = {
  actorId: string;
  incomeId: string;
};

export type DeleteIncomeResult =
  | { status: 'deleted'; id: string }
  | { status: 'invalid-income-id' | 'income-not-found' | 'forbidden' };

export function createListIncomes(deps: {
  boardAccessService: BoardAccessService;
  incomeRepository: IncomeRepository;
}) {
  const { boardAccessService, incomeRepository } = deps;

  return async (input: ListIncomesInput): Promise<ListIncomesResult> => {
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

    const incomes = await incomeRepository.listByBoard(input.boardId);

    return { status: 'listed', incomes };
  };
}

export function createGetIncome(deps: {
  boardAccessService: BoardAccessService;
  incomeRepository: IncomeRepository;
}) {
  const { boardAccessService, incomeRepository } = deps;

  return async (input: GetIncomeInput): Promise<GetIncomeResult> => {
    if (!isUuid(input.incomeId)) {
      return { status: 'invalid-income-id' };
    }

    const income = await incomeRepository.findById(input.incomeId);

    if (!income) {
      return { status: 'income-not-found' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: income.boardId,
    });

    if (!access) {
      return { status: 'forbidden' };
    }

    return { status: 'found', income };
  };
}

export function createCreateIncome(deps: {
  boardAccessService: BoardAccessService;
  incomeRepository: IncomeRepository;
}) {
  const { boardAccessService, incomeRepository } = deps;

  return async (input: CreateIncomeInput): Promise<CreateIncomeResult> => {
    if (!isUuid(input.boardId)) {
      return { status: 'invalid-board-id' };
    }

    if (!isUuid(input.categoryId)) {
      return { status: 'invalid-category-id' };
    }

    if (!isIncomeAmount(input.amount)) {
      return { status: 'invalid-amount' };
    }

    if (input.date && !isIncomeDate(input.date)) {
      return { status: 'invalid-date' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: input.boardId,
    });

    if (!access || access.role === 'viewer') {
      return { status: 'forbidden' };
    }

    const categoryType = await incomeRepository.findCategoryType(
      input.categoryId,
    );

    if (categoryType !== 'income') {
      return { status: 'invalid-category' };
    }

    const income = await incomeRepository.create(input);

    return { status: 'created', income };
  };
}

export function createUpdateIncome(deps: {
  boardAccessService: BoardAccessService;
  incomeRepository: IncomeRepository;
}) {
  const { boardAccessService, incomeRepository } = deps;

  return async (input: UpdateIncomeInputData): Promise<UpdateIncomeResult> => {
    if (!isUuid(input.incomeId)) {
      return { status: 'invalid-income-id' };
    }

    if (
      input.update.amount !== undefined &&
      !isIncomeAmount(input.update.amount)
    ) {
      return { status: 'invalid-amount' };
    }

    if (
      input.update.categoryId !== undefined &&
      !isUuid(input.update.categoryId)
    ) {
      return { status: 'invalid-category-id' };
    }

    if (input.update.date !== undefined && !isIncomeDate(input.update.date)) {
      return { status: 'invalid-date' };
    }

    const income = await incomeRepository.findById(input.incomeId);

    if (!income) {
      return { status: 'income-not-found' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: income.boardId,
    });

    if (!access || access.role === 'viewer') {
      return { status: 'forbidden' };
    }

    if (input.update.categoryId !== undefined) {
      const categoryType = await incomeRepository.findCategoryType(
        input.update.categoryId,
      );

      if (categoryType !== 'income') {
        return { status: 'invalid-category' };
      }
    }

    const updated = await incomeRepository.update(input.incomeId, input.update);

    if (!updated) {
      return { status: 'income-not-found' };
    }

    return { status: 'updated', income: updated };
  };
}

export function createDeleteIncome(deps: {
  boardAccessService: BoardAccessService;
  incomeRepository: IncomeRepository;
}) {
  const { boardAccessService, incomeRepository } = deps;

  return async (input: DeleteIncomeInput): Promise<DeleteIncomeResult> => {
    if (!isUuid(input.incomeId)) {
      return { status: 'invalid-income-id' };
    }

    const income = await incomeRepository.findById(input.incomeId);

    if (!income) {
      return { status: 'income-not-found' };
    }

    const access = await boardAccessService.getUserBoardRole({
      userId: input.actorId,
      boardId: income.boardId,
    });

    if (!access || access.role === 'viewer') {
      return { status: 'forbidden' };
    }

    const deleted = await incomeRepository.softDelete(input.incomeId);

    if (!deleted) {
      return { status: 'income-not-found' };
    }

    return { status: 'deleted', id: deleted.id };
  };
}
