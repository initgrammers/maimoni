# Design: Month/Year Selector for Home Dashboard

## Technical Approach

The implementation extends the existing calendar component to support a simplified month-only selection mode, and adds state management in the dashboard to filter movements by user-selected month/year. This aligns with the proposal's Option A recommendation to reuse the calendar component for consistency with existing UI patterns.

## Architecture Decisions

### Decision: Calendar Component Month Mode

**Choice**: Extend the existing `Calendar` component with a `mode="month"` prop that hides the day grid and only displays month/year navigation.

**Alternatives considered**: 
- Create a separate `MonthPicker` component with custom dropdown UI
- Use the existing calendar but always default to first day of month

**Rationale**: Reusing the calendar component maintains visual consistency with other date selection experiences in the app (e.g., expense/income date pickers). The component already has month navigation logic, so extending it is minimal effort and keeps the codebase DRY.

### Decision: State Management

**Choice**: Use `useState` with localStorage persistence via `useEffect` for the selected period.

**Alternatives considered**:
- Use a React Context for period state
- Use TanStack Query for server state (not appropriate - this is client preference, not server data)
- Use URL search params (would cause unnecessary re-renders and isn't appropriate for UI preferences)

**Rationale**: localStorage is already used extensively in this codebase (auth tokens, activeBoardId). The pattern is familiar and works well for user preferences that should persist across sessions. The data is simple (year-month string) so no complex state management needed.

### Decision: Period Filtering in useMemo

**Choice**: Modify the existing `dashboardMovements` useMemo to filter based on the `selectedMonth` state instead of `new Date()`.

**Alternatives considered**:
- Create a separate filtered movements variable
- Filter at the API level (not possible - API returns all data, filtering is client-side)

**Rationale**: The existing useMemo already filters movements. Changing the filter logic from hardcoded current month to selected month is a minimal, surgical change. It keeps all movement filtering logic in one place.

### Decision: Navigation Boundaries

**Choice**: Allow navigation within ±12 months from the current month, with disabled buttons at boundaries.

**Alternatives considered**:
- Unlimited navigation (could lead to performance issues with large datasets)
- Only allow past months (users often want to plan for future months)

**Rationale**: ±12 months provides a full year of historical data plus the current month forward, which covers most use cases. Using disabled buttons (rather than hiding) provides clear affordance that navigation is limited.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard                                │
│  ┌──────────────────┐    ┌────────────────────────────────────┐  │
│  │ MonthYearSelector│───▶│ selectedMonth: dayjs (state)      │  │
│  │   (Calendar)    │    │ - localStorage persistence        │  │
│  └──────────────────┘    └─────────────────┬──────────────────┘  │
│                                            │                    │
│                                            ▼                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ dashboardMovements = useMemo(() => {                     │  │
│  │   movements.filter(m =>                                  │  │
│  │     m.date.getFullYear() === selectedMonth.year() &&     │  │
│  │     m.date.getMonth() === selectedMonth.month()         │  │
│  │   )                                                      │  │
│  │ }, [movements, selectedMonth])                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/webapp/src/components/ui/calendar.tsx` | Modify | Add `mode="month"` prop support to show simplified month-only view |
| `apps/webapp/src/routes/index.tsx` | Modify | Add `selectedMonth` state, localStorage persistence, update `dashboardMovements` filter, add selector UI to dashboard header |
| `apps/webapp/src/lib/storage.ts` | Create | Shared utilities for localStorage period persistence |

## Interfaces / Contracts

### Calendar Component Props Extension

```typescript
// apps/webapp/src/components/ui/calendar.tsx

export interface CalendarProps {
  mode?: 'single' | 'month';  // NEW: 'month' mode for simplified view
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  className?: string;
  disabled?: (date: Date) => boolean;  // NEW: for boundary checks
}
```

### Period Storage Utilities

```typescript
// apps/webapp/src/lib/storage.ts

const DASHBOARD_PERIOD_KEY = 'dashboardPeriod';

function getDashboardPeriod(): dayjs.Dayjs {
  const stored = localStorage.getItem(DASHBOARD_PERIOD_KEY);
  if (stored) {
    const parsed = dayjs(stored, 'YYYY-MM');
    if (parsed.isValid()) return parsed;
  }
  return dayjs();
}

function setDashboardPeriod(date: dayjs.Dayjs): void {
  localStorage.setItem(DASHBOARD_PERIOD_KEY, date.format('YYYY-MM'));
}
```

### Dashboard State Addition

```typescript
// apps/webapp/src/routes/index.tsx

// Add to existing state declarations
const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(() => 
  getDashboardPeriod()
);

// Persist to localStorage when changed
useEffect(() => {
  setDashboardPeriod(selectedMonth);
}, [selectedMonth]);

// Navigation boundary helpers
const canGoPrev = selectedMonth.isAfter(dayjs().subtract(12, 'month'), 'month');
const canGoNext = selectedMonth.isBefore(dayjs().add(12, 'month'), 'month');

// Handler functions
function handlePrevMonth() {
  if (canGoPrev) setSelectedMonth(prev => prev.subtract(1, 'month'));
}

function handleNextMonth() {
  if (canGoNext) setSelectedMonth(prev => prev.add(1, 'month'));
}
```

### Modified dashboardMovements Filter

```typescript
// Replace the existing useMemo (lines 753-760)

const dashboardMovements = useMemo(() => {
  const year = selectedMonth.year();
  const month = selectedMonth.month();
  return movements.filter(
    (movement) =>
      movement.date.getFullYear() === year &&
      movement.date.getMonth() === month,
  );
}, [movements, selectedMonth]);
```

### UI Placement

The month selector should be added in the dashboard header, replacing the current board name display or positioned immediately after it. The specs indicate it should display in Spanish locale format (e.g., "Enero 2026"):

```tsx
// In the dashboard view, after board name and before summary section
<div className="flex items-center justify-between mb-6">
  <p className="text-lg font-semibold tracking-tight text-slate-900">
    {data.board.name}
  </p>
  {/* NEW: Month selector */}
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={handlePrevMonth}
      disabled={!canGoPrev}
      className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <span className="text-sm font-medium min-w-[100px] text-center">
      {selectedMonth.format('MMMM YYYY')}
    </span>
    <button
      type="button"
      onClick={handleNextMonth}
      disabled={!canGoNext}
      className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
</div>
```

Note: The existing Calendar component uses a different UI style (larger buttons), so using a simpler inline selector in the header is more appropriate for the dashboard context and matches the segmented button style used in the stats view.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getDashboardPeriod`, `setDashboardPeriod` functions | Direct function calls with mocked localStorage |
| Unit | `dashboardMovements` filtering logic | Test with known movements and month combinations |
| Unit | Navigation boundary logic | Test canGoPrev/canGoNext with edge dates |
| Integration | Full period selection flow | React Testing Library with user interactions |
| E2E | Month navigation end-to-end | Playwright: navigate months, verify movements update |

## Migration / Rollout

No migration required. This is a purely frontend change with no database impact:
- localStorage defaults to current month if no stored value exists
- New state is additive - existing functionality continues to work
- Can be released in a single deploy

## Open Questions

- [ ] Should the selector use the full Calendar component in month mode, or the simpler inline buttons shown above? The specs mention "Calendar Component Month Mode" but the inline approach may be more appropriate for the dashboard header. Recommendation: Start with inline buttons for simplicity; can extend Calendar later if needed.
- [ ] Should `statsPeriod` also persist to localStorage for consistency? Currently it resets on page reload. This is out of scope per the proposal but could be a future enhancement.
