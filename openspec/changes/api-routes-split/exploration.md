## Exploration: api-routes-split

### Current State
`apps/api/src/index.ts` defines the Hono app, creates the DB client, declares shared helpers and Zod schemas, registers all `/api/*` routes inline, and exports `handler` plus `app`. A single `authMiddleware` is applied via `app.use('/api/*', authMiddleware)` so every route is authenticated. Domain logic is mixed together: dashboard aggregation, boards/invitations, incomes, expenses, scan, categories, and auth claim. Invitation helpers (`ensureInvitationsSchemaIsReady`, token hash helpers) and board access helpers (`getUserBoardRole`, `getOrSelectAccessibleBoard`, `listUserBoards`) live in the same file. There is a duplicated `POST /api/expenses` handler defined twice.

### Affected Areas
- `apps/api/src/index.ts` — monolithic route registration, shared helpers, schemas, exports.
- `apps/api/src/middleware/auth.ts` — middleware remains shared and currently applied at app level.
- `apps/api/src/index.test.ts` — tests likely import `app` and depend on current route paths.

### Approaches
1. **Domain Routers + Shared Helpers** — Split routes into domain routers (e.g., `routes/dashboard.ts`, `routes/boards.ts`, `routes/invitations.ts`, `routes/incomes.ts`, `routes/expenses.ts`, `routes/categories.ts`, `routes/scan.ts`, `routes/auth.ts`). Extract shared helpers into small modules (`lib/boards.ts`, `lib/invitations.ts`, `schemas/*.ts`) and keep DB client creation in a single module imported by routers.
   - Pros: Clear separation by domain, minimal behavioral change, easy to wire with `app.route('/api', api)` or `api.route('/boards', boards)`; keeps auth at router boundary.
   - Cons: Requires creating a few new helper modules and updating imports across routers.
   - Effort: Medium

2. **Service Layer Refactor** — Create service modules for board access, invitations, income/expense CRUD, then have thin route files calling services. Consolidate Zod schemas in a dedicated folder, and define a central `api` app that composes routes.
   - Pros: Improves testability and reuse; cleanest architecture long-term.
   - Cons: Larger refactor; more file churn; higher risk of subtle behavior changes.
   - Effort: High

### Recommendation
Approach 1. It cleanly splits route modules while minimizing behavior changes and keeps current tests and middleware patterns intact. Shared helpers can be moved into focused modules without introducing a full service layer, and the duplicated `POST /api/expenses` can be removed during the split.

### Risks
- Duplicate route definitions (`POST /api/expenses`) may mask logic differences; splitting should choose the intended version and remove the other.
- Shared helpers are used across multiple domains; moving them without consistent imports could break access checks.
- Tests that import `app` may rely on route registration order.

### Ready for Proposal
Yes — propose splitting routes by domain with shared helper modules, preserving `app`/`handler` exports and applying `authMiddleware` at the API router boundary.
