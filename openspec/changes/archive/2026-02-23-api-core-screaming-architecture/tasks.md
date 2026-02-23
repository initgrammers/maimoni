# Tasks: API Core Screaming Architecture

## Phase 1: Foundation (packages/core + shared ports)

- [x] 1.1 Create `packages/core/package.json` with workspace exports for domain entrypoints and `packages/core/src/index.ts` re-exports.
- [x] 1.2 Add `packages/core/src/shared/application/board-access.ts` and `packages/core/src/shared/application/invitation-availability.ts` ports used across domains.
- [x] 1.3 Add `packages/core/src/shared/domain/` value objects (ids/money/date) used by multiple domains, keeping invariants out of Zod.
- [x] 1.4 Move reusable Zod DTO schemas from `apps/api/src/shared/` into `packages/core/*/application/validators` and re-export from `packages/core/src/index.ts`.
- [x] 1.5 Add initial repository port definitions per domain in `packages/core/*/application/ports.ts` (boards, invitations, incomes, expenses, categories, dashboard, scan, auth-claim).

## Phase 2: Core Domains (packages/core)

- [x] 2.1 Boards domain: add `packages/core/src/boards/domain/` entities/rules, `packages/core/src/boards/application/use-cases.ts`, and `packages/core/src/boards/infra/repository.ts` using Drizzle.
- [x] 2.2 Invitations domain: add `packages/core/src/invitations/domain/` token/status rules, `packages/core/src/invitations/application/use-cases.ts`, and `packages/core/src/invitations/infra/repository.ts` using Drizzle.
- [x] 2.3 Categories domain: add `packages/core/src/categories/application/use-cases.ts` and `packages/core/src/categories/infra/repository.ts` with existing query behavior.
- [x] 2.4 Expenses domain: add `packages/core/src/expenses/domain/` invariants, `packages/core/src/expenses/application/use-cases.ts`, and `packages/core/src/expenses/infra/repository.ts`.
- [x] 2.5 Incomes domain: add `packages/core/src/incomes/domain/` invariants, `packages/core/src/incomes/application/use-cases.ts`, and `packages/core/src/incomes/infra/repository.ts`.
- [x] 2.6 Dashboard domain: add `packages/core/src/dashboard/application/use-cases.ts` and `packages/core/src/dashboard/infra/repository.ts` composing other repos via ports.
- [x] 2.7 Scan domain: add `packages/core/src/scan/application/use-cases.ts` and `packages/core/src/scan/infra/ai-client.ts` wrapping `@maimoni/ai`.
- [x] 2.8 Auth-claim domain: add `packages/core/src/auth-claim/application/use-cases.ts` and `packages/core/src/auth-claim/infra/repository.ts` wrapping existing claim logic.

## Phase 3: HTTP Adapters (apps/api)

- [x] 3.1 Create core dependency factories in `apps/api/src/routes/types.ts` for wiring repo implementations and use-case constructors.
- [x] 3.2 Migrate `apps/api/src/routes/categories.ts` to call core use-cases + validators from `packages/core` (keep route parity).
- [x] 3.3 Migrate `apps/api/src/routes/expenses.ts` to call core use-cases + validators from `packages/core` (keep route parity).
- [x] 3.4 Migrate `apps/api/src/routes/incomes.ts` to call core use-cases + validators from `packages/core` (keep route parity).
- [x] 3.5 Migrate `apps/api/src/routes/boards.ts` and `apps/api/src/routes/invitations.ts` to call core use-cases + shared ports.
- [x] 3.6 Migrate `apps/api/src/routes/dashboard.ts` to call core use-cases with shared board-access service.
- [x] 3.7 Migrate `apps/api/src/routes/scan.ts` and `apps/api/src/routes/auth-claim.ts` to call core use-cases.
- [x] 3.8 Update `apps/api/src/index.ts` to construct core infra repos from DB client and register routes in the same order as before.
- [x] 3.9 Update `apps/api/src/routes/route-test-utils.ts` to provide repo mocks for core use-cases.

## Phase 4: Testing and Verification (apps/api + packages/core)

- [~] 4.1 Add unit tests for core use-cases per domain under `packages/core/src/*/application/*.test.ts` using stubbed repositories. (deferred - API tests cover behavior)
- [~] 4.2 Add integration tests for core infra repositories under `packages/core/src/*/infra/*.test.ts` using existing testcontainers DB setup. (deferred - route tests cover integration)
- [x] 4.3 Update `apps/api/src/index.test.ts` to import new route modules and core validators; keep HTTP parity assertions.
- [x] 4.4 Update `apps/api/src/routes/*.test.ts` to use core DTO schemas and new route wiring; verify auth guard still applied.
- [x] 4.5 Run `bun run test:all` and ensure route parity scenarios from `openspec/changes/api-core-screaming-architecture/specs/core/spec.md` pass.

## Phase 5: Cleanup (apps/api + packages/core)

- [x] 5.1 Remove legacy helpers from `apps/api/src/shared/*` once all routes import core modules. (removed: schemas.ts, invitations.ts, invitations.test.ts)
- [x] 5.2 Remove any temporary re-exports or compatibility shims in `apps/api/src/shared/*` added during migration. (completed)
- [x] 5.3 Verify `apps/api` only imports `packages/core` and no domain logic remains in route handlers beyond adapter code. (verified - only board-access.ts remains as infrastructure adapter)
