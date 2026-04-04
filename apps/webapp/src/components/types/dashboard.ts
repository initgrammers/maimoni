// Board types
export type Board = {
  id: string;
  name: string;
  spendingLimitAmount: string | null;
};

export type Income = {
  id: string;
  amount: string;
  date: string;
  note: string | null;
  categoryName: string;
  categoryEmoji: string;
};

export type Expense = {
  categoryId: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  subcategoryEmoji: string | null;
  id: string;
  amount: string;
  date: string;
  note: string | null;
  categoryName: string;
  categoryEmoji: string;
};

export type DashboardResponse = {
  board: Board;
  role: 'owner' | 'editor' | 'viewer';
  boards: Array<{
    id: string;
    name: string;
    spendingLimitAmount: string | null;
    role: 'owner' | 'editor' | 'viewer';
  }>;
  incomes: Income[];
  expenses: Expense[];
};

export type BoardInvitation = {
  id: string;
  boardId: string;
  invitedByUserId: string | null;
  invitedPhoneNumber: string | null;
  inviteeUserId: string | null;
  acceptedByUserId: string | null;
  inviteTokenHash: string | null;
  targetRole: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inviterName: string | null;
  inviterPhone: string | null;
};

export type DisplayMovement = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: Date;
  note: string | null;
  categoryName: string;
  categoryEmoji: string;
  categoryId: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  subcategoryEmoji: string | null;
};

export type Period = 'month' | 'year';
export type DashboardView = 'dashboard' | 'stats' | 'profile' | 'settings';

// Sunburst chart types
export interface SunburstSubcategory {
  id: string;
  name: string;
  percentage: number;
  total: number;
  color: string;
  emoji: string;
}

export interface SunburstCategory {
  id: string;
  name: string;
  percentage: number;
  total: number;
  color: string;
  emoji: string;
  children: SunburstSubcategory[];
}

export interface SunburstData {
  categories: SunburstCategory[];
  totalExpense: number;
}

export type PigMood = 'sin_datos' | 'zen' | 'fuerte' | 'alerta' | 'urgencia';
