# Proposal: Period Selector for Statistics Page

## Intent

The Statistics page currently lacks flexible period navigation. Users can only switch between week/month/year tabs but cannot specify which specific month or year they want to analyze. This limits the ability to compare financial data across different time periods. The Home dashboard already has month selection implemented, and we should extend similar functionality to the Statistics view with appropriate selectors for each period type.

## Scope

### In Scope
- Remove "week" option from stats period tabs (keep: month | year)
- Add month/year picker when "month" tab is selected (reuses home implementation)
- Add year-only picker when "year" tab is selected
- Update stats calculations to use selected period
- Integrate with existing stats view in `apps/webapp/src/routes/index.tsx`

### Out of Scope
- Week-based period selection (being removed per requirements)
- Custom date range selection
- API changes (frontend filtering only)
- Mobile-specific UI variations

## Approach

**Reuse Existing Home Month Selector Pattern (Recommended)**
- Adapt the `selectedMonth` state and navigation controls from home dashboard
- For "month" tab: Use prev/next month buttons with "MMMM YYYY" display
- For "year" tab: Use prev/next year buttons with "YYYY" display only
- Stats data filtering uses existing dayjs-based logic but with user-selected date

The stats view already has `statsPeriod` state and related calculations. We will:
1. Add `selectedStatsMonth` and `selectedStatsYear` states
2. Add picker UI controls that appear based on current `statsPeriod` value
3. Update `statsPeriodExpenses` and related calculations to use selected period

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/webapp/src/routes/index.tsx` | Modified | Add month/year picker states and UI for stats section |
| `apps/webapp/src/routes/index.tsx` | Modified | Update `statsPeriodExpenses` to filter by selected period |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing stats view | Low | Default to current month/year, preserve existing behavior when week is selected |
| Inconsistent UX with home month picker | Low | Reuse exact same component pattern |
| Performance degradation | Low | Frontend filtering only, data already loaded |

## Rollback Plan

1. Revert `statsPeriod` to default `'week'` 
2. Remove `selectedStatsMonth` and `selectedStatsYear` states
3. Remove picker UI from stats section
4. Revert stats calculations to original week-based logic
5. No database changes required

## Dependencies

- dayjs (already in project)
- lucide-react icons (already in project)
- Existing `selectedMonth` implementation from home (reference pattern)

## Success Criteria

- [ ] Stats tabs show only "month" and "year" options (no "week")
- [ ] Month tab displays month/year picker with prev/next navigation
- [ ] Year tab displays year-only picker with prev/next navigation
- [ ] Stats cards update to show data for selected period
- [ ] Stats chart displays data for selected period
- [ ] UI matches existing design language
- [ ] No console errors on period change
- [ ] Default to current month/year on page load
