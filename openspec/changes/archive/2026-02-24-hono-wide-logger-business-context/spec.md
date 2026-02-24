# Delta: Logging - Business Context Enhancement

## Purpose

Extend the existing wide-logger integration to capture business-specific context (endpoint names, entity types, actions, and IDs) across all API routes. This enables powerful debugging, audit trails, and analytics queries based on business operations rather than just technical request metadata.

## ADDED Requirements

### Requirement: Business Context Helper Function

The system SHALL provide a type-safe helper function `addBusinessContext()` in `apps/api/src/routes/types.ts` that allows route handlers to add business context to the wide-logger.

The helper function SHALL accept a Hono Context and a BusinessContext object with the following interface:

```typescript
interface BusinessContext {
  endpoint: string;           // Required: endpoint identifier (e.g., 'get_dashboard')
  entityType?: 'board' | 'expense' | 'income' | 'category' | 'invitation' | 'scan' | 'auth';
  action?: 'create' | 'update' | 'delete' | 'list' | 'get' | 'scan' | 'claim';
  boardId?: string;           // UUID of the board when applicable
  entityId?: string;          // UUID of the specific entity (expenseId, incomeId, etc.)
}
```

#### Scenario: Helper function adds context to logger

- GIVEN a route handler with access to Hono Context
- WHEN `addBusinessContext(c, { endpoint: 'get_dashboard', entityType: 'board', action: 'get', boardId: 'uuid' })` is called
- THEN the wide-logger SHALL have the business context added under the 'business' key
- AND subsequent log entries SHALL include `business.endpoint`, `business.entityType`, `business.action`, and `business.boardId`

#### Scenario: Helper handles missing logger gracefully

- GIVEN a route handler where wide-logger is not available (e.g., middleware not mounted)
- WHEN `addBusinessContext()` is called
- THEN the function SHALL NOT throw an error
- AND the function SHALL silently return without adding context

### Requirement: Dashboard Route Business Context

The system SHALL add business context logging to the GET /dashboard endpoint.

#### Scenario: Dashboard endpoint logs business context

- GIVEN an authenticated request to GET /dashboard?boardId=xxx
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'get_dashboard'`
  - `entityType: 'board'`
  - `action: 'get'`
  - `boardId: <from query param>`

### Requirement: Boards Route Business Context

The system SHALL add business context logging to all board management endpoints.

#### Scenario: Update board settings logs business context

- GIVEN an authenticated request to PATCH /boards/:boardId/settings
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'update_board_settings'`
  - `entityType: 'board'`
  - `action: 'update'`
  - `boardId: <from path param>`

#### Scenario: Delete board logs business context

- GIVEN an authenticated request to DELETE /boards/:boardId
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'delete_board'`
  - `entityType: 'board'`
  - `action: 'delete'`
  - `boardId: <from path param>`

### Requirement: Expenses Route Business Context

The system SHALL add business context logging to all expense endpoints.

#### Scenario: Create expense logs business context

- GIVEN an authenticated request to POST /expenses
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'create_expense'`
  - `entityType: 'expense'`
  - `action: 'create'`
  - `boardId: <from request body>`

#### Scenario: Get expense logs business context

- GIVEN an authenticated request to GET /expenses/:expenseId
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'get_expense'`
  - `entityType: 'expense'`
  - `action: 'get'`
  - `entityId: <expenseId from path param>`

#### Scenario: Update expense logs business context

- GIVEN an authenticated request to PATCH /expenses/:expenseId
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'update_expense'`
  - `entityType: 'expense'`
  - `action: 'update'`
  - `entityId: <expenseId from path param>`

#### Scenario: Delete expense logs business context

- GIVEN an authenticated request to DELETE /expenses/:expenseId
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'delete_expense'`
  - `entityType: 'expense'`
  - `action: 'delete'`
  - `entityId: <expenseId from path param>`

#### Scenario: List expenses logs business context

- GIVEN an authenticated request to GET /expenses?boardId=xxx
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'list_expenses'`
  - `entityType: 'expense'`
  - `action: 'list'`
  - `boardId: <from query param>`

### Requirement: Incomes Route Business Context

The system SHALL add business context logging to all income endpoints, following the same pattern as expenses.

#### Scenario: All income endpoints log appropriate context

