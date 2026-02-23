# Design: API Core Screaming Architecture

## Technical Approach

Create `packages/core` as a domain-first package (screaming architecture) with
DDD layering inside each domain. Each domain exposes application use-cases that
accept explicit inputs (including `userId`) and return DTOs without Hono types.
`apps/api` becomes the HTTP adapter layer: parse/validate requests, invoke core
use-cases, and map results to the existing HTTP contracts.

This aligns with specs: domain modules must exist per API domain, DDD layers
must be enforced, adapters must keep route parity, and auth context remains in
`apps/api` only.

## Architecture Decisions

### Decision: Core Package Layout (Screaming + DDD)

**Choice**: Add `packages/core/src` with top-level domain folders matching the
current API surface, each with `domain/`, `application/`, and `infra/`.
**Alternatives considered**: Keep the core under `apps/api/src/core` (in-app
module).
**Rationale**: The proposal targets reuse across apps and non-HTTP runtimes; a
workspace package enforces boundaries and avoids accidental Hono coupling.

### Decision: Dependency Rules (Layering + Cross-Domain)

**Choice**:
- `domain` -> no dependencies on infra or Hono
- `application` -> depends on same-domain `domain` and `shared/application`
- `infra` -> implements `application` ports and depends on `@maimoni/db`
- `apps/api` -> depends on `packages/core` only (adapters)

Cross-domain usage MUST go through `shared/application` ports (e.g., board
access) to avoid direct domain-to-domain coupling.
**Alternatives considered**: Allow direct imports across domain application
layers (boards -> invitations, etc.).
**Rationale**: Enforces a stable dependency direction and prevents cycles as the
number of domains grows.

### Decision: Zod Schema Placement

**Choice**: Keep HTTP request validation in `apps/api` via `zValidator`, but
source DTO schemas from `packages/core/*/application/validators` to avoid
duplicated shapes. Domain invariants live in domain layer (value objects or
guards), not Zod.
**Alternatives considered**: Move all Zod schemas to `apps/api` only, or place
all Zod in `domain`.
**Rationale**: Keeps core reusable and framework-agnostic while reusing DTO
schemas across adapters and tests.

### Decision: Auth Context Boundary

**Choice**: Auth middleware stays in `apps/api`; routes pass `userId` explicitly
to core use-cases as a required input (`actorId`). Core does not parse headers.
**Alternatives considered**: Passing Hono context into core or re-verifying
tokens inside core.
**Rationale**: Avoids adapter leakage and keeps core usable outside HTTP.

### Decision: Database Access and Repositories

**Choice**: Application layer defines repository ports per domain (e.g.,
`IncomeRepository`), infra layer implements them using Drizzle and accepts a DB
client from `apps/api`.
**Alternatives considered**: Direct DB access inside use-cases.
**Rationale**: Keeps application logic independent of Drizzle and makes unit
tests straightforward with in-memory mocks.

### Decision: Hono Integration

**Choice**: `apps/api/src/routes/*` remain the HTTP adapter layer and construct
use-case dependencies using infra factories (e.g., `createIncomeService(db)`).
**Alternatives considered**: Move route registration into core.
**Rationale**: Preserves current server runtime and maintains route parity.

### Decision: SST Infrastructure

**Choice**: No changes to SST Ion modules or deployment wiring. `packages/core`
is a pure TS package consumed by `apps/api` only.
**Alternatives considered**: New worker or separate service for core.
**Rationale**: Out of scope for this change and not required for the refactor.

## Data Flow

### Generic Request Flow

    HTTP Request
         │
         ▼
   apps/api route
    (zValidator)
         │
         ▼
 core application use-case
         │
         ▼
 core infra repository
         │
         ▼
     Drizzle DB
         │
         ▼
   use-case output
         │
         ▼
    HTTP response

