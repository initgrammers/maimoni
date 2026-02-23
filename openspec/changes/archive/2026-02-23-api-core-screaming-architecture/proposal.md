# Proposal: api-core-screaming-architecture

## Intent

Split the monolithic `apps/api` Hono app into a reusable `packages/core`
module that screams by domain/use-case (screaming architecture) while keeping
DDD boundaries (domain/application/infra) so business rules live outside HTTP
handlers, enabling reuse and easier testing.

## Scope

### In Scope
- Create `packages/core` that screams by domain (boards, invitations, incomes,
  expenses, categories, scan, dashboard, auth-claim)
- Inside each domain, keep DDD layers: `domain`, `application`, `infra`
- Move shared helpers + domain logic from `apps/api/src/shared` into core
- Refactor `apps/api/src/routes/*` to call core use-cases (Hono adapters)
- Keep auth middleware in `apps/api`, but decouple domain types from Hono
- Update tests to import core use-cases and new module paths

### Out of Scope
- Rewriting persistence (Drizzle) or auth provider behavior
- Reworking `apps/auth`, `apps/webapp`, or infra modules
- Changing API contracts or route paths
- Full DDD modeling of every aggregate (start with existing domains only)

## Approach

Create `packages/core` using screaming architecture at the top level and DDD
inside each domain:

```
packages/core/src/
  boards/
    domain/
    application/
    infra/
  invitations/
    domain/
    application/
    infra/
  incomes/
  expenses/
  categories/
  scan/
  dashboard/
  auth-claim/
  shared/
    domain/
    application/
```

Each domain `domain/` holds entities/value objects + invariants, `application/`
holds use-cases + ports, and `infra/` holds Drizzle-backed adapters.

`apps/api` becomes the HTTP adapter layer:
- `apps/api/src/routes/*` parse HTTP input, call `packages/core/*/application`
  use-cases, and map results/errors to HTTP responses
- Hono routes depend on `packages/core` interfaces, not the other way around
- Auth middleware stays in `apps/api`, providing `userId` to adapters only

### Migration Strategy
1. Move shared helpers + Zod schemas into `packages/core` domain/application
   (start with board access and invitation helpers).
2. Introduce repository interfaces and adapt existing DB logic in infra layer.
3. Refactor one route group at a time (e.g., categories, expenses, incomes).
4. Update tests to target use-cases and keep route tests for HTTP behavior.
5. Remove legacy helpers from `apps/api/src/shared` when coverage is complete.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/core/` | New | DDD layers and repository ports/impls |
| `apps/api/src/index.ts` | Modified | Wire Hono routes to core use-cases |
| `apps/api/src/routes/*` | Modified | Convert handlers to adapters |
| `apps/api/src/shared/*` | Modified/Removed | Move domain helpers + schemas |
| `apps/api/src/middleware/auth.ts` | Modified | Avoid domain coupling to Hono |
| `apps/api/src/routes/route-test-utils.ts` | Modified | Adjust mock DB wiring |
| `apps/api/src/index.test.ts` | Modified | Update imports/path refs |
| `apps/api/src/routes/*.test.ts` | Modified | Update route test imports |
| `apps/auth/` | No Change | Confirm no auth app changes |
| `apps/webapp/` | No Change | No API contract changes expected |
| `packages/db/` | No Change | Reuse existing Drizzle client |
| `packages/ai/` | No Change | No AI pipeline changes |
| `packages/utils/` | No Change | `getEnv` usage unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Circular dependencies across layers | Med | Enforce domain -> application -> infra only |
| Test breakage from path changes | Med | Update tests per route group, keep adapters |
| Auth context type coupling | Med | Keep userId in adapter layer only |
| Zod schema placement mismatch | Med | Separate HTTP validation from domain rules |
| Domain folders drift from use-cases | Low | Keep top-level per use-case and align names |

## Rollback Plan

If a route group regression is found, revert that group to the prior handler
implementation and keep core modules unused. No DB schema changes planned.

## Dependencies

- None beyond existing workspace packages

## Success Criteria

- [ ] `packages/core` exposes use-cases for dashboard, boards/invitations,
  incomes, expenses, categories, scan, auth-claim
- [ ] `apps/api` routes are thin adapters calling core use-cases
- [ ] Existing tests pass with updated imports and paths
- [ ] No API contract changes observed by webapp or auth apps
