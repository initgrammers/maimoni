# Core Specification

## Purpose

Define the behavioral boundaries for extracting `apps/api` into a reusable
`packages/core` module that screams by domain while enforcing DDD layering and
preserving existing API routes.

## Requirements

### Requirement: Domain-Centric Module Boundaries

The system MUST expose a `packages/core` module organized by domain with
top-level folders matching the current API domains: `dashboard`, `boards`,
`invitations`, `incomes`, `expenses`, `categories`, `scan`, and `auth-claim`.

#### Scenario: Domain modules are discoverable (happy path)

- GIVEN the `packages/core` package exists
- WHEN a developer navigates the package root
- THEN each current API domain folder is present and named after its domain
- AND no domain behavior is required to live under `apps/api/src/routes`

#### Scenario: Missing domain module (edge case)

- GIVEN a route group exists in `apps/api` for one of the current domains
- WHEN `packages/core` lacks the corresponding domain folder
- THEN the refactor is considered incomplete
- AND the missing domain is treated as a migration blocker

### Requirement: DDD Layering Within Each Domain

The system MUST separate domain, application, and infra concerns within every
domain module so that business rules are not coupled to HTTP or database code.

#### Scenario: Application use-case is framework-agnostic (happy path)

- GIVEN an application use-case for a domain
- WHEN the use-case is imported in a non-HTTP runtime
- THEN it executes without requiring Hono types or HTTP-specific utilities

#### Scenario: Domain layer depends on infra (edge case)

- GIVEN a domain module
- WHEN a domain file imports a Drizzle adapter or HTTP construct
- THEN the dependency is treated as a layering violation

### Requirement: API Routes as Adapters

The system MUST keep `apps/api/src/routes/*` as HTTP adapters that translate
requests into core application use-cases and map outcomes to existing HTTP
responses without changing route paths or shapes.

#### Scenario: Route calls core use-case (happy path)

- GIVEN an existing API route under `/api`
- WHEN the handler executes after the refactor
- THEN it invokes a core application use-case
- AND the HTTP response contract matches the pre-refactor behavior

#### Scenario: Core depends on Hono context (edge case)

- GIVEN a core application module
- WHEN it requires Hono context to obtain `userId`
- THEN the dependency is treated as an adapter breach

### Requirement: Auth Context Boundaries

The system MUST keep authentication middleware in `apps/api` and pass only the
resolved `userId` (or equivalent identity) into core use-cases.

#### Scenario: Adapter passes identity explicitly (happy path)

- GIVEN an authenticated request to a protected route
- WHEN the adapter calls a core use-case
- THEN the `userId` is provided as an explicit input to that use-case

#### Scenario: Core attempts to parse auth headers (edge case)

- GIVEN a core use-case execution
- WHEN the use-case attempts to access auth headers or tokens
- THEN the behavior is rejected as outside core responsibilities

### Requirement: Migration Behavior and Route Parity

The system MUST support an incremental, route-group-by-route-group migration
that preserves existing API contracts and keeps un-migrated routes operational
through existing handlers until their domain is moved to core.

#### Scenario: Mixed migration state (happy path)

- GIVEN one domain has been moved to core and another has not
- WHEN both routes are exercised
- THEN both domains remain functional
- AND the migrated domain uses core use-cases while the other uses legacy code

#### Scenario: Route contract changes during migration (edge case)

- GIVEN a migrated route group
- WHEN its request or response shape changes from the pre-migration contract
- THEN the change is treated as a regression to be rolled back
