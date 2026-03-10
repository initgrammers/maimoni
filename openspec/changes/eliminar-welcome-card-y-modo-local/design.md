# Design: Eliminar Welcome Card y Modo Local

## Technical Approach

Remove the Welcome Card barrier from the dashboard and implement a local-first mode where:
- New users see the dashboard immediately without authentication
- Expenses/incomes are stored in localStorage when operating in anonymous mode
- Categories and scan features use an anonymous JWT token via API
- Login flow migrates local data to the user's board

The approach follows the existing auth-claim pattern already implemented in `packages/core/src/auth-claim` and extends it with localStorage persistence for expenses/incomes.

## Architecture Decisions

### Decision: Anonymous User Creation

**Choice**: Create anonymous user in database on first access and obtain JWT token
**Alternatives considered**: 
- Token-only without DB (no persistence across sessions)
- UUID in localStorage only (would lose access to categories/scan API)
**Rationale**: The existing system already has `claimAnonymousData` in DB. Creating an anonymous user in DB allows:
- Categories and scan API calls work (need valid JWT)
- Data persists if user clears localStorage but has token
- Migration to real user account works via existing `/api/auth/claim` endpoint

### Decision: Local Storage Abstraction Pattern

**Choice**: Create a storage adapter pattern that routes expenses/incomes to localStorage vs API based on presence of `anonymousId`
**Alternatives considered**:
- Duplicate the query logic in the component (spaghetti code)
- Create separate API endpoints for local mode
**Rationale**: Follows the existing DDD pattern in core with repository abstraction. The webapp will have a unified interface (`ExpenseService`, `IncomeService`) that checks for `anonymousId` and routes accordingly.

### Decision: Local Data IDs

**Choice**: Use timestamp + random string format for local expense/income IDs (e.g., `local-{timestamp}-{random}`)
**Alternatives considered**:
- UUID v4 format
- Simple sequential integers
**Rationale**: 
- Avoids conflicts with API-generated UUIDs during migration
- Easy to identify local-only items for migration
- Human-readable format for debugging

### Decision: Toast for Unauthenticated Share

**Choice**: Add auth check before showing share UI, display toast if no accessToken
**Alternatives considered**:
- Allow share but show error on submission
- Redirect to login flow
**Rationale**: Consistent with "frictionless entry" philosophy - user can explore app without login, but sharing requires authentication.

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Start                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Check: accessToken in localStorage?                         │
└─────────────────────────┬───────────────────────────────────┘
                ┌─────────┴─────────┐
                │                   │
               Yes                  No
                │                   │
                ▼                   ▼
┌─────────────────────┐   ┌─────────────────────────────────┐
│ Authenticated Mode  │   │ Check: anonymousId in localStorage│
└─────────┬───────────┘   └────────────────┬──────────────────┘
          │                               │
          │                        ┌───────┴───────┐
          │                        │               │
          │                       Yes              No
          │                        │               │
          │                        ▼               ▼
          │           ┌──────────────────┐  ┌──────────────┐
          │           │   Local Mode     │  │ Create Anon  │
          │           │ (expenses/       │  │ User + Token │
          │           │  incomes in      │  │ via API      │
          │           │  localStorage)   │  └──────┬───────┘
          │           └────────┬─────────┘         │
          │                    │                   │
          └────────────┬───────┘                   │
                       │                           │
                       ▼                           ▼
              ┌─────────────────────────────────────────┐
              │         Dashboard Display               │
              │  - Expenses/Incomes from localStorage   │
              │  - Categories via API (anonymous token) │
              │  - Scan via API (anonymous token)      │
              └─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Login with Local Data                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/auth/claim                                        │
│  - Body: { anonymousId, expenses[], incomes[] }             │
│  - DB: Migrate all data to user's board                     │
│  - Webapp: Clear localStorage, switch to authenticated mode │
└─────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/webapp/src/routes/index.tsx` | Modify | Remove Welcome Card (lines 1558-1601), add local mode detection on load |
| `apps/webapp/src/lib/auth-service.ts` | Create | Unified interface for expenses/incomes that routes to localStorage or API |
| `apps/webapp/src/lib/anonymous.ts` | Create | Anonymous user initialization, token storage, API calls |
| `apps/webapp/src/components/ui/toast.tsx` | Modify | Add toast variant if needed for auth errors |
| `apps/webapp/src/routes/index.tsx` | Modify | Add share button auth check with toast |
| `apps/api/src/routes/auth.ts` | Modify | Add POST /api/auth/anonymous endpoint to create anonymous user |
| `packages/core/src/auth-claim/application/use-cases.ts` | Modify | Accept expenses/incomes array in claim for migration |
| `packages/db/src/core.ts` | Modify | Update `claimAnonymousData` to accept and migrate expense/income data |
| `apps/webapp/src/routes/add.tsx` | Modify | Support local mode for expense/income creation |

## Interfaces / Contracts

### Webapp Storage Service

```typescript
// apps/webapp/src/lib/storage-types.ts
export interface LocalExpense {
  id: string; // format: "local-{timestamp}-{random}"
  amount: string;
  date: string;
  note: string | null;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  subcategoryEmoji: string | null;
}

export interface LocalIncome {
  id: string;
  amount: string;
  date: string;
  note: string | null;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
}
```

### Anonymous Initialization

```typescript
// apps/webapp/src/lib/anonymous.ts
export async function initializeAnonymousUser(): Promise<{
  anonymousId: string;
  token: string;
} | null>

export function getAnonymousToken(): string | null

export function clearAnonymousData(): void
```

### Expense/Income Service Interface

```typescript
// apps/webapp/src/lib/expense-service.ts
export interface ExpenseService {
  list(): Promise<LocalExpense[]>
  create(expense: CreateExpenseInput): Promise<LocalExpense>
  update(id: string, expense: UpdateExpenseInput): Promise<LocalExpense>
  delete(id: string): Promise<void>
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | localStorage adapter functions | Bun test - mock localStorage |
| Unit | Anonymous initialization flow | Bun test - mock fetch |
| Unit | Expense/income service routing logic | Bun test - test mode detection |
| Integration | /api/auth/claim with data migration | API tests with testcontainers |
| E2E | Full local mode flow | Playwright - create expense, refresh, verify persistence |
| E2E | Login with migration | Playwright - create local data, login, verify migration |

## Migration / Rollout

1. **Phase 1**: Create anonymous user creation endpoint (no localStorage yet)
2. **Phase 2**: Add localStorage adapter for expenses/incomes in webapp
3. **Phase 3**: Remove Welcome Card, wire up local mode detection
4. **Phase 4**: Add toast for unauthenticated share attempts
5. **Phase 5**: Test login-with-migration flow

No database migration required - existing `claimAnonymousData` function handles ownership transfer.

## Open Questions

- [ ] Should we show a banner telling users their data is local-only and they should login to save it? (Spec says "Guarda tus datos" warning)
- [ ] How to handle categories in local mode - cache from API or use default set?
- [ ] Should anonymous users have a default board created in DB, or just user record?
