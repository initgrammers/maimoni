# Delta for Dashboard Month/Year Selector

## ADDED Requirements

### Requirement: Month/Year Selector UI

The system SHALL display a month/year selector in the dashboard header that allows users to navigate to different months.

The selector MUST:
- Display the currently selected month and year in Spanish locale format (e.g., "Enero 2026")
- Provide previous/next navigation buttons to change the selected period
- Allow navigation within ±12 months from the current month
- Default to the current month on first load

#### Scenario: User sees current month on initial load

- GIVEN the user opens the dashboard for the first time
- WHEN the page loads
- THEN the selector SHALL display the current month and year
- AND the movements list SHALL show data for the current month

#### Scenario: User navigates to previous month

- GIVEN the dashboard displays January 2026
- WHEN the user clicks the previous month button
- THEN the selector SHALL display "Diciembre 2025"
- AND the movements list SHALL update to show December 2025 data

#### Scenario: User navigates to next month

- GIVEN the dashboard displays January 2026
- WHEN the user clicks the next month button
- THEN the selector SHALL display "Febrero 2026"
- AND the movements list SHALL update to show February 2026 data

#### Scenario: User reaches navigation limit

- GIVEN the user is at the earliest allowed month (current month - 12 months)
- WHEN the user attempts to navigate to an earlier month
- THEN the previous navigation button SHALL be disabled
- AND clicking it SHALL have no effect

#### Scenario: User reaches navigation limit at future boundary

- GIVEN the user is at the latest allowed month (current month + 12 months)
- WHEN the user attempts to navigate to a later month
- THEN the next navigation button SHALL be disabled
- AND clicking it SHALL have no effect

### Requirement: Movement Filtering by Selected Period

The system SHALL filter dashboard movements based on the user-selected month and year.

The filtering MUST:
- Display only movements that match the selected month and year
- Update immediately when the user changes the selected period
- Handle both income and expense movements
- Group movements by date within the selected period

#### Scenario: Dashboard shows only selected month movements

- GIVEN the user has selected "Marzo 2026"
- WHEN the movements list renders
- THEN only movements from March 2026 SHALL be displayed
- AND movements from other months SHALL NOT appear in the list

#### Scenario: Empty state when no movements exist for period

- GIVEN the user selects a month with no movements
- WHEN the dashboard renders
- THEN an empty state message SHALL be displayed
- AND it SHALL indicate no movements were recorded for that period

### Requirement: Period Persistence in localStorage

The system SHALL persist the selected month/year in localStorage to maintain user preference across sessions.

The persistence MUST:
- Store the selected month and year as a string (e.g., "2026-01")
- Load the stored value on application startup
- Update localStorage when the user changes the selected period
- Default to current month if no stored value exists

#### Scenario: Selected period persists after page refresh

- GIVEN the user has selected "Febrero 2026"
- WHEN the user refreshes the page
- THEN the selector SHALL display "Febrero 2026"
- AND the movements list SHALL show February 2026 data

#### Scenario: Default to current month when no stored value

- GIVEN the user has never selected a period before
- WHEN the dashboard loads
- THEN the selector SHALL display the current month
- AND localStorage SHALL be updated with this default value

### Requirement: Calendar Component Month Mode

The system SHALL extend the existing calendar component to support a month-only selection mode.

The month mode MUST:
- Display only month/year header without day grid
- Show current month highlighted
- Allow prev/next month navigation via buttons
- Match existing calendar styling and behavior

#### Scenario: Calendar displays in month mode

- GIVEN the calendar component is rendered with mode="month"
- WHEN the component displays
- THEN only the month/year header SHALL be visible
- AND day cells SHALL NOT be rendered

#### Scenario: Calendar month navigation works in month mode

- GIVEN the calendar is in month mode displaying "Enero 2026"
- WHEN the user clicks the next month button
- THEN the display SHALL update to "Febrero 2026"
- AND no day selection interaction SHALL be available

### Requirement: Integration with Stats Period Selector

The month selector on the main dashboard SHALL operate independently from the stats view period selector.

The independence MUST:
- Allow week/month/year selection in the stats view
- Allow month/year selection on the main dashboard
- Not affect one when the other is changed
- Each SHALL maintain its own state and persistence

#### Scenario: Stats period change does not affect dashboard period

- GIVEN the dashboard shows "Marzo 2026" and stats shows "Esta semana"
- WHEN the user changes stats period to "Este mes"
- THEN the dashboard selector SHALL still display "Marzo 2026"

#### Scenario: Dashboard period change does not affect stats period

- GIVEN the dashboard shows "Marzo 2026" and stats shows "Esta semana"
- WHEN the user changes dashboard period to "Abril 2026"
- THEN the stats selector SHALL still display "Esta semana"

## MODIFIED Requirements

### Requirement: Dashboard Movement Filtering

(Previously: Dashboard filtered movements to current month using hardcoded `new Date()`)

The dashboard movement filtering SHALL be modified to use the user-selected month and year instead of always filtering to the current month.

The modified behavior SHALL:
- Filter movements based on the state from the month/year selector
- Default to the current month on first load
- Update the filtered results when the selector value changes

#### Scenario: Modified filtering uses selected period

- GIVEN the user has selected "Noviembre 2025"
- WHEN the dashboardMovements useMemo recalculates
- THEN movements SHALL be filtered to November 2025
- AND the filter SHALL use the selectedMonth state variable

## REMOVED Requirements

### Requirement: Hardcoded Current Month Filtering

(Reason: Replaced by user-selectable period)

The hardcoded filtering that always shows only the current month SHALL be removed.

Previously:
```typescript
const dashboardMovements = useMemo(() => {
  const now = new Date();
  return movements.filter(
    (movement) =>
      movement.date.getFullYear() === now.getFullYear() &&
      movement.date.getMonth() === now.getMonth(),
  );
}, [movements]);
```

The new implementation SHALL use the selectedMonth state instead of `new Date()`.

## Scenarios Summary

| Scenario | Type | Description |
|----------|------|-------------|
| User sees current month on initial load | Happy Path | Default behavior verification |
| User navigates to previous month | Happy Path | Core navigation functionality |
| User navigates to next month | Happy Path | Forward navigation |
| User reaches navigation limit | Edge Case | Boundary handling |
| User reaches navigation limit at future boundary | Edge Case | Forward boundary handling |
| Dashboard shows only selected month movements | Happy Path | Filtering verification |
| Empty state when no movements exist for period | Edge Case | No-data handling |
| Selected period persists after page refresh | Happy Path | localStorage persistence |
| Default to current month when no stored value | Happy Path | Initial state handling |
| Calendar displays in month mode | Happy Path | New component mode |
| Calendar month navigation works in month mode | Happy Path | Navigation in new mode |
| Stats period change does not affect dashboard period | Happy Path | Independent state verification |
| Dashboard period change does not affect stats period | Happy Path | Independent state verification |
