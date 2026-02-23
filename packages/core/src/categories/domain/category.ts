export type CategoryType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  emoji: string | null;
  type: CategoryType;
  parentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CategorySubcategory = {
  id: string;
  name: string;
  emoji: string | null;
};

export type CategoryHierarchy = Category & {
  subcategories: CategorySubcategory[];
};

export function isCategoryType(value: string): value is CategoryType {
  return value === 'income' || value === 'expense';
}

export function buildCategoryHierarchy(
  categories: Category[],
): CategoryHierarchy[] {
  const parentCategories = categories.filter((category) => !category.parentId);

  return parentCategories.map((parent) => ({
    ...parent,
    subcategories: categories
      .filter((category) => category.parentId === parent.id)
      .map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        emoji: subcategory.emoji,
      })),
  }));
}
