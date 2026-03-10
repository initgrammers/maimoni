/**
 * Local storage types for anonymous mode
 * These types define the structure of expenses and incomes stored in localStorage
 */

export interface LocalExpense {
  id: string; // format: "local-{timestamp}-{random}"
  amount: string;
  date: string;
  note: string | null;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  subcategoryEmoji: string | null;
}

export interface LocalIncome {
  id: string; // format: "local-{timestamp}-{random}"
  amount: string;
  date: string;
  note: string | null;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
}

export interface CreateExpenseInput {
  amount: string;
  date: string;
  note?: string | null;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  subcategoryEmoji?: string | null;
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {}

export interface CreateIncomeInput {
  amount: string;
  date: string;
  note?: string | null;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
}

export interface UpdateIncomeInput extends Partial<CreateIncomeInput> {}

/**
 * Generate a unique ID for local expenses/incomes
 * Format: local-{timestamp}-{random}
 */
export function generateLocalId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `local-${timestamp}-${random}`;
}
