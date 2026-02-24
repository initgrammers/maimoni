# Logging Specification

## Purpose

Define behavioral requirements for structured wide-event logging in the Maimoni API using `hono-wide-logger`. This specification establishes observability foundations for audit trails, error tracking, and request visibility in a financial management application.

## Requirements

### Requirement: Wide-Logger Middleware Installation

The system MUST install and configure `hono-wide-logger` as a middleware in the API application to capture structured request logs.

#### Scenario: Middleware successfully mounted (happy path)

- GIVEN the API application is starting
- WHEN `wideLogger()` middleware is mounted in `apps/api/src/index.ts`
- THEN the middleware initializes without errors
- AND the application starts successfully in `sst dev`

#### Scenario: Package installation failure (edge case)

- GIVEN `hono-wide-logger` is not in `apps/api/package.json`
- WHEN the application attempts to import the middleware
- THEN the build fails with a module resolution error
- AND the error message identifies the missing dependency

### Requirement: UserContext Type Extension

The system MUST extend the `UserContext` type to include `WideLoggerVariables` so that route handlers can access the logger via `c.get('wide-logger')`.

#### Scenario: Type-safe logger access (happy path)

- GIVEN `UserContext` is extended with `WideLoggerVariables`
- WHEN a route handler calls `c.get('wide-logger')`
- THEN TypeScript compilation succeeds
- AND the returned object has `addContext()`, `addError()`, and `getEvent()` methods

#### Scenario: Context variable collision (edge case)

- GIVEN another middleware uses the `'wide-logger'` key
- WHEN the application starts
- THEN TypeScript shows a type conflict error
- AND the conflict must be resolved before deployment

### Requirement: Middleware Mounting Order

The system MUST mount `wideLogger()` middleware BEFORE the auth middleware in `apps/api/src/index.ts` to capture the full request lifecycle including auth failures.

#### Scenario: Full request lifecycle captured (happy path)

- GIVEN `wideLogger()` is mounted before auth middleware
- WHEN an unauthenticated request is made
- THEN the log includes request metadata
- AND the log indicates the 401 response from auth failure

#### Scenario: Auth success with user context (happy path)

- GIVEN `wideLogger()` is mounted before auth middleware
- WHEN an authenticated request succeeds
- THEN the log includes the authenticated user ID
- AND the log includes request duration and status code

### Requirement: Authenticated User Context Attachment

The system MUST attach the authenticated user ID to the logger context after successful token verification in the auth middleware.

#### Scenario: User ID attached after successful auth (happy path)

- GIVEN a request with a valid bearer token
- WHEN the auth middleware verifies the token successfully
- THEN the user ID from `verified.subject.properties.id` is set in the logger context
- AND subsequent logs include the `user.id` field

#### Scenario: No user context for failed auth (edge case)

- GIVEN a request with an invalid or missing token
- WHEN the auth middleware returns 401
- THEN the logger context does not contain a user ID
- AND the log still captures the 401 response

### Requirement: Console Logging Replacement

The system MUST replace the existing `console.error` call in `apps/api/src/routes/scan.ts` with structured logging via `c.get('wide-logger').error()`.

#### Scenario: Structured error logging in scan routes (happy path)

- GIVEN the scan route encounters an error
- WHEN the error handler executes
- THEN `c.get('wide-logger').error()` is called with the error object
- AND the log includes error metadata (message, stack trace)
- AND the log includes request context (user ID if authenticated)

#### Scenario: Error context enrichment (happy path)

- GIVEN a scan operation fails with specific error details
- WHEN `c.get('wide-logger').error()` is called
- THEN the log includes the error category
- AND the log includes any additional business context provided

### Requirement: Sampling Behavior

The system MUST use the default sampling rules from `hono-wide-logger`: all 5xx errors, requests over 2 seconds, and 5% of normal traffic.

#### Scenario: 5xx errors always logged (happy path)

- GIVEN a request results in a 5xx status code
- WHEN the response is sent
- THEN a log entry is always produced
- AND the log includes the error details and stack trace if available

#### Scenario: Slow requests logged (happy path)

- GIVEN a request takes more than 2000ms to process
- WHEN the response is sent
- THEN a log entry is produced regardless of the 5% sampling
- AND the log includes the actual duration

#### Scenario: Normal traffic sampling (happy path)

- GIVEN a request completes successfully in under 2000ms with 2xx/3xx/4xx status
- WHEN the response is sent
- THEN the log entry is produced with 5% probability
- AND the sampling decision is consistent within the request lifecycle

### Requirement: Test Compatibility

The system MUST maintain compatibility with existing auth middleware tests that use the factory pattern with dependency injection.

#### Scenario: Factory pattern with wide-logger context (happy path)

- GIVEN auth middleware tests create apps with `createAuthMiddleware(mockClient)`
- WHEN the tests execute with wide-logger in the context
- THEN all 9 existing tests pass
- AND the wide-logger mock is properly injected

#### Scenario: Test context isolation (happy path)

- GIVEN multiple test cases create separate app instances
- WHEN each test runs with its own mock logger
- THEN logs from one test do not contaminate another
- AND each test can verify its own log assertions

## Constraints

1. **No Breaking Changes**: The integration must not change existing API route signatures or response formats
2. **Performance**: Logging overhead must not increase p95 latency by more than 5ms for sampled requests
3. **Type Safety**: All logger access must be type-safe via extended `UserContext`
4. **AWS Lambda Compatible**: Must work with `hono/aws-lambda` handler for SST Ion deployment
5. **Development Experience**: Logs should be human-readable in local development (`sst dev`)

## Dependencies

### Runtime Dependencies
- `hono-wide-logger`: ^latest - Wide-event logging middleware for Hono

### Type Dependencies
- `hono-wide-logger` includes TypeScript types for `WideLoggerVariables`

### Existing Dependencies (Required for Integration)
- `apps/api/src/middleware/auth.ts`: Factory-pattern auth middleware for user context attachment
- `apps/api/src/index.ts`: API entry point for middleware mounting
- `apps/api/src/routes/scan.ts`: Contains `console.error` to be replaced
- `apps/api/src/middleware/auth.test.ts`: Existing test suite to maintain

### Infrastructure
- No infrastructure changes required (CloudWatch logs handled by SST Ion/AWS Lambda)

## Non-Functional Requirements

### Requirement: Log Format

The system MUST output logs in JSON format suitable for CloudWatch Logs Insights queries.

#### Scenario: Queryable log structure (happy path)

- GIVEN a log entry is produced
- WHEN viewed in CloudWatch Logs Insights
- THEN fields like `user.id`, `request.path`, `response.status`, and `duration_ms` are queryable

### Requirement: PII Handling

The system MUST NOT log sensitive PII (personally identifiable information) such as phone numbers, email addresses, or financial account numbers.

#### Scenario: Safe user identification (happy path)

- GIVEN a user is authenticated
- WHEN logs are produced
- THEN only the user ID (UUID) is logged
- AND phone numbers or other PII are excluded from logs

### Requirement: Error Sanitization

The system MUST sanitize error details to prevent leaking internal system information.

#### Scenario: Internal errors masked (happy path)

- GIVEN a database connection error occurs
- WHEN the error is logged
- THEN the log includes a sanitized error message
- AND internal connection strings or credentials are not exposed
