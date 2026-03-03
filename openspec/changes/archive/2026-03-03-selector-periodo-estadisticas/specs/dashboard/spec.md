# Delta for Dashboard - Stats Period Selector

## ADDED Requirements

### Requirement: Stats Period Month Picker

The system SHALL display a month/year picker in the stats section when the user selects the "month" tab.

The picker MUST:
- Display the currently selected month and year in Spanish locale format (e.g., "Enero 2026")
- Provide previous/next navigation buttons to change the selected month
- Allow navigation within ±12 months from the current month
- Default to the current month on first load
- Operate independently from the dashboard month selector

#### Scenario: User sees current month on stats period initial load

- GIVEN the user opens the dashboard and navigates to stats
- WHEN the page loads with stats period set to "month"
- THEN the picker SHALL display the current month and year
- AND the stats SHALL show data for the current month

#### Scenario: User navigates stats month to previous month

- GIVEN the stats period is set to "month" and displays "Enero 202 the user clicks the6"
- WHEN previous month button in stats picker
- THEN the picker SHALL display "Diciembre 2025"
- AND the stats cards SHALL update to show December 2025 data

#### Scenario: User navigates stats month to next month

- GIVEN the stats period is set to "month" and displays "Enero 2026"
- WHEN the user clicks the next month button in stats picker
- THEN the picker SHALL display "Febrero 2026"
- AND the stats cards SHALL update to show February 2026 data

#### Scenario: Stats month picker reaches navigation limit

- GIVEN the user is at the earliest allowed month (current month - 12 months)
- WHEN the user attempts to navigate to an earlier month
- THEN the previous navigation button SHALL be disabled
- AND clicking it SHALL have no effect

### Requirement: Stats Period Year Picker

The system SHALL display a year-only picker in the stats section when the user selects the "year" tab.

The picker MUST:
- Display the currently selected year (e.g., "2026")
- Provide previous/next navigation buttons to change the selected year
- Allow navigation within ±5 years from the current year
- Default to the current year on first load
- Operate independently from the dashboard month selector

#### Scenario: User sees current year on stats period year tab

- GIVEN the user opens the dashboard and selects "year" tab in stats
- WHEN the stats period renders
- THEN the picker SHALL display the current year
- AND the stats SHALL show data for the current year

#### Scenario: User navigates stats year to previous year

- GIVEN the stats period is set to "year" and displays "2026"
- WHEN the user clicks the previous year button
- THEN the picker SHALL display "2025"
- AND the stats cards SHALL update to show 2025 data

#### Scenario: User navigates stats year to next year

- GIVEN the stats period is set to "year" and displays "2026"
- WHEN the user clicks the next year button
- THEN the picker SHALL display "2027"
- AND the stats cards SHALL update to show 2027 data

### Requirement: Stats Data Filtering by Selected Period

The system SHALL filter stats calculations based on the user-selected period from the month/year or year picker.

The filtering MUST:
- For "month" tab: Display only data matching the selected month and year
- For "year" tab: Display only data matching the selected year
- Update immediately when the user changes the selected period via picker
- Not affect the dashboard month selector when changed

#### Scenario: Stats chart updates when month is changed via picker

- GIVEN the stats period is "month" and displays "Enero 2026"
- WHEN the user navigates to "Febrero 2026"
- THEN the stats chart SHALL display February 2026 data
- AND the total SHALL reflect February 2026 expenses

#### Scenario: Stats chart updates when year is changed via picker

- GIVEN the stats period is "year" and displays "2026"
- WHEN the user navigates to "2025"
- THEN the stats chart SHALL display 2025 data
- AND the total SHALL reflect 2025 expenses

#### Scenario: Stats period picker operates independently from dashboard

- GIVEN the dashboard shows "Marzo 2026" and stats shows "month" with "Enero 2026"
- WHEN the user changes stats month to "Febrero 2026"
- THEN the dashboard selector SHALL still display "Marzo 2026"
- AND the dashboard movements SHALL not be affected

### Requirement: Period Persistence for Stats

