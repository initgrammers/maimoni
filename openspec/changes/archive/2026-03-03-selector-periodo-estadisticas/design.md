# Design: Stats Period Selector

## Technical Approach

Modify the stats view in `apps/webapp/src/routes/index.tsx` to:
1. Remove "week" from period tabs (keep: month | year)
2. Add independent month/year picker states for stats section
3. Update stats calculations to filter by user-selected period instead of current date
4. Persist selection in localStorage

This follows the existing dashboard pattern where `selectedMonth` state + navigation controls filter data.

## Architecture Decisions

### Decision: Stats Period State Management

**Choice**: Independent state for stats period (`selectedStatsMonth`, `selectedStatsYear`) separate from dashboard `selectedMonth`
**Alternatives considered**: Reuse dashboard's `selectedMonth` state
**Rationale**: The spec explicitly requires independent operation - changing stats period should NOT affect dashboard and vice versa. Dashboard uses month navigation, stats needs both month and year pickers.

### Decision: localStorage Keys

**Choice**: Create new storage keys for stats persistence
**Alternatives considered**: Single key with combined JSON value
**Rationale**: Simple key-value approach matches existing `DASHBOARD_PERIOD_KEY` pattern. Keys: `statsPeriod`, `statsMonth`, `statsYear`

### Decision: Default Period

**Choice**: Default to "month" tab on first load
**Alternatives considered**: Default to "year"
**Rationale**: Spec explicitly requires "month" as default. Removes "week" entirely.

### Decision: Navigation Limits

**Choice**: ±12 months for month picker, ±5 years for year picker
**Alternatives considered**: Unlimited navigation
**Rationale**: Spec requirements match the existing dashboard pattern (±12 months) and add ±5 years for year picker

## Data Flow

```
User clicks tab (month/year)
        │
        ▼
setStatsPeriod(period)
        │
        ▼
If month tab: show month picker with selectedStatsMonth
If year tab: show year picker with selectedStatsYear
        │
        ▼
User navigates prev/next
        │
        ▼
setSelectedStatsMonth/Year
        │
        ▼
statsPeriodExpenses useMemo recalculates (deps: [movements, statsPeriod, selectedStatsMonth, selectedStatsYear])
        │
        ▼
Chart and totals update
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/webapp/src/lib/storage.ts` | Modify | Add `getStatsPeriod`, `setStatsPeriod`, `getStatsMonth`, `setStatsMonth`, `getStatsYear`, `setStatsYear` |
| `apps/webapp/src/routes/index.tsx` | Modify | 1) Update `Period` type to `'month' \| 'year'` 2) Add `selectedStatsMonth` state with storage 3) Add `selectedStatsYear` state with storage 4) Add navigation helpers (canGoPrevStatsMonth, etc.) 5) Add picker UI in stats view 6) Update `statsPeriodExpenses` to use selected period 7) Update `statsCategoryBreakdown` similarly |

## Interfaces / Contracts

### Storage Functions (apps/webapp/src/lib/storage.ts)

```typescript
const STATS_PERIOD_KEY = 'statsPeriod';
const STATS_MONTH_KEY = 'statsMonth';
const STATS_YEAR_KEY = 'statsYear';

export function getStatsPeriod(): 'month' | 'year' {
  // Read from localStorage, default to 'month'
}

export function setStatsPeriod(period: 'month' | 'year'): void {
  // Write to localStorage
}

export function getStatsMonth(): dayjs.Dayjs {
  // Read YYYY-MM format, default to dayjs()
}

export function setStatsMonth(date: dayjs.Dayjs): void {
  // Write YYYY-MM format
}

export function getStatsYear(): number {
  // Read YYYY, default to current year
}

export function setStatsYear(year: number): void {
  // Write YYYY
}
```

### State Variables (index.tsx)

