# Delta for Dashboard (Sunburst Chart)

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
