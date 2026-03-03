# Dashboard Specification

This spec covers the dashboard features including sunburst chart visualization and month/year selection.

## Delta: Sunburst Chart

## ADDED Requirements

### Requirement: Sunburst Chart Integration

The system MUST implement a sunburst chart component to replace the current single-ring donut chart for displaying category and subcategory expense breakdown.

The chart SHALL display:
- An outer ring showing parent categories with their aggregated percentages
- An inner ring showing subcategories grouped under their parent category
- A central area displaying the total expense amount

#### Scenario: Sunburst chart displays two-level hierarchy

- GIVEN a user has expenses in multiple categories and subcategories
- WHEN the dashboard statistics are loaded
- THEN the sunburst chart SHALL render with the outer ring showing categories
- AND the inner ring SHALL show subcategories within their parent category segments

#### Scenario: Single category with no subcategories

- GIVEN a user has expenses only in categories without subcategories
- WHEN the dashboard statistics are loaded
- THEN the outer ring SHALL display the category percentage
- AND the inner ring SHALL display "Sin subcategoría" segment(s)

### Requirement: Data Transformation to Hierarchical Structure

The system MUST transform flat expense data into a hierarchical structure suitable for sunburst chart visualization.

The transformation SHALL:
- Group expenses by parent category first
- Within each category, group by subcategory
- Calculate percentage of total for each category
- Calculate percentage of total for each subcategory
- Assign "Sin subcategoría" label to expenses without a subcategory

#### Scenario: Hierarchical data structure is created correctly

- GIVEN the statsCategoryBreakdown data transformation function
- WHEN processing expense data with categories and subcategories
- THEN the output SHALL be an array of parent category objects
- AND each parent category SHALL contain its total percentage
- AND each parent category SHALL contain an array of child subcategories
- AND each child subcategory SHALL contain its individual percentage

#### Scenario: Subcategory with no name is handled

- GIVEN an expense without a subcategory
- WHEN the data transformation occurs
- THEN it SHALL be grouped under its parent category
- AND it SHALL be labeled as "Sin subcategoría"
- AND it SHALL have a percentage calculated relative to the total expense

### Requirement: Chart Component Replacement

The system SHALL replace the existing SVG-based donut chart implementation (lines 1820-1878) with a sunburst chart component.

The new component MUST:
- Accept hierarchical data as props
- Render two concentric rings
- Maintain the current central label showing total expense
- Support hover interactions for tooltips
- Support click interactions for selection

#### Scenario: Sunburst chart renders with correct data

- GIVEN hierarchical expense data is available
- WHEN the statistics section renders
- THEN the sunburst chart component SHALL be displayed
- AND it SHALL show all parent categories in the outer ring
- AND it SHALL show all subcategories in the inner ring
- AND the total expense SHALL be visible in the center

#### Scenario: Empty expense data handling

- GIVEN there are no expenses in the selected period
- WHEN the sunburst chart attempts to render
- THEN it SHALL display an empty state or placeholder
- AND it SHALL NOT throw an error

### Requirement: Percentage Calculation and Display

The system SHALL calculate and display percentages correctly at both hierarchy levels.

The outer ring (categories) MUST show:
- The aggregate percentage of total expenses for that category
- Visual segments proportional to the percentage

The inner ring (subcategories) MUST show:
- Individual percentage of total expenses for that subcategory
- Grouping by parent category

#### Scenario: Category with multiple subcategories shows correct distribution

- GIVEN a category "Alimentación" represents 40% of total expenses
- AND it has subcategories "Supermercados" (20%), "Restaurantes" (10%), and null (10%)
- WHEN the sunburst chart renders
- THEN the outer ring SHALL show "Alimentación 40%"
- AND the inner ring SHALL show three segments: "Supermercados 20%", "Restaurantes 10%", "Sin subcategoría 10%"

#### Scenario: Percentage tooltip displays accurate information

- GIVEN the user hovers over any chart segment
- WHEN the tooltip appears
- THEN it SHALL display the category or subcategory name
- AND it SHALL display the percentage
- AND it SHALL display the monetary amount

