import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalExpense,
  deleteLocalExpense,
  getLocalExpenses,
  isExpenseLocalMode,
} from './expense-service';

const LOCAL_STORAGE_KEY = 'localExpenses';

describe('expense-service', () => {
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

  describe('isExpenseLocalMode', () => {
    it('should return false when no anonymousId exists', () => {
      expect(isExpenseLocalMode()).toBe(false);
    });

    it('should return true when anonymousId exists', () => {
      localStorageMock.anonymousId = 'anon-123';
      expect(isExpenseLocalMode()).toBe(true);
    });
  });

  describe('getLocalExpenses', () => {
    it('should return empty array when no expenses exist', () => {
      const expenses = getLocalExpenses();
      expect(expenses).toEqual([]);
    });

    it('should return parsed expenses from localStorage', () => {
      const mockExpenses = [
        {
          id: 'local-123',
          amount: 100,
          description: 'Test expense',
          categoryId: 'cat-1',
          date: '2025-01-15',
          subcategoryId: null,
        },
      ];
      localStorageMock[LOCAL_STORAGE_KEY] = JSON.stringify(mockExpenses);

      const expenses = getLocalExpenses();

      expect(expenses).toHaveLength(1);
      expect(expenses[0].id).toBe('local-123');
      expect(expenses[0].amount).toBe(100);
    });

    it('should return empty array when localStorage contains invalid JSON', () => {
      localStorageMock[LOCAL_STORAGE_KEY] = 'invalid-json';

      const expenses = getLocalExpenses();

      expect(expenses).toEqual([]);
    });
  });

  describe('createLocalExpense', () => {
    it('should create expense with local- prefixed ID', async () => {
      const expense = await createLocalExpense({
        amount: 50,
        description: 'New expense',
        categoryId: 'cat-1',
        date: '2025-01-20',
        subcategoryId: null,
      });

      expect(expense.id).toMatch(/^local-\d+-\d+$/);
      expect(expense.amount).toBe(50);
      expect(expense.description).toBe('New expense');
    });

    it('should persist expense to localStorage', async () => {
      await createLocalExpense({
        amount: 75,
        description: 'Persisted expense',
        categoryId: 'cat-2',
        date: '2025-01-21',
        subcategoryId: null,
      });

      const stored = localStorageMock[LOCAL_STORAGE_KEY];
      const expenses = JSON.parse(stored);

      expect(expenses).toHaveLength(1);
      expect(expenses[0].amount).toBe(75);
    });

    it('should append to existing expenses', async () => {
      localStorageMock[LOCAL_STORAGE_KEY] = JSON.stringify([
        {
          id: 'local-1',
          amount: 10,
          description: 'Existing',
          categoryId: 'cat-1',
          date: '2025-01-01',
          subcategoryId: null,
        },
      ]);

      await createLocalExpense({
        amount: 20,
        description: 'Second expense',
        categoryId: 'cat-1',
        date: '2025-01-02',
        subcategoryId: null,
      });

      const expenses = getLocalExpenses();
      expect(expenses).toHaveLength(2);
    });
  });

  describe('deleteLocalExpense', () => {
    it('should remove expense from localStorage', async () => {
      localStorageMock[LOCAL_STORAGE_KEY] = JSON.stringify([
        {
          id: 'local-123',
          amount: 100,
          description: 'To delete',
          categoryId: 'cat-1',
          date: '2025-01-15',
          subcategoryId: null,
        },
      ]);

      await deleteLocalExpense('local-123');

      const expenses = getLocalExpenses();
      expect(expenses).toHaveLength(0);
    });

    it('should not modify storage when expense does not exist', async () => {
      localStorageMock[LOCAL_STORAGE_KEY] = JSON.stringify([
        {
          id: 'local-123',
          amount: 100,
          description: 'Existing',
          categoryId: 'cat-1',
          date: '2025-01-15',
          subcategoryId: null,
        },
      ]);

      await deleteLocalExpense('non-existent');

      const expenses = getLocalExpenses();
      expect(expenses).toHaveLength(1);
    });
  });
});
