/**
 * Expense service with localStorage support
 * Handles CRUD operations for expenses in local mode
 */

import { getAnonymousId, isLocalMode } from './anonymous';
import type {
  CreateExpenseInput,
  LocalExpense,
  UpdateExpenseInput,
} from './storage-types';
import { generateLocalId } from './storage-types';

const EXPENSES_KEY = 'expenses';

/**
 * Get all expenses from localStorage
 */
export function getLocalExpenses(): LocalExpense[] {
  if (typeof window === 'undefined') return [];

  const data = localStorage.getItem(EXPENSES_KEY);
  if (!data) return [];

  try {
    return JSON.parse(data) as LocalExpense[];
  } catch {
    return [];
  }
}

/**
 * Save expenses to localStorage
 */
function saveLocalExpenses(expenses: LocalExpense[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

/**
 * Create a new expense in local mode
 */
export function createLocalExpense(input: CreateExpenseInput): LocalExpense {
  const expenses = getLocalExpenses();

  const newExpense: LocalExpense = {
    id: generateLocalId(),
    amount: input.amount,
    date: input.date,
    note: input.note ?? null,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    categoryEmoji: input.categoryEmoji,
    subcategoryId: input.subcategoryId ?? null,
    subcategoryName: input.subcategoryName ?? null,
    subcategoryEmoji: input.subcategoryEmoji ?? null,
  };

  expenses.push(newExpense);
  saveLocalExpenses(expenses);

  return newExpense;
}

/**
 * Update an existing expense in local mode
 */
export function updateLocalExpense(
  id: string,
  input: UpdateExpenseInput,
): LocalExpense | null {
  const expenses = getLocalExpenses();
  const index = expenses.findIndex((e) => e.id === id);

  if (index === -1) return null;

  const updated: LocalExpense = {
    ...expenses[index],
    ...input,
    id: expenses[index].id, // Preserve original ID
  };

  expenses[index] = updated;
  saveLocalExpenses(expenses);

  return updated;
}

/**
 * Delete an expense in local mode
 */
export function deleteLocalExpense(id: string): boolean {
  const expenses = getLocalExpenses();
  const filtered = expenses.filter((e) => e.id !== id);

  if (filtered.length === expenses.length) return false;

  saveLocalExpenses(filtered);
  return true;
}

/**
 * Get a single expense by ID from local mode
 */
export function getLocalExpense(id: string): LocalExpense | null {
  const expenses = getLocalExpenses();
  return expenses.find((e) => e.id === id) ?? null;
}

/**
 * Check if we're in local mode (for expense operations)
 */
export function isExpenseLocalMode(): boolean {
  return isLocalMode();
}

/**
 * Get the anonymous user ID for expense operations
 */
export function getExpenseUserId(): string | null {
  return getAnonymousId();
}