The system SHALL persist the selected stats period and selected month/year in localStorage.

The persistence MUST:
- Store the selected period type (month/year)
- Store the selected month and year (for month tab) or just year (for year tab)
- Load stored values on application startup
- Default to current month/year if no stored values exist

#### Scenario: Stats period persists after page refresh

- GIVEN the user has selected "month" tab with "Febrero 2026"
- WHEN the user refreshes the page
- THEN the stats SHALL display "month" tab selected
- AND the picker SHALL display "Febrero 2026"

## MODIFIED Requirements

### Requirement: Stats Period Tabs

(Previously: Week, Month, and Year tabs available)

The stats period tabs SHALL be modified to show only "month" and "year" options.

The tab options SHALL be:
- "month" - for monthly statistics with month/year picker
- "year" - for yearly statistics with year-only picker

#### Scenario: Stats tabs display only month and year

- GIVEN the stats section is rendered
- WHEN the period tabs appear
- THEN only "month" and "year" tabs SHALL be visible
- AND the "week" tab SHALL NOT appear

#### Scenario: Default stats period is month

- GIVEN the user opens the dashboard for the first time
- WHEN the stats section loads
- THEN the "month" tab SHALL be selected by default
- AND the month/year picker SHALL be visible

### Requirement: Stats Calculations Based on Selected Period

(Previously: Stats calculated for current week/month/year based on tabs without picker navigation)

The stats calculations SHALL be modified to use the user-selected month or year from the picker.

For "month" tab:
- Filter expenses to the selected month and year
- Display daily breakdown within that month

For "year" tab:
- Filter expenses to the selected year
- Display monthly breakdown within that year

#### Scenario: Month stats calculate correctly for selected month

- GIVEN the stats period is "month" with "Febrero 2026" selected
- WHEN statsPeriodExpenses calculates
- THEN the total SHALL equal the sum of all February 2026 expenses
- AND the daily labels SHALL be "1", "2", ..., "28" (or appropriate for month)

#### Scenario: Year stats calculate correctly for selected year

- GIVEN the stats period is "year" with "2025" selected
- WHEN statsPeriodExpenses calculates
- THEN the total SHALL equal the sum of all 2025 expenses
- AND the labels SHALL be "Ene", "Feb", ..., "Dic"

## REMOVED Requirements

### Requirement: Stats Week Period Selection

(Reason: Requirements specify removal of week option from stats period selector)

The week option in the stats period tabs SHALL be removed.

Previously:
- Tab options: "week", "month", "year"
- Stats calculated for current week

The new behavior SHALL:
- Remove "week" tab completely
- Default to "month" tab on first load

### Requirement: Stats Week Calculations

(Reason: Week period option being removed)

The week-based calculations in statsPeriodExpenses SHALL be removed.

Previously, the calculation included:
```typescript
if (statsPeriod === 'week') {
  // Calculate current week and previous week totals
}
```

This logic SHALL be removed and only month/year calculations SHALL remain.

## Scenarios Summary

| Scenario | Type | Description |
|----------|------|-------------|
| User sees current month on stats period initial load | Happy Path | Default month picker behavior |
| User navigates stats month to previous month | Happy Path | Month picker backward navigation |
| User navigates stats month to next month | Happy Path | Month picker forward navigation |
| User navigates stats year to previous year | Happy Path | Year picker backward navigation |
| User navigates stats year to next year | Happy Path | Year picker forward navigation |
| Stats month picker reaches navigation limit | Edge Case | Month navigation boundary |
| Stats chart updates when month is changed via picker | Happy Path | Data filtering verification |
| Stats chart updates when year is changed via picker | Happy Path | Year data filtering |
| Stats period picker operates independently from dashboard | Happy Path | State isolation |
| Stats period persists after page refresh | Happy Path | localStorage persistence |
| Stats tabs display only month and year | Happy Path | Tab modification |
| Default stats period is month | Happy Path | Default state |
| Month stats calculate correctly for selected month | Happy Path | Calculation verification |
| Year stats calculate correctly for selected year | Happy Path | Year calculation verification |
