export type MovementType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  type: MovementType;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  emoji: string;
}

export interface Movement {
  id: string;
  amount: number;
  type: MovementType;
  category: Category;
  subcategory?: Subcategory;
  date: Date;
  note?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  receiptPhoto?: string;
  tags?: string[];
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
}
