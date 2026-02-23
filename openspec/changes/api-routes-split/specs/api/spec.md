# API Routing Specification

## Purpose

Define expected API behavior while splitting the monolithic API routes into
domain routers and shared modules, preserving all external behavior.

## Requirements

### Requirement: Preserve Existing API Surface

The system MUST expose the same HTTP methods and paths under `/api` as before
the refactor, with responses and status codes unchanged for equivalent inputs.

#### Scenario: Existing route behaves the same

- GIVEN a previously supported `/api` route with a valid request
- WHEN the request is sent after the refactor
- THEN the response status and body match the pre-refactor behavior

#### Scenario: Unknown route remains not found

- GIVEN a request to an unsupported `/api` route
- WHEN the request is sent
- THEN the response is a not found error consistent with prior behavior

### Requirement: Preserve Auth Boundary

The system MUST apply authentication to the same `/api/*` routes as before and
MUST NOT weaken or broaden protection.

#### Scenario: Protected route still requires auth

- GIVEN a protected `/api` route and a request without authorization
- WHEN the request is sent
- THEN the response is an unauthorized error consistent with prior behavior

#### Scenario: Auth applied once per request

- GIVEN a protected `/api` route and a valid authorization token
- WHEN the request is sent
- THEN the request succeeds without duplicate auth side effects

### Requirement: Export App and Handler

The system MUST continue to export the API `app` and `handler` entrypoints with
the same behavior as before the refactor.

#### Scenario: Handler remains usable

- GIVEN a consumer that imports the `handler` export
- WHEN the handler is invoked for an API request
- THEN it routes to the same endpoint behavior as before

#### Scenario: App remains usable

- GIVEN a consumer that imports the `app` export
- WHEN routes are accessed via the app
- THEN responses match the pre-refactor behavior

### Requirement: Preserve Validation Behavior

The system MUST enforce the same request validation rules and error responses
for all API endpoints as before the refactor.

#### Scenario: Required field validation unchanged

- GIVEN a request missing a required field for a validated endpoint
- WHEN the request is sent
- THEN the response is the same validation error as before

#### Scenario: Malformed JSON handling unchanged

- GIVEN a request body with malformed JSON
- WHEN the request is sent to a JSON endpoint
- THEN the response is the same error behavior as before

### Requirement: Resolve Duplicate POST /api/expenses

The system MUST register exactly one `POST /api/expenses` handler and MUST
preserve the intended behavior that existing tests rely on.

#### Scenario: Expense creation works as before

- GIVEN a valid expense payload
- WHEN `POST /api/expenses` is called
- THEN the expense is created with the same response as before

#### Scenario: No duplicate handler execution

- GIVEN a valid expense payload
- WHEN `POST /api/expenses` is called
- THEN the operation is executed only once
