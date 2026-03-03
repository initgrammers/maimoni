# Proposal: Month/Year Selector for Home Dashboard

## Intent

Users currently cannot view financial data from previous months on the home dashboard—the view only displays the current month. This limits historical analysis and makes it difficult to compare spending patterns. The stats view already has a period selector (week/month/year), but the main dashboard lacks any user-selectable time period.

## Scope

### In Scope
- Add month/year selector to the dashboard view (home page)
- Allow users to filter movements by selected period
- Persist selected period in localStorage for session continuity
- Match existing UI patterns from stats view and calendar component

### Out of Scope
- Year-over-year comparison features
- Custom date range selection
- API changes (frontend-only filtering via existing data)
- Period selector for stats view (already exists)

## Approach

**Option A: Reuse Calendar Component (Recommended)**
- Extend existing calendar component to support month-only mode
- Show current month highlighted, allow prev/next navigation
- Similar UX to the existing calendar but simplified for month selection

**Option B: Custom MonthPicker Component**
- Create simple month/year dropdown with chevron navigation
- Matches stats segmented button style more closely
- Requires new component development

Both approaches work with existing dayjs utilities. Option A is preferred for consistency with existing patterns.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/webapp/src/routes/index.tsx` | Modified | Add `selectedMonth` state, filter `dashboardMovements` by user-selected period |
| `apps/webapp/src/components/ui/calendar.tsx` | Modified | Add `mode="month"` support for simplified month-only view |
| `apps/webapp/src/lib/` | New | Add localStorage persistence for selected period |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing dashboard behavior | Low | Default to current month, preserve existing filtering |
| Performance with large datasets | Low | Frontend filtering only, data already loaded |
| Inconsistent UX with stats view | Medium | Use similar segmented button style or calendar month picker consistently |

## Rollback Plan

1. Revert changes to `index.tsx` to use hardcoded `new Date()` filtering
2. Remove month picker component from `calendar.tsx` 
3. Remove localStorage persistence code
4. No database changes required

## Dependencies

- None (all frontend changes using existing data)
- Requires dayjs (already in project)
- Requires lucide-react icons (already in project)

## Success Criteria

- [ ] User can navigate to any month/year from current month ± 12 months
- [ ] Movements list updates immediately when period changes
- [ ] Selected period persists across page refreshes
- [ ] UI matches existing design language (calendar/styled buttons)
- [ ] No console errors on period change
- [ ] Maintains existing performance (sub-100ms filter updates)
