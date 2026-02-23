import {
  buildCategoryHierarchy,
  type CategoryHierarchy,
  isCategoryType,
} from '../domain/category';
import type { CategoryRepository } from './ports';

export type ListCategoriesInput = {
  type?: string;
};

export type ListCategoriesResult = CategoryHierarchy[];

export function createListCategories(deps: {
  categoryRepository: CategoryRepository;
}) {
  const { categoryRepository } = deps;

  return async (
    input: ListCategoriesInput = {},
  ): Promise<ListCategoriesResult> => {
    const requestedType = input.type;
    const filter =
      requestedType && isCategoryType(requestedType)
        ? { type: requestedType }
        : undefined;

    const categories = await categoryRepository.listAll(filter);

    return buildCategoryHierarchy(categories);
  };
}
