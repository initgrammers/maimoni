import { useState } from 'react';
import { BarChartItem } from './BarChartItem';

interface StackedBarChartSubcategory {
  id: string;
  name: string;
  emoji: string;
  percentage: number;
  color: string;
  total: number;
}

interface StackedBarChartCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  percentage: number;
  total: number;
  children: StackedBarChartSubcategory[];
}

interface StackedBarChartProps {
  data: {
    categories: StackedBarChartCategory[];
    totalExpense: number;
  };
}

export function StackedBarChart({ data }: StackedBarChartProps) {
  const { categories, totalExpense } = data;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const toggleCategory = (categoryId: string, hasChildren: boolean) => {
    if (!hasChildren) return;
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  if (categories.length === 0 || totalExpense === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-0 bg-slate-300" />
        </div>
        <p className="mt-4 text-sm text-slate-400">Sin datos</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Scale indicators */}
      <div className="grid grid-cols-[110px_1fr] gap-3 mb-2">
        <div /> {/* Space for left column */}
        <div className="relative h-6">
          {/* 0% */}
          <span className="absolute left-0 text-xs text-gray-400">0%</span>
          <div className="absolute top-4 left-0 w-px h-2 bg-gray-300" />

          {/* 25% */}
          <span className="absolute left-[25%] -translate-x-1/2 text-xs text-gray-400">
            25%
          </span>
          <div className="absolute top-4 left-[25%] w-px h-2 bg-gray-300" />

          {/* 50% */}
          <span className="absolute left-[50%] -translate-x-1/2 text-xs text-gray-400">
            50%
          </span>
          <div className="absolute top-4 left-[50%] w-px h-2 bg-gray-300" />

          {/* 75% */}
          <span className="absolute left-[75%] -translate-x-1/2 text-xs text-gray-400">
            75%
          </span>
          <div className="absolute top-4 left-[75%] w-px h-2 bg-gray-300" />

          {/* 100% */}
          <span className="absolute right-0 text-xs text-gray-400">100%</span>
          <div className="absolute top-4 right-0 w-px h-2 bg-gray-300" />
        </div>
      </div>
      {categories.map((category) => {
        const hasChildren = category.children.length > 0;
        const isExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id} className="group">
            <BarChartItem
              emoji={category.emoji}
              name={category.name}
              percentage={Math.round(category.percentage)}
              amount={category.total}
              color={category.color}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onToggle={() => toggleCategory(category.id, hasChildren)}
            />

            {/* Subcategorías expandibles */}
            {isExpanded &&
              hasChildren &&
              category.children.map((sub) => (
                <div key={sub.id} className="mt-2">
                  <BarChartItem
                    emoji={sub.emoji || '•'}
                    name={sub.name}
                    percentage={Math.round(sub.percentage)}
                    amount={sub.total}
                    color={`${category.color}99`}
                    isSubcategory
                  />
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
