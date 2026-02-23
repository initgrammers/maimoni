# Design: API Routes Split

## Technical Approach

Split `apps/api/src/index.ts` into domain-specific Hono routers mounted under
`/api`, while keeping a single auth boundary and shared helpers for board
access, invitations, and validation schemas. The entrypoint retains the same
`app` and `handler` exports, and routes preserve request/response behavior. The
duplicate `POST /api/expenses` will be removed by registering exactly one
handler in the expenses router.

## Architecture Decisions

### Decision: Router-per-domain with a central mount

**Choice**: Create `apps/api/src/routes/*` modules that export
`createXRouter(deps)` and mount them via `app.route('/api', router)`.
**Alternatives considered**: Keeping a single monolith file or scattering
routes without a consistent mount point.
**Rationale**: Keeps the `/api` surface identical while isolating domain logic
and reducing merge conflicts. Centralized mounting avoids accidental auth
changes or duplicated middleware.

### Decision: Single auth boundary in entrypoint

**Choice**: Keep `app.use('/api/*', authMiddleware)` in `index.ts` and avoid
per-router auth.
**Alternatives considered**: Applying auth inside each router or per-route.
**Rationale**: Matches existing behavior, guarantees one auth execution per
request, and keeps tests unchanged.

### Decision: Shared helpers module for board access, invitations, and schemas

**Choice**: Move common functions and schemas into `apps/api/src/shared/*`.
**Alternatives considered**: Duplicating helpers inside routers or using a
single utility file for everything.
**Rationale**: Centralizes business rules (board access, invitation readiness,
validation schemas) used by multiple routers while keeping files focused.

### Decision: Resolve duplicate `POST /api/expenses` by single registration

**Choice**: Implement one `router.post('/expenses', ...)` in
`routes/expenses.ts` and remove the duplicate definition from the entrypoint.
**Alternatives considered**: Keeping both handlers or chaining both.
**Rationale**: Prevents double inserts and aligns with the spec requirement to
execute once while preserving response behavior.

### Decision: SST infrastructure unchanged

**Choice**: No infrastructure changes.
**Alternatives considered**: Adjusting SST config or Lambda wiring.
**Rationale**: This is a pure code organization change. The handler export and
route behavior remain the same, so SST wiring does not change.

## Data Flow

Hono routing flow after split:

    client ──→ app (index.ts)
                 │
                 ├─ authMiddleware (/api/*)
                 │
                 └─ app.route('/api', domain routers)
                       ├─ dashboard router
                       ├─ boards/invitations router
                       ├─ incomes router
                       ├─ expenses router
                       ├─ categories router
                       ├─ scan router
                       └─ auth router

Shared helpers:

    router ──→ shared/board-access.ts (role + access checks)
           └─→ shared/invitations.ts (token + schema readiness)
           └─→ shared/schemas.ts (zod schemas)

### WhatsApp Auth Flow (unchanged)

No changes to auth issuance/verification behavior; diagram included per
design rules.

    Webapp ──→ Auth Service (apps/auth)
        │           │
        │           ├─ syncUser + issue token
        │           └─ return access token
        │
        └─→ API (apps/api)
                └─ authMiddleware verifies token

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/index.ts` | Modify | Mount routers, keep auth middleware, export `app` and `handler`. Remove duplicate `POST /api/expenses`. |
| `apps/api/src/routes/index.ts` | Create | Route registration helper that mounts all domain routers. |
| `apps/api/src/routes/dashboard.ts` | Create | `/api/dashboard` handler. |
| `apps/api/src/routes/auth.ts` | Create | `/api/auth/claim` handler. |
| `apps/api/src/routes/boards.ts` | Create | Board settings and delete routes. |
| `apps/api/src/routes/invitations.ts` | Create | Board invitations and invitation actions/resolve. |
| `apps/api/src/routes/incomes.ts` | Create | Incomes CRUD routes. |
| `apps/api/src/routes/expenses.ts` | Create | Expenses CRUD routes with single `POST /api/expenses`. |
| `apps/api/src/routes/categories.ts` | Create | Categories list route. |
| `apps/api/src/routes/scan.ts` | Create | Receipt scan route. |
| `apps/api/src/shared/board-access.ts` | Create | `BoardAccessRole`, `getUserBoardRole`, `getOrSelectAccessibleBoard`, `listUserBoards`. |
| `apps/api/src/shared/invitations.ts` | Create | Invite token helpers and `ensureInvitationsSchemaIsReady`. |
| `apps/api/src/shared/schemas.ts` | Create | Zod schemas for incomes, expenses, boards, invitations. |

## Interfaces / Contracts

```ts
// apps/api/src/routes/index.ts
export type ApiDeps = {
  db: ReturnType<typeof import('@maimoni/db').createClient>
}

export function registerRoutes(
  app: import('hono').Hono<import('../middleware').UserContext>,
  deps: ApiDeps,
) {
  app.route('/api', createDashboardRouter(deps))
  app.route('/api', createAuthRouter(deps))
  app.route('/api', createBoardsRouter(deps))
  app.route('/api', createInvitationsRouter(deps))
  app.route('/api', createIncomesRouter(deps))
  app.route('/api', createExpensesRouter(deps))
  app.route('/api', createCategoriesRouter(deps))
  app.route('/api', createScanRouter(deps))
}
```

```ts
// apps/api/src/routes/expenses.ts
export function createExpensesRouter(deps: ApiDeps) {
  const router = new Hono<UserContext>()
  router.post('/expenses', zValidator('json', expenseSchema), async (c) => {
    // single handler implementation
  })
  return router
}
```

```ts
// apps/api/src/shared/invitations.ts
export function ensureInvitationsSchemaIsReady(
  db: ReturnType<typeof createDbClient>,
): Promise<string | null>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Shared helpers (`board-access`, `invitations`) | Add focused tests if helper logic changes; otherwise rely on existing behavior. |
| Integration | Route behavior and auth boundary | Run existing `apps/api/src/index.test.ts` to ensure endpoints and auth remain consistent. |
| Integration | Scan route | Run existing `apps/api/src/scan.test.ts`. |

## Migration / Rollout

No migration required.

## Open Questions

- [ ] None.
