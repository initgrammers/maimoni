import type { SunburstCategory, SunburstSubcategory } from '../../routes/index';

interface SunburstChartProps {
  data: {
    categories: SunburstCategory[];
    totalExpense: number;
  };
  width?: number;
  height?: number;
}

/**
 * Converts polar coordinates (angle, radius) to cartesian (x, y)
 * Center of the SVG is at (65, 65) with viewBox "0 0 130 130"
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Creates an SVG path for an annular sector (donut slice)
 */
function createAnnularSectorPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const startOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    startOuter.x,
    startOuter.y,
    'A',
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    endOuter.x,
    endOuter.y,
    'L',
    endInner.x,
    endInner.y,
    'A',
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    startInner.x,
    startInner.y,
    'Z',
  ].join(' ');
}

// Umbral para mostrar labels (solo segmentos > 12%)
const LABEL_THRESHOLD = 12;

/**
 * Calcula la posición del label en el centro del arco
 */
function calculateLabelPosition(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): { x: number; y: number; midAngle: number } {
  const midAngle = startAngle + (endAngle - startAngle) / 2;
  const labelRadius = (innerRadius + outerRadius) / 2;
  const position = polarToCartesian(centerX, centerY, labelRadius, midAngle);
  return { x: position.x, y: position.y, midAngle };
}

/**
 * SunburstChart - A two-level hierarchical donut chart
 *
 * Visual structure:
 * - Outer ring (radius 35-48): Categories
 * - Inner ring (radius 18-33): Subcategories
 * - Center (radius 0-16): Total amount display
 */
export function SunburstChart({
  data,
  width = 200,
  height = 200,
}: SunburstChartProps) {
  const { categories, totalExpense } = data;

  // SVG configuration - viewBox must accommodate outer radius
  // viewBox 0 0 130 130 with center at 65,65
  // outerRingOuterRadius = 58 → max reach = 65 + 58 = 123 < 130 ✓
  const centerX = 65;
  const centerY = 65;
  const outerRingInnerRadius = 42;
  const outerRingOuterRadius = 58;
  const innerRingInnerRadius = 22;
  const innerRingOuterRadius = 40;
  const centerRadius = 20;

  // Generate segments for outer ring (categories)
  let currentCategoryAngle = 0;
  const categorySegments = categories.map((category) => {
    const angleSize = (category.percentage / 100) * 360;
    const startAngle = currentCategoryAngle;
    const endAngle = currentCategoryAngle + angleSize;
    currentCategoryAngle = endAngle;

    const labelPosition = calculateLabelPosition(
      centerX,
      centerY,
      outerRingInnerRadius,
      outerRingOuterRadius,
      startAngle,
      endAngle,
    );

    return {
      category,
      startAngle,
      endAngle,
      path: createAnnularSectorPath(
        centerX,
        centerY,
        outerRingInnerRadius,
        outerRingOuterRadius,
        startAngle,
        endAngle,
      ),
      labelX: labelPosition.x,
      labelY: labelPosition.y,
      shouldShowLabel: category.percentage > LABEL_THRESHOLD,
    };
  });

  // Generate segments for inner ring (subcategories)
  const subcategorySegments: Array<{
    subcategory: SunburstSubcategory;
    categoryColor: string;
    path: string;
    labelX: number;
    labelY: number;
    shouldShowLabel: boolean;
  }> = [];

  categories.forEach((category) => {
    // Find the category segment to get its angle range
    const categorySegment = categorySegments.find(
      (seg) => seg.category.name === category.name,
    );
    if (!categorySegment) return;

    const categoryAngleRange =
      categorySegment.endAngle - categorySegment.startAngle;
    let currentSubAngle = categorySegment.startAngle;

    // Distribute subcategories within the category's angle range
    category.children.forEach((subcategory: SunburstSubcategory) => {
      // Calculate proportional angle based on subcategory percentage relative to category
      const subcategoryProportion =
        category.total > 0 ? subcategory.total / category.total : 0;
      const subAngleSize = categoryAngleRange * subcategoryProportion;

      const startAngle = currentSubAngle;
      const endAngle = currentSubAngle + subAngleSize;
      currentSubAngle = endAngle;

      const labelPosition = calculateLabelPosition(
        centerX,
        centerY,
        innerRingInnerRadius,
        innerRingOuterRadius,
        startAngle,
        endAngle,
      );

      // Calculate subcategory percentage relative to total
      const subcategoryPercentage = (subcategory.total / totalExpense) * 100;

      subcategorySegments.push({
        subcategory,
        categoryColor: category.color,
        path: createAnnularSectorPath(
          centerX,
          centerY,
          innerRingInnerRadius,
          innerRingOuterRadius,
          startAngle,
          endAngle,
        ),
        labelX: labelPosition.x,
        labelY: labelPosition.y,
        shouldShowLabel: subcategoryPercentage > LABEL_THRESHOLD,
      });
    });
  });

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle empty state
  if (categories.length === 0 || totalExpense === 0) {
    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width, height }}
      >
        <svg
          viewBox="0 0 130 130"
          className="h-full w-full"
          aria-label="No hay gastos en el período seleccionado"
          role="img"
        >
          <title>No hay gastos en el período seleccionado</title>
          <circle
            cx={centerX}
            cy={centerY}
            r={outerRingOuterRadius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          <circle cx={centerX} cy={centerY} r={centerRadius} fill="white" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-slate-400">Sin datos</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width, height }}
    >
      <svg
        viewBox="0 0 130 130"
        className="h-full w-full"
        aria-label="Gráfico de distribución de gastos por categoría y subcategoría"
      >
        <title>Distribución de gastos por categoría</title>

        {/* Outer ring - Categories */}
        <g>
          {categorySegments.map(
            ({ category, path, labelX, labelY, shouldShowLabel }, index) => (
              <g key={`cat-${category.name}-${index}`}>
                <path
                  d={path}
                  fill={category.color}
                  stroke="white"
                  strokeWidth="1.5"
                />
                {shouldShowLabel && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="6"
                    fontWeight="500"
                    pointerEvents="none"
                  >
                    {`${Math.round(category.percentage)}%`}
                  </text>
                )}
              </g>
            ),
          )}
        </g>

        {/* Inner ring - Subcategories */}
        <g>
          {subcategorySegments.map(
            (
              {
                subcategory,
                categoryColor,
                path,
                labelX,
                labelY,
                shouldShowLabel,
              },
              index,
            ) => (
              <g key={`sub-${subcategory.name}-${index}`}>
                <path
                  d={path}
                  fill={categoryColor}
                  stroke="white"
                  strokeWidth="1"
                />
                {shouldShowLabel && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="5"
                    fontWeight="400"
                    pointerEvents="none"
                  >
                    {`${Math.round((subcategory.total / totalExpense) * 100)}%`}
                  </text>
                )}
              </g>
            ),
          )}
        </g>

        {/* Center circle with white background */}
        <circle
          cx={centerX}
          cy={centerY}
          r={centerRadius}
          fill="white"
          stroke="#f1f5f9"
          strokeWidth="1"
        />
      </svg>

      {/* Center text with total expense */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-base font-semibold text-slate-900">
          {formatCurrency(totalExpense)}
        </span>
      </div>
    </div>
  );
}
