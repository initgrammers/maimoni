# Tasks: Stats Period Selector

## Phase 1: Storage Layer (Foundation)

- [x] 1.1 Add getStatsPeriod() function to apps/webapp/src/lib/storage.ts
- [x] 1.2 Add setStatsPeriod() function to apps/webapp/src/lib/storage.ts

## Phase 2: State Management

- [x] 2.1 Update `Period` type in `apps/webapp/src/routes/index.tsx` to remove `'week'` (keep: `'month' | 'year'`)
- [x] 2.2 Change `statsPeriod` default from `'week'` to `'month'` at line 415
- [x] 2.3 Add `selectedStatsMonth` state with localStorage persistence using `getStatsMonth()` at line ~415
- [x] 2.4 Add `selectedStatsYear` state with localStorage persistence using `getStatsYear()` at line ~415
- [x] 2.5 Add `useEffect` to persist stats period type to localStorage (parallel to line 457-459)

## Phase 3: Navigation Helpers

- [x] 3.1 Add `canGoStatsMonthPrev` helper: check if `selectedStatsMonth.isAfter(dayjs().subtract(12, 'month').startOf('month'))`
- [x] 3.2 Add `canGoStatsMonthNext` helper: check if `selectedStatsMonth.isBefore(dayjs().startOf('month'))`
- [x] 3.3 Add `canGoStatsYearPrev` helper: check if `selectedStatsYear > dayjs().year() - 5`
- [x] 3.4 Add `canGoStatsYearNext` helper: check if `selectedStatsYear < dayjs().year() + 5`
- [x] 3.5 Add `handleStatsMonthPrev()` handler to decrement selectedStatsMonth by 1 month
- [x] 3.6 Add `handleStatsMonthNext()` handler to increment selectedStatsMonth by 1 month
- [x] 3.7 Add `handleStatsYearPrev()` handler to decrement selectedStatsYear by 1
- [x] 3.8 Add `handleStatsYearNext()` handler to increment selectedStatsYear by 1

## Phase 4: Stats Calculations Update

- [x] 4.1 Update `statsPeriodExpenses` useMemo (line ~813) to filter by selected period instead of current date
- [x] 4.2 Remove week-based calculation logic (line ~830) - remove `if (statsPeriod === 'week')` block
- [x] 4.3 Update month filter to use `selectedStatsMonth.year()` and `selectedStatsMonth.month()` for 'month' period
- [x] 4.4 Update year filter to use `selectedStatsYear` for 'year' period
- [x] 4.5 Update `statsPeriodChange` useMemo (line ~950) similarly to use selected period values
- [x] 4.6 Update `statsCategoryBreakdown` useMemo (line ~1136) to filter by selected period
- [x] 4.7 Update `statsPeriodExpenses.summaryLabel` to display period-specific label based on selected period

## Phase 5: UI Implementation

- [x] 5.1 Update stats period tabs to show only 'month' and 'year' options (remove 'week' tab button at line ~1936)
- [x] 5.2 Add month picker UI for 'month' tab: prev/next buttons with month/year display in Spanish locale
- [x] 5.3 Add year picker UI for 'year' tab: prev/next buttons with year display
- [x] 5.4 Apply same button styling as existing dashboard month picker (line ~1830)
- [x] 5.5 Add disabled state styling for navigation buttons at boundaries
- [x] 5.6 Ensure picker only appears when corresponding tab is selected

## Phase 6: Testing & Verification

- [ ] 6.1 Run `bun run check` to verify lint/format compliance
- [ ] 6.2 Test: Verify tabs show only month and year options
- [ ] 6.3 Test: Verify month picker displays current month on load
- [ ] 6.4 Test: Verify year picker displays current year on load
- [ ] 6.5 Test: Navigate month prev/next, verify stats update
- [ ] 6.6 Test: Navigate year prev/next, verify stats update
- [ ] 6.7 Test: Verify navigation buttons disabled at boundaries
- [ ] 6.8 Test: Refresh page, verify stats period persists in localStorage
- [ ] 6.9 Test: Verify dashboard month selector is unaffected when stats period changes

## Phase 7: Cleanup

- [ ] 7.1 Remove any unused imports (dayjs already used, lucide-react icons already used)
- [ ] 7.2 Verify no console errors on period change
