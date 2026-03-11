import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalIncome,
  deleteLocalIncome,
  getLocalIncomes,
  isIncomeLocalMode,
} from './income-service';

const LOCAL_STORAGE_KEY = 'localIncomes';

describe('income-service', () => {
  let localStorageMock: Record<string, string>;
  let originalLocalStorage: Storage;
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    localStorageMock = {};
    originalLocalStorage = globalThis.localStorage;
    originalWindow = globalThis.window;
    globalThis.window = globalThis as unknown as Window & typeof globalThis;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] ?? null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value;
        },
        removeItem: (key: string) => {
          delete localStorageMock[key];
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    globalThis.window = originalWindow;
  });

  describe('isIncomeLocalMode', () => {
    it('should return false when no anonymousId exists', () => {
      expect(isIncomeLocalMode()).toBe(false);
    });

    it('should return true when anonymousId exists', () => {
      localStorageMock.anonymousId = 'anon-123';
      expect(isIncomeLocalMode()).toBe(true);
    });
  });

  describe('getLocalIncomes', () => {
    it('should return empty array when no incomes exist', () => {
      const incomes = getLocalIncomes();
      expect(incomes).toEqual([]);
    });

    it('should return parsed incomes from localStorage', () => {
      const mockIncomes = [
        {
          id: 'local-123',
          amount: 500,
          description: 'Salary',
          categoryId: 'cat-salary',
          date: '2025-01-15',
        },
      ];
      localStorageMock[LOCAL_STORAGE_KEY] = JSON.stringify(mockIncomes);

      const incomes = getLocalIncomes();

      expect(incomes).toHaveLength(1);
      expect(incomes[0].id).toBe('local-123');
      expect(incomes[0].amount).toBe(500);
    });

    it('should return empty array when localStorage contains invalid JSON', () => {
      localStorageMock[LOCAL_STORAGE_KEY] = 'invalid-json';

      const incomes = getLocalIncomes();

      expect(incomes).toEqual([]);
    });
  });

  describe('createLocalIncome', () => {
    it('should create income with local- prefixed ID', async () => {
      const income = await createLocalIncome({
        amount: 1000,
        description: 'Freelance work',
        categoryId: 'cat-freelance',
        date: '2025-01-20',
      });

      expect(income.id).toMatch(/^local-\d+-\d+$/);
      expect(income.amount).toBe(1000);
      expect(income.description).toBe('Freelance work');
    });

    it('should persist income to localStorage', async () => {
      await createLocalIncome({
        amount: 2000,
        description: 'Monthly salary',
        categoryId: 'cat-salary',
        date: '2025-01-01',
      });

      const stored = localStorageMock[LOCAL_STORAGE_KEY];
      const incomes = JSON.parse(stored);

      expect(incomes).toHaveLength(1);
      expect(incomes[0].amount).toBe(2000);
    });

    it('should append to existing incomes', async () => {
      localStorageMock[LOCAL_STORAGE_KEY] = JSON.stringify([
        {
          id: 'local-1',
          amount: 500,
          description: 'Existing',
          categoryId: 'cat-salary',
          date: '2025-01-01',
        },
      ]);

      await createLocalIncome({
        amount: 300,
        description: 'Extra income',
        categoryId: 'cat-other',
        date: '2025-01-15',
      });

      const incomes = getLocalIncomes();
      expect(incomes).toHaveLength(2);
    });
  });

  describe('deleteLocalIncome', () => {
    it('should remove income from localStorage', async () => {
      localStorageMock[LOCAL_STORAGE_KEY] = JSON.stringify([
        {
          id: 'local-123',
          amount: 1000,
          description: 'To delete',
          categoryId: 'cat-salary',
          date: '2025-01-15',
        },
      ]);

      await deleteLocalIncome('local-123');

      const incomes = getLocalIncomes();
      expect(incomes).toHaveLength(0);
    });

    it('should not modify storage when income does not exist', async () => {
      localStorageMock[LOCAL_STORAGE_KEY] = JSON.stringify([
        {
          id: 'local-123',
          amount: 1000,
          description: 'Existing',
          categoryId: 'cat-salary',
          date: '2025-01-15',
        },
      ]);

      await deleteLocalIncome('non-existent');

      const incomes = getLocalIncomes();
      expect(incomes).toHaveLength(1);
    });
  });
});