- GIVEN authenticated requests to any income endpoint (POST/GET/PATCH/DELETE)
- WHEN each route handler executes
- THEN business context SHALL be logged with appropriate:
  - `endpoint: 'create_income' | 'get_income' | 'update_income' | 'delete_income' | 'list_incomes'`
  - `entityType: 'income'`
  - `action: 'create' | 'get' | 'update' | 'delete' | 'list'`
  - `boardId` or `entityId` as applicable

### Requirement: Categories Route Business Context

The system SHALL add business context logging to the categories endpoint.

#### Scenario: List categories logs business context

- GIVEN an authenticated request to GET /categories
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'list_categories'`
  - `entityType: 'category'`
  - `action: 'list'`

### Requirement: Scan Route Business Context

The system SHALL add business context logging to the receipt scan endpoint, enhancing the existing error logging.

#### Scenario: Scan receipt logs business context

- GIVEN an authenticated request to POST /scan
- WHEN the route handler executes
- THEN business context SHALL be logged at the start with:
  - `endpoint: 'scan_receipt'`
  - `entityType: 'scan'`
  - `action: 'scan'`
- AND existing error logging SHALL continue to function

### Requirement: Invitations Route Business Context

The system SHALL add business context logging to all invitation endpoints.

#### Scenario: Create invitation logs business context

- GIVEN an authenticated request to POST /boards/:boardId/invitations
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'create_invitation'`
  - `entityType: 'invitation'`
  - `action: 'create'`
  - `boardId: <from path param>`

#### Scenario: List invitations logs business context

- GIVEN an authenticated request to GET /boards/:boardId/invitations
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'list_invitations'`
  - `entityType: 'invitation'`
  - `action: 'list'`
  - `boardId: <from path param>`

#### Scenario: Revoke invitation logs business context

- GIVEN an authenticated request to POST /invitations/:invitationId/revoke
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'revoke_invitation'`
  - `entityType: 'invitation'`
  - `action: 'delete'`
  - `entityId: <invitationId from path param>`

#### Scenario: Resolve invitation logs business context

- GIVEN a request to GET /invitations/resolve?token=xxx
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'resolve_invitation'`
  - `entityType: 'invitation'`
  - `action: 'get'`

#### Scenario: Accept invitation logs business context

- GIVEN an authenticated request to POST /invitations/accept
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'accept_invitation'`
  - `entityType: 'invitation'`
  - `action: 'update'`

#### Scenario: Decline invitation logs business context

- GIVEN a request to POST /invitations/decline
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'decline_invitation'`
  - `entityType: 'invitation'`
  - `action: 'update'`

### Requirement: Auth Route Business Context

The system SHALL add business context logging to the auth claim endpoint.

#### Scenario: Claim anonymous data logs business context

- GIVEN an authenticated request to POST /auth/claim
- WHEN the route handler executes
- THEN business context SHALL be logged with:
  - `endpoint: 'claim_anonymous_data'`
  - `entityType: 'auth'`
  - `action: 'claim'`

## Constraints

1. **Performance**: Business context logging SHALL add less than 1ms per request
2. **Consistency**: All 8 route files MUST use the same `addBusinessContext()` helper
3. **Naming Convention**: Endpoint names SHALL use snake_case pattern: `{action}_{entity}`
4. **No PII**: Business context SHALL NOT include personal identifiable information (names, emails, phone numbers, amounts)
5. **Type Safety**: The BusinessContext interface SHALL enforce valid values for entityType and action
6. **Graceful Degradation**: If wide-logger is unavailable, route handlers SHALL continue to function

## Non-Functional Requirements

### Requirement: Documentation

The system SHALL document the business context logging pattern in AGENTS.md for future route development.

#### Scenario: New route development

- GIVEN a developer adding a new API route
- WHEN consulting AGENTS.md
- THEN they SHALL find clear instructions on how to add business context logging using `addBusinessContext()`

### Requirement: Test Compatibility

The system SHALL ensure all existing tests continue to pass after adding business context logging.

#### Scenario: Existing tests pass

- GIVEN the existing test suite (132 tests)
- WHEN business context logging is added
- THEN all tests SHALL continue to pass without modification
- AND test execution time SHALL NOT increase by more than 5%
