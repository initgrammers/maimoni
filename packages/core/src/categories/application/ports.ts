import type { Category, CategoryType } from '../domain/category';

export type CategoryRecord = Category;

export type CategoryRepository = {
  listAll(input?: { type?: CategoryType }): Promise<CategoryRecord[]>;
};

export type { CategoryType };
