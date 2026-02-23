# Proposal: API Routes Split

## Intent

Split the monolithic `apps/api/src/index.ts` into domain routers and shared helper modules to improve maintainability, keep auth boundaries explicit, and remove the duplicated `POST /api/expenses` handler without changing API behavior.

## Scope

### In Scope
- Create domain routers for dashboard, boards/invitations, incomes, expenses, categories, scan, and auth claim.
- Extract shared helpers (board access, invitations) and Zod schemas into focused modules.
- Centralize DB client creation in a shared module and import it across routers.
- Preserve existing auth middleware boundary and remove the duplicated `POST /api/expenses`.

### Out of Scope
- Service-layer refactor or domain logic redesign.
- Changes to auth token issuance or middleware behavior.
- API contract changes or route renames.

## Approach

Create a top-level `api` router that mounts domain routers under `/api/*` while keeping `authMiddleware` applied at the same boundary (either `app.use('/api/*', authMiddleware)` or `api.use('*', authMiddleware)`), then compose in `apps/api/src/index.ts` and preserve existing `app` and `handler` exports. Move shared helpers and schemas into dedicated modules and have routers import the shared DB client module. During the split, select the intended `POST /api/expenses` implementation and delete the duplicate.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/index.ts` | Modified | Compose routers, keep exports, apply auth at API boundary |
| `apps/api/src/routes/*` | New | Domain routers for API routes |
| `apps/api/src/lib/boards.ts` | New | Shared board access helpers |
| `apps/api/src/lib/invitations.ts` | New | Invitation helper logic |
| `apps/api/src/schemas/*` | New | Zod schema modules for routes |
| `apps/api/src/db.ts` | New | Shared DB client creation |
| `apps/api/src/index.test.ts` | Modified | Keep tests passing with new router layout |
| `apps/api/src/middleware/auth.ts` | Unchanged | Existing middleware boundary preserved |
| `packages/db` | Unchanged | Shared client usage only |
| `packages/utils` | Unchanged | `getEnv` usage continues |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auth middleware accidentally moved or applied twice | Medium | Keep boundary identical and add a focused test to assert auth protection on key routes |
| Choosing the wrong `POST /api/expenses` implementation | Medium | Compare duplicate handlers and select the one referenced by tests/expected behavior |
| Route registration order changes affect tests | Low | Preserve mounting order from the current file and run existing tests |

## Rollback Plan

Revert the change set to restore `apps/api/src/index.ts` monolith and previous route registration. This returns middleware placement and the duplicated handler to the prior state.

## Dependencies

- None (internal refactor only)

## Success Criteria

- [ ] All existing API tests pass with no behavior changes.
- [ ] `apps/api/src/index.ts` only composes routers and exports `app`/`handler`.
- [ ] Auth middleware remains applied at `/api/*` boundary.
- [ ] Only one `POST /api/expenses` handler exists.