### Requirement: Responsive Design and Accessibility

The system SHALL ensure the sunburst chart is responsive and accessible.

The chart MUST:
- Scale appropriately on different screen sizes
- Maintain aspect ratio
- Include ARIA labels for screen readers
- Support keyboard navigation
- Provide sufficient color contrast

#### Scenario: Chart displays correctly on mobile

- GIVEN the user views the dashboard on a mobile device
- WHEN the sunburst chart renders
- THEN it SHALL fit within the available width
- AND all segments SHALL remain visible and distinguishable
- AND text labels SHALL be legible

#### Scenario: Screen reader accessibility

- GIVEN a user is using a screen reader
- WHEN the sunburst chart renders
- THEN it SHALL have appropriate ARIA labels
- AND the screen reader SHALL announce category names and percentages
- AND keyboard navigation SHALL be supported

### Requirement: Chart.js Compatibility and Library Selection

The system SHALL use react-chartjs-sunburst for the sunburst chart implementation.

The implementation SHOULD verify:
- Compatibility with the current Chart.js version
- Proper TypeScript support
- Expected visual output

If react-chartjs-sunburst is not suitable, the system MAY fall back to:
- A manual SVG implementation with two concentric rings
- Another compatible charting library

#### Scenario: Library integration succeeds

- GIVEN react-chartjs-sunburst is installed
- AND it is compatible with the current Chart.js version
- WHEN the component is implemented
- THEN it SHALL render correctly
- AND all features SHALL work as expected

#### Scenario: Library compatibility issues occur

- GIVEN react-chartjs-sunburst has version conflicts or bugs
- WHEN attempting to use the library
- THEN the system SHALL fallback to the SVG implementation
- AND the sunburst chart SHALL still render correctly

## MODIFIED Requirements

### Requirement: Stats Category Breakdown Calculation

(Previously: Calculated flat arrays of categories and subcategories separately)

The statsCategoryBreakdown calculation SHALL be modified to produce a hierarchical data structure instead of separate flat arrays.

The new output structure SHALL be:
```typescript
{
  name: string;           // category name
  percentage: number;     // % of total
  color: string;          // base color
  total: number;          // total amount
  children: {
    name: string;         // subcategory name
    percentage: number;   // % of total
    color: string;        // color variant
    total: number;        // subcategory amount
  }[];
}[]
```

#### Scenario: Modified calculation produces hierarchical output

- GIVEN the existing statsCategoryBreakdown logic at lines 897-1012
- WHEN the calculation is modified
- THEN the output SHALL contain hierarchical data instead of flat arrays
- AND the existing color assignment logic SHALL be preserved
- AND the sorting by amount SHALL be preserved

## REMOVED Requirements

### Requirement: Single-Ring Donut Chart Display

(Reason: Replaced by two-level sunburst chart)

The existing SVG-based donut chart implementation that displays only category-level data in a single ring SHALL be removed.

## Scenarios Summary

| Scenario | Type | Description |
|----------|------|-------------|
| Sunburst chart displays two-level hierarchy | Happy Path | Core functionality verification |
| Hierarchical data structure is created correctly | Happy Path | Data transformation verification |
| Sunburst chart renders with correct data | Happy Path | Component integration |
| Category with multiple subcategories shows correct distribution | Happy Path | Percentage calculation |
| Single category with no subcategories | Edge Case | Empty subcategory handling |
| Subcategory with no name is handled | Edge Case | Null data handling |
| Empty expense data handling | Edge Case | No data scenario |
| Library compatibility issues occur | Edge Case | Fallback behavior |
| Chart displays correctly on mobile | Edge Case | Responsive behavior |
| Screen reader accessibility | Edge Case | A11y compliance |

---

## Delta: Month/Year Selector

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
---

## Delta: Stats Period Selector

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

- GIVEN the stats period is set to "month" and displays "Enero 2026"
- WHEN the user clicks the previous month button in stats picker
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
