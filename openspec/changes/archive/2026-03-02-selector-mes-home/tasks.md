# Tasks: Month/Year Selector for Home Dashboard

## Phase 1: Foundation / Storage Utilities

- [x] 1.1 Create `apps/webapp/src/lib/storage.ts` with `getDashboardPeriod()` and `setDashboardPeriod()` functions following existing localStorage patterns (use `window.localStorage`)
- [x] 1.2 Add unit tests for storage functions in `apps/webapp/src/lib/storage.spec.ts` with mocked localStorage

## Phase 2: Core Implementation - Calendar Component

- [x] 2.1 Extend `CalendarProps` in `apps/webapp/src/components/ui/calendar.tsx` to include `mode?: 'single' | 'month'`
- [x] 2.2 Add conditional rendering in Calendar component to hide day grid when `mode === 'month'`
- [x] 2.3 Add `disabled` prop to CalendarProps for boundary checking
- [x] 2.4 Update Calendar month navigation to respect disabled state

## Phase 3: Core Implementation - Dashboard Integration

- [x] 3.1 Add `selectedMonth` state in `apps/webapp/src/routes/index.tsx` using `useState<dayjs.Dayjs>` initialized with `getDashboardPeriod()`
- [x] 3.2 Add `useEffect` to persist selectedMonth to localStorage when it changes
- [x] 3.3 Create navigation helper functions: `canGoPrev`, `canGoNext`, `handlePrevMonth`, `handleNextMonth` with ±12 month boundaries
- [x] 3.4 Update `dashboardMovements` useMemo (lines 753-760) to filter by `selectedMonth.year()` and `selectedMonth.month()` instead of `new Date()`
- [x] 3.5 Add month selector UI in dashboard header (after board name) with ChevronLeft/ChevronRight buttons and month display

## Phase 4: Testing & Verification

- [ ] 4.1 Write unit test for `dashboardMovements` filtering with known movements and month combinations
- [ ] 4.2 Write unit test for navigation boundary logic (canGoPrev/canGoNext)
- [ ] 4.3 Write integration test for full period selection flow using React Testing Library
- [ ] 4.4 Run existing tests: `bun run --cwd apps/webapp test`
- [ ] 4.5 Run lint/format check: `bun run check`

## Phase 5: Cleanup (if needed)

- [ ] 5.1 Remove any temporary debug code
- [ ] 5.2 Verify no console errors on period change
