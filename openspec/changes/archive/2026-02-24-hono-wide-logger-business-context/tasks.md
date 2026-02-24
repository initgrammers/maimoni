# Tasks: Hono Wide-Logger Business Context Enhancement

## Phase 1: Foundation (Helper Function)

- [x] 1.1 Add `BusinessContext` interface to `apps/api/src/routes/types.ts`
  - Define `BusinessEntityType` union type: 'board' | 'expense' | 'income' | 'category' | 'invitation' | 'scan' | 'auth'
  - Define `BusinessAction` union type: 'create' | 'update' | 'delete' | 'list' | 'get' | 'scan' | 'claim'
  - Define `BusinessContext` interface with fields: endpoint (required), entityType, action, boardId, entityId
  - Estimated: 10 min

- [x] 1.2 Add `addBusinessContext()` helper function to `apps/api/src/routes/types.ts`
  - Import `Context` from 'hono' and `UserContext` from '../middleware'
  - Function signature: `addBusinessContext(c: Context<UserContext>, context: BusinessContext): void`
  - Implementation: Get logger via `c.get('wide-logger')`, call `logger.addContext('business', context)` if logger exists
  - Handle case when logger is undefined (graceful no-op)
  - Export both the interface and function
  - Estimated: 15 min

- [x] 1.3 Verify helper function compiles without errors
  - Run `bun run check` to ensure TypeScript compilation
  - Fix any type errors
  - Estimated: 5 min

## Phase 2: Route Implementation - Dashboard & Boards

- [x] 2.1 Update `apps/api/src/routes/dashboard.ts`
  - Import `addBusinessContext` from './types'
  - Add call in GET /dashboard handler after extracting `requestedBoardId`
  - Context: `{ endpoint: 'get_dashboard', entityType: 'board', action: 'get', boardId: requestedBoardId }`
  - Estimated: 5 min

- [x] 2.2 Update `apps/api/src/routes/boards.ts` - PATCH endpoint
  - Import `addBusinessContext` from './types'
  - Add call after `boardId` validation (line ~21)
  - Context: `{ endpoint: 'update_board_settings', entityType: 'board', action: 'update', boardId: boardIdResult.data }`
  - Estimated: 5 min

- [x] 2.3 Update `apps/api/src/routes/boards.ts` - DELETE endpoint
  - Add call after `boardId` validation (line ~62)
  - Context: `{ endpoint: 'delete_board', entityType: 'board', action: 'delete', boardId: boardIdResult.data }`
  - Estimated: 5 min

## Phase 3: Route Implementation - Expenses

- [x] 3.1 Update `apps/api/src/routes/expenses.ts` - POST endpoint
  - Import `addBusinessContext` from './types'
  - Add call after extracting `body` (line ~25)
  - Context: `{ endpoint: 'create_expense', entityType: 'expense', action: 'create', boardId: body.boardId }`
  - Estimated: 5 min

- [x] 3.2 Update `apps/api/src/routes/expenses.ts` - GET /:expenseId endpoint
  - Add call after `expenseId` validation (line ~54)
  - Context: `{ endpoint: 'get_expense', entityType: 'expense', action: 'get', entityId: expenseIdResult.data }`
  - Estimated: 5 min

- [x] 3.3 Update `apps/api/src/routes/expenses.ts` - PATCH endpoint
  - Add call after `expenseId` validation (line ~86)
  - Context: `{ endpoint: 'update_expense', entityType: 'expense', action: 'update', entityId: expenseIdResult.data }`
  - Estimated: 5 min

- [x] 3.4 Update `apps/api/src/routes/expenses.ts` - DELETE endpoint
  - Add call after `expenseId` validation (line ~121)
  - Context: `{ endpoint: 'delete_expense', entityType: 'expense', action: 'delete', entityId: expenseIdResult.data }`
  - Estimated: 5 min

- [x] 3.5 Update `apps/api/src/routes/expenses.ts` - GET / (list) endpoint
  - Add call after extracting `boardId` (line ~147)
  - Context: `{ endpoint: 'list_expenses', entityType: 'expense', action: 'list', boardId }`
  - Estimated: 5 min

## Phase 4: Route Implementation - Incomes

- [x] 4.1 Update `apps/api/src/routes/incomes.ts` - POST endpoint
  - Import `addBusinessContext` from './types'
  - Context: `{ endpoint: 'create_income', entityType: 'income', action: 'create', boardId: body.boardId }`
  - Estimated: 5 min

- [x] 4.2 Update `apps/api/src/routes/incomes.ts` - GET /:incomeId endpoint
  - Context: `{ endpoint: 'get_income', entityType: 'income', action: 'get', entityId: incomeIdResult.data }`
  - Estimated: 5 min

- [x] 4.3 Update `apps/api/src/routes/incomes.ts` - PATCH endpoint
  - Context: `{ endpoint: 'update_income', entityType: 'income', action: 'update', entityId: incomeIdResult.data }`
  - Estimated: 5 min

- [x] 4.4 Update `apps/api/src/routes/incomes.ts` - DELETE endpoint
  - Context: `{ endpoint: 'delete_income', entityType: 'income', action: 'delete', entityId: incomeIdResult.data }`
  - Estimated: 5 min

- [x] 4.5 Update `apps/api/src/routes/incomes.ts` - GET / (list) endpoint
  - Context: `{ endpoint: 'list_incomes', entityType: 'income', action: 'list', boardId }`
  - Estimated: 5 min

## Phase 5: Route Implementation - Categories, Scan, Auth

