# Tasks: Eliminar Welcome Card y Modo Local

## Phase 1: Infrastructure - Storage Types and Anonymous User Initialization

- [x] 1.1 Create `apps/webapp/src/lib/storage-types.ts` with LocalExpense and LocalIncome interfaces using `local-{timestamp}-{random}` ID format
- [x] 1.2 Create `apps/webapp/src/lib/anonymous.ts` with `initializeAnonymousUser()`, `getAnonymousToken()`, and `clearAnonymousData()` functions
- [x] 1.3 Add POST /api/auth/anonymous endpoint in `apps/api/src/routes/auth.ts` to create anonymous user and return JWT token
- [ ] 1.4 Test anonymous user creation flow manually with curl/Postman

## Phase 2: Storage Abstraction for Expenses/Incomes

- [x] 2.1 Create `apps/webapp/src/lib/expense-service.ts` with LocalExpense CRUD operations using localStorage
- [x] 2.2 Create `apps/webapp/src/lib/income-service.ts` with LocalIncome CRUD operations using localStorage
- [x] 2.3 Implement mode detection: check for `anonymousId` in localStorage to determine local vs API mode
- [ ] 2.4 Write unit tests for localStorage adapter functions (mock localStorage)
- [ ] 2.5 Write unit tests for expense/income service routing logic

## Phase 3: Core Implementation - Dashboard and Login Integration

- [x] 3.1 Remove Welcome Card from `apps/webapp/src/routes/index.tsx` (lines 1558-1601)
- [ ] 3.2 Add local mode detection on app load in `apps/webapp/src/routes/index.tsx`
- [ ] 3.3 Wire up expenses/incomes display to use localStorage in local mode
- [x] 3.4 Modify `packages/core/src/auth-claim/application/use-cases.ts` to accept expenses/incomes array in claim for migration
- [x] 3.5 Update `packages/db/src/core.ts` `claimAnonymousData` function to accept and migrate expense/income data
- [ ] 3.6 Modify `apps/webapp/src/routes/add.tsx` to support local mode for expense/income creation

## Phase 4: Share Button Auth Check

- [ ] 4.1 Add auth check before showing share button UI in board drawer
- [ ] 4.2 Display toast "Debes iniciar sesión para compartir el tablero" when user taps share without accessToken
- [ ] 4.3 Ensure share modal opens normally when user is authenticated

## Phase 5: Integration and E2E Testing

- [ ] 5.1 Test: New user opens app for first time → anonymous user created, dashboard shown
- [ ] 5.2 Test: User opens app with existing anonymousId → local mode activated, data from localStorage
- [ ] 5.3 Test: User creates expense in local mode → stored in localStorage
- [ ] 5.4 Test: User creates income in local mode → stored in localStorage
- [ ] 5.5 Test: User refreshes page in local mode → data persisted across refresh
- [ ] 5.6 Test: Categories load with anonymous token
- [ ] 5.7 Test: Receipt scan works with anonymous token
- [ ] 5.8 Test: User logs in with existing local data → data migrated to user's board
- [ ] 5.9 Test: User tries to share board without session → toast displayed
- [ ] 5.10 Test: User shares board while logged in → modal opens normally
- [ ] 5.11 Run full test suite: `bun run test:all`
- [ ] 5.12 Run lint/format check: `bun run check`

## Phase 6: Cleanup and Documentation

- [ ] 6.1 Remove any temporary debug code
- [ ] 6.2 Update component comments if needed
- [ ] 6.3 Verify no dead code remains