```typescript
// Change Period type
type Period = 'month' | 'year'; // removed 'week'

// Replace statsPeriod default
const [statsPeriod, setStatsPeriod] = useState<Period>(() => getStatsPeriod());

// Add new states
const [selectedStatsMonth, setSelectedStatsMonth] = useState<dayjs.Dayjs>(() => 
  getStatsMonth()
);
const [selectedStatsYear, setSelectedStatsYear] = useState<number>(() => 
  getStatsYear()
);

// Navigation helpers
const canGoPrevStatsMonth = selectedStatsMonth.isAfter(
  dayjs().subtract(12, 'month').startOf('month')
);
const canGoNextStatsMonth = selectedStatsMonth.isBefore(dayjs().startOf('month'));

const canGoPrevStatsYear = selectedStatsYear > dayjs().year() - 5;
const canGoNextStatsYear = selectedStatsYear < dayjs().year() + 5;

// Handlers
function handlePrevStatsMonth() {
  if (!canGoPrevStatsMonth) return;
  setSelectedStatsMonth(prev => prev.subtract(1, 'month'));
}

function handleNextStatsMonth() {
  if (!canGoNextStatsMonth) return;
  setSelectedStatsMonth(prev => prev.add(1, 'month'));
}

function handlePrevStatsYear() {
  if (!canGoPrevStatsYear) return;
  setSelectedStatsYear(prev => prev - 1);
}

function handleNextStatsYear() {
  if (!canGoNextStatsYear) return;
  setSelectedStatsYear(prev => prev + 1);
}
```

### Updated statsPeriodExpenses Calculation

```typescript
const statsPeriodExpenses = useMemo(() => {
  // Replace `const now = new Date()` with selected period values
  const selectedYear = statsPeriod === 'month' 
    ? selectedStatsMonth.year() 
    : selectedStatsYear;
  const selectedMonth = statsPeriod === 'month' 
    ? selectedStatsMonth.month() 
    : null;

  // For 'month' period: filter to selectedStatsMonth year/month
  // For 'year' period: filter to selectedStatsYear
  // Remove all week-based logic entirely
}, [movements, statsPeriod, selectedStatsMonth, selectedStatsYear]);
```

### Updated statsCategoryBreakdown Calculation

Similar pattern - replace `now.getFullYear()` / `now.getMonth()` with selected period values.

### Picker UI in Stats View

```tsx
{/* Replace tab buttons - remove week */}
<div className="mt-6 flex rounded-2xl bg-slate-100 p-1 text-sm font-medium">
  {(['month', 'year'] as const).map((option) => (
    <button
      key={option}
      type="button"
      onClick={() => setStatsPeriod(option)}
      className={`flex-1 rounded-xl px-2 py-2 capitalize ${
        statsPeriod === option
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-400'
      }`}
    >
      {option === 'month' ? 'Mes' : 'Año'}
    </button>
  ))}
</div>

{/* Add picker UI based on period */}
{statsPeriod === 'month' && (
  <div className="flex items-center gap-2 mt-4">
    <button
      type="button"
      onClick={handlePrevStatsMonth}
      disabled={!canGoPrevStatsMonth}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white..."
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <span className="min-w-[120px] text-center text-sm font-semibold">
      {selectedStatsMonth.format('MMMM YYYY')}
    </span>
    <button
      type="button"
      onClick={handleNextStatsMonth}
      disabled={!canGoNextStatsMonth}
      ...
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
)}

{statsPeriod === 'year' && (
  <div className="flex items-center gap-2 mt-4">
    <button
      type="button"
      onClick={handlePrevStatsYear}
      disabled={!canGoPrevStatsYear}
      ...
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <span className="min-w-[60px] text-center text-sm font-semibold">
      {selectedStatsYear}
    </span>
    <button
      type="button"
      onClick={handleNextStatsYear}
      disabled={!canGoNextStatsYear}
      ...
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
)}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Storage functions | Test get/set roundtrip, invalid values |
| Unit | Period calculation logic | Verify filtering matches selected month/year |
| Integration | Tab switching | Click tab, verify picker appears |
| Integration | Navigation limits | Test prev/next disabled at boundaries |
| Integration | Period independence | Change stats period, verify dashboard unchanged |
| E2E | Full user flow | Select period, navigate, verify chart updates |

## Migration / Rollout

No migration required - frontend-only change:
- Default values ensure graceful fallback
- localStorage keys are new (no legacy data)
- No database changes

## Open Questions

- [ ] Should the picker UI be extracted to a reusable component? (Currently inline, but pattern could be reused)
- [ ] How to handle localStorage being unavailable (private browsing)? - Current code uses try/catch silently
