interface BarChartItemProps {
  emoji: string;
  name: string;
  percentage: number;
  amount: number;
  color: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isSubcategory?: boolean;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function BarChartItemContent({
  emoji,
  name,
  percentage,
  amount,
  color,
  hasChildren,
  isExpanded,
  isSubcategory,
}: Omit<BarChartItemProps, 'onToggle'>) {
  const indicatorClass = 'w-4 text-gray-400 text-xs flex-shrink-0';

  return (
    <>
      {/* Columna izquierda - 3 líneas */}
      <div className={`flex flex-col py-1 ${isSubcategory ? 'pl-4' : ''}`}>
        {/* Línea 1: Emoji + % */}
        <div className="flex items-center gap-1">
          {hasChildren ? (
            <span className={indicatorClass} aria-hidden="true">
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          <span>{emoji}</span>
          <span
            className={`${isSubcategory ? 'text-xs' : 'text-sm'} text-gray-600`}
          >
            {percentage}%
          </span>
        </div>

        {/* Línea 2: Monto (alineado con emoji) */}
        <div className="flex items-center">
          <span className="w-4 flex-shrink-0" />
          <span
            className={`${isSubcategory ? 'text-xs font-medium text-gray-800' : 'text-sm font-bold text-gray-900'}`}
          >
            {formatMoney(amount)}
          </span>
        </div>

        {/* Línea 3: Nombre (alineado con emoji) */}
        <div className="flex items-center">
          <span className="w-4 flex-shrink-0" />
          <span
            className={`truncate ${isSubcategory ? 'text-xs text-gray-700' : 'text-sm font-semibold text-gray-900'}`}
          >
            {name}
          </span>
        </div>
      </div>

      {/* Columna derecha - Barra */}
      <div className="relative h-12 pointer-events-none">
        {/* Fondo semi-transparente */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        />

        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-lg transition-opacity"
          style={{
            width: `${Math.max(percentage, 2)}%`,
            backgroundColor: color,
          }}
        />

        {/* Líneas punteadas verticales en 25%, 50%, 75% */}
        {[25, 50, 75].map((pos) => (
          <div
            key={pos}
            className="absolute top-0 bottom-0 border-l border-dashed border-gray-400/50"
            style={{ left: `${pos}%` }}
          />
        ))}

        {/* Borde punteado */}
        <div className="absolute inset-0 border border-dashed border-gray-400 rounded-lg pointer-events-none" />
      </div>
    </>
  );
}

export function BarChartItem({
  emoji,
  name,
  percentage,
  amount,
  color,
  hasChildren,
  isExpanded,
  onToggle,
  isSubcategory,
}: BarChartItemProps) {
  const commonClasses =
    'grid grid-cols-[110px_1fr] gap-3 items-center rounded-lg transition-colors text-left w-full';

  if (hasChildren) {
    return (
      <button
        type="button"
        className={`${commonClasses} cursor-pointer hover:bg-gray-50`}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <BarChartItemContent
          emoji={emoji}
          name={name}
          percentage={percentage}
          amount={amount}
          color={color}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          isSubcategory={isSubcategory}
        />
      </button>
    );
  }

  return (
    <div className={commonClasses}>
      <BarChartItemContent
        emoji={emoji}
        name={name}
        percentage={percentage}
        amount={amount}
        color={color}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        isSubcategory={isSubcategory}
      />
    </div>
  );
}