- [x] 5.1 Update `apps/api/src/routes/categories.ts`
  - Import `addBusinessContext` from './types'
  - Add call at start of handler (line ~11)
  - Context: `{ endpoint: 'list_categories', entityType: 'category', action: 'list' }`
  - Note: No boardId since categories are global
  - Estimated: 5 min

- [x] 5.2 Update `apps/api/src/routes/scan.ts`
  - Import `addBusinessContext` from './types'
  - Add call at start of handler, before try/catch (line ~13)
  - Context: `{ endpoint: 'scan_receipt', entityType: 'scan', action: 'scan' }`
  - Keep existing error logging in catch block
  - Estimated: 5 min

- [x] 5.3 Update `apps/api/src/routes/auth.ts`
  - Import `addBusinessContext` from './types'
  - Add call after extracting anonymousId (line ~13)
  - Context: `{ endpoint: 'claim_anonymous_data', entityType: 'auth', action: 'claim' }`
  - Estimated: 5 min

## Phase 6: Route Implementation - Invitations

- [x] 6.1 Update `apps/api/src/routes/invitations.ts` - POST /boards/:boardId/invitations
  - Import `addBusinessContext` from './types'
  - Add call after `boardId` validation (line ~29)
  - Context: `{ endpoint: 'create_invitation', entityType: 'invitation', action: 'create', boardId: boardIdResult.data }`
  - Estimated: 5 min

- [x] 6.2 Update `apps/api/src/routes/invitations.ts` - GET /boards/:boardId/invitations
  - Add call after `boardId` validation (line ~74)
  - Context: `{ endpoint: 'list_invitations', entityType: 'invitation', action: 'list', boardId: boardIdResult.data }`
  - Estimated: 5 min

- [x] 6.3 Update `apps/api/src/routes/invitations.ts` - POST /invitations/:invitationId/revoke
  - Add call after `invitationId` validation (line ~103)
  - Context: `{ endpoint: 'revoke_invitation', entityType: 'invitation', action: 'delete', entityId: invitationIdResult.data }`
  - Estimated: 5 min

- [x] 6.4 Update `apps/api/src/routes/invitations.ts` - GET /invitations/resolve
  - Add call at start of handler (line ~156)
  - Context: `{ endpoint: 'resolve_invitation', entityType: 'invitation', action: 'get' }`
  - Estimated: 5 min

- [x] 6.5 Update `apps/api/src/routes/invitations.ts` - POST /invitations/accept
  - Add call at start of handler (line ~187)
  - Context: `{ endpoint: 'accept_invitation', entityType: 'invitation', action: 'update' }`
  - Estimated: 5 min

- [x] 6.6 Update `apps/api/src/routes/invitations.ts` - POST /invitations/decline
  - Add call at start of handler (line ~231)
  - Context: `{ endpoint: 'decline_invitation', entityType: 'invitation', action: 'update' }`
  - Estimated: 5 min

## Phase 7: Testing & Verification

- [x] 7.1 Run type check on all modified files
  - `bun run check` in apps/api
  - Fix any TypeScript errors
  - Estimated: 10 min

- [x] 7.2 Run existing test suite
  - `bun test` in apps/api
  - Verify all 132 tests pass
  - Estimated: 30 sec

- [x] 7.3 Verify no performance regression
  - Check that p95 latency hasn't increased by >5ms
  - Run load test if needed
  - Estimated: 10 min

- [x] 7.4 Manual verification (optional but recommended)
  - Start dev server: `sst dev`
  - Make a few API requests
  - Check logs include business context fields
  - Estimated: 15 min

## Phase 8: Documentation

- [x] 8.1 Update AGENTS.md with business context logging pattern
  - Add section under "Code Style Guidelines" or "Testing Patterns"
  - Document `addBusinessContext()` usage with examples
  - Include naming conventions (endpoint names, entity types, actions)
  - Add reminder to use helper in all new routes
  - Estimated: 15 min

- [x] 8.2 Add inline documentation to helper function (optional)
  - JSDoc comments explaining parameters
  - Usage examples
  - Estimated: 5 min

## Summary

| Phase | Tasks | Estimated Time | Focus |
|-------|-------|----------------|-------|
| Phase 1 | 3 | 30 min | Helper function creation |
| Phase 2 | 3 | 15 min | Dashboard & Boards |
| Phase 3 | 5 | 25 min | Expenses |
| Phase 4 | 5 | 25 min | Incomes |
| Phase 5 | 3 | 15 min | Categories, Scan, Auth |
| Phase 6 | 6 | 30 min | Invitations |
| Phase 7 | 4 | 35 min | Testing & Verification |
| Phase 8 | 2 | 20 min | Documentation |
| **Total** | **31** | **~3 hours** | |

## Implementation Order Recommendation

1. **Start with Phase 1** (Foundation) - Helper function must exist before route updates
2. **Complete Phases 2-6 in any order** - Routes are independent of each other
3. **Suggested order**: Dashboard → Boards → Expenses → Incomes → Categories/Scan/Auth → Invitations
   - This goes from simplest (1 endpoint) to most complex (6 endpoints)
4. **Phase 7 (Testing)** after all routes are updated
5. **Phase 8 (Documentation)** last

## Notes

- All route files already import from './types', so adding the helper import is straightforward
- Each task involves:
  1. Add import: `import { addBusinessContext } from './types'`
  2. Add call: `addBusinessContext(c, { endpoint: '...', entityType: '...', action: '...', ... })`
- Use `boardId` when available from request (body/query/param)
- Use `entityId` when operating on a specific resource by ID (expenseId, incomeId, invitationId)
- Refer to design.md for exact context values per endpoint