### WhatsApp Auth Flow (Existing, No Change)

    User ── WhatsApp ── Twilio ── apps/auth
      │                       │
      │                       ├─ syncUser (DB)
      │                       └─ issue OpenAuth token
      ▼
   apps/webapp uses token ──▶ apps/api
                              (auth middleware verifies token, sets userId)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/core/package.json` | Create | Workspace package metadata + exports |
| `packages/core/src/index.ts` | Create | Re-export domain application APIs |
| `packages/core/src/shared/application/` | Create | Cross-domain ports and services (board access, invitation availability) |
| `packages/core/src/shared/domain/` | Create | Shared value objects (ids, money) as needed |
| `packages/core/src/boards/domain/` | Create | Board entity + access rules |
| `packages/core/src/boards/application/` | Create | Use-cases: update settings, delete board, list boards |
| `packages/core/src/boards/infra/` | Create | Drizzle repositories for boards + members |
| `packages/core/src/invitations/domain/` | Create | Invitation token rules + statuses |
| `packages/core/src/invitations/application/` | Create | Use-cases: create, list, revoke, resolve, accept, decline |
| `packages/core/src/invitations/infra/` | Create | Drizzle invitation repo + readiness check |
| `packages/core/src/incomes/*` | Create | CRUD use-cases + repo |
| `packages/core/src/expenses/*` | Create | CRUD use-cases + repo |
| `packages/core/src/categories/*` | Create | Query use-cases + repo |
| `packages/core/src/dashboard/*` | Create | Aggregate use-case + repo composition |
| `packages/core/src/scan/*` | Create | Use-case for receipt scan using @maimoni/ai |
| `packages/core/src/auth-claim/*` | Create | Use-case wrapping claimAnonymousData |
| `apps/api/src/routes/*` | Modify | Convert to adapters that call core use-cases |
| `apps/api/src/shared/*` | Modify/Delete | Move helpers + schemas into core |
| `apps/api/src/routes/types.ts` | Modify | Add core dependency factories if needed |
| `apps/api/src/index.ts` | Modify | Wire core adapters and deps |
| `apps/api/src/routes/route-test-utils.ts` | Modify | Provide repo mocks for use-cases |
| `apps/api/src/index.test.ts` | Modify | Update imports/paths |

## Interfaces / Contracts

```ts
// packages/core/src/boards/application/ports.ts
export type BoardAccess = {
  boardId: string
  role: 'owner' | 'editor' | 'viewer'
}

export type BoardRepository = {
  findById(id: string): Promise<Board | null>
  listByUser(userId: string): Promise<BoardSummary[]>
  softDelete(id: string): Promise<{ id: string } | null>
  updateSettings(id: string, input: BoardSettingsInput): Promise<Board>
}

// packages/core/src/incomes/application/use-cases.ts
export type CreateIncomeInput = {
  actorId: string
  boardId: string
  amount: string
  categoryId: string
  note?: string
  date?: string
}

export type CreateIncome = (input: CreateIncomeInput) => Promise<IncomeDto>
```

```ts
// packages/core/src/shared/application/board-access.ts
export type BoardAccessService = {
  getUserBoardRole(input: { userId: string; boardId: string }): Promise<BoardAccess | null>
  getOrSelectAccessibleBoard(input: { userId: string; requestedBoardId?: string }): Promise<{ board: Board; role: BoardAccessRole } | null>
}
```

```ts
// apps/api/src/routes/incomes.ts (adapter usage)
router.post('/incomes', zValidator('json', incomeSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const result = await createIncome({ ...body, actorId: userId })
  return c.json(result)
})
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Core use-cases | Stub repositories, assert business rules and errors |
| Integration | Core infra repos | Run against test DB using existing testcontainers setup |
| Integration | Hono adapters | Keep route tests, verify HTTP parity + auth enforcement |
| E2E | No change | Existing Playwright suite remains unchanged |

## Migration / Rollout

1. Create `packages/core` skeleton and shared ports (board access, invitation
   availability).
2. Move `apps/api/src/shared/*` into `packages/core` (`boards` and
   `invitations` domains), keeping exports for temporary backward compatibility.
3. Refactor one route group at a time to use core use-cases:
   - categories -> expenses -> incomes -> boards -> invitations -> dashboard
   - scan + auth-claim last (external dependency + db helper)
4. Update tests per domain after each migration step; keep mixed route state
   functional as per spec.
5. Remove legacy `apps/api/src/shared/*` once all routes consume core.

## Open Questions

- [ ] Do we want `shared/application` to be the only cross-domain dependency,
      or allow limited `domain-x/application` imports with explicit guardrails?
