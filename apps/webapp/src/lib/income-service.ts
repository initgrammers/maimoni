/**
 * Income service with localStorage support
 * Handles CRUD operations for incomes in local mode
 */

import type {
  LocalIncome,
  CreateIncomeInput,
  UpdateIncomeInput,
} from './storage-types';
import { generateLocalId } from './storage-types';
import { isLocalMode, getAnonymousId } from './anonymous';

const INCOMES_KEY = 'incomes';

/**
 * Get all incomes from localStorage
 */
export function getLocalIncomes(): LocalIncome[] {
  if (typeof window === 'undefined') return [];
  
  const data = localStorage.getItem(INCOMES_KEY);
  if (!data) return [];
  
  try {
    return JSON.parse(data) as LocalIncome[];
  } catch {
    return [];
  }
}

/**
 * Save incomes to localStorage
 */
function saveLocalIncomes(incomes: LocalIncome[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INCOMES_KEY, JSON.stringify(incomes));
}

/**
 * Create a new income in local mode
 */
export function createLocalIncome(input: CreateIncomeInput): LocalIncome {
  const incomes = getLocalIncomes();
  
  const newIncome: LocalIncome = {
    id: generateLocalId(),
    amount: input.amount,
    date: input.date,
    note: input.note ?? null,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    categoryEmoji: input.categoryEmoji,
  };
  
  incomes.push(newIncome);
  saveLocalIncomes(incomes);
  
  return newIncome;
}

/**
 * Update an existing income in local mode
 */
export function updateLocalIncome(
  id: string,
  input: UpdateIncomeInput,
): LocalIncome | null {
  const incomes = getLocalIncomes();
  const index = incomes.findIndex(i => i.id === id);
  
  if (index === -1) return null;
  
  const updated: LocalIncome = {
    ...incomes[index],
    ...input,
    id: incomes[index].id, // Preserve original ID
  };
  
  incomes[index] = updated;
  saveLocalIncomes(incomes);
  
  return updated;
}

/**
 * Delete an income in local mode
 */
export function deleteLocalIncome(id: string): boolean {
  const incomes = getLocalIncomes();
  const filtered = incomes.filter(i => i.id !== id);
  
  if (filtered.length === incomes.length) return false;
  
  saveLocalIncomes(filtered);
  return true;
}

/**
 * Get a single income by ID from local mode
 */
export function getLocalIncome(id: string): LocalIncome | null {
  const incomes = getLocalIncomes();
  return incomes.find(i => i.id === id) ?? null;
}

/**
 * Check if we're in local mode (for income operations)
 */
export function isIncomeLocalMode(): boolean {
  return isLocalMode();
}

/**
 * Get the anonymous user ID for income operations
 */
export function getIncomeUserId(): string | null {
  return getAnonymousId();
}
