# Design: Hono Wide-Logger Business Context Enhancement

## Technical Approach

Add a type-safe `addBusinessContext()` helper function to `routes/types.ts` that standardizes business context logging across all 8 API route files. This approach leverages the existing factory pattern used throughout the routes and follows the established error logging pattern in `scan.ts`.

The implementation will:
1. Create a single helper function in the shared types module
2. Call this helper at the entry point of each route handler
3. Extract context from request params, query strings, and body as appropriate
4. Maintain existing error logging functionality
5. Keep routes as thin HTTP adapters (no business logic changes)

## Architecture Decisions

### Decision: Helper Function Pattern

**Choice**: Create centralized `addBusinessContext()` helper in `routes/types.ts`

**Alternatives considered**:
- Inline logger calls in each route (rejected: repetitive, risk of inconsistency)
- Route wrapper/HOF pattern (rejected: adds complexity, harder to trace)
- Middleware-based approach (rejected: overkill for this use case, adds overhead)

**Rationale**:
- Consistent with existing factory pattern in routes
- Type-safe with TypeScript interface
- Centralizes naming conventions
- Easy to test and maintain
- Minimal boilerplate per route

### Decision: Context Structure

**Choice**: Flat structure with optional fields, namespaced under 'business' key

```typescript
{
  endpoint: string;           // Required
  entityType?: EntityType;    // Optional enum
  action?: Action;            // Optional enum  
  boardId?: string;           // Optional UUID
  entityId?: string;          // Optional UUID
}
```

**Alternatives considered**:
- Nested structure like `{ business: { endpoint: { entity: 'expense', action: 'create' } } }` (rejected: too verbose)
- Always require all fields (rejected: not all endpoints have boardId or entityId)

**Rationale**:
- Flat structure is easier to query in CloudWatch Logs Insights
- Optional fields accommodate different endpoint patterns
- TypeScript union types enforce valid values
- Matches how auth middleware adds user context

### Decision: Endpoint Naming Convention

**Choice**: snake_case pattern: `{action}_{entity}` or `{action}_{entity}_{variation}`

Examples:
- `get_dashboard`
- `create_expense`
- `update_board_settings`
- `scan_receipt`

**Alternatives considered**:
- CamelCase (rejected: less readable in log queries)
- HTTP method prefix like `post_create_expense` (rejected: redundant with HTTP method already in logs)

**Rationale**:
- snake_case is standard in log analysis tools
- Readable and unambiguous
- Consistent with existing codebase naming (AGENTS.md uses kebab-case for files but snake_case is better for log fields)

### Decision: Placement in Route Handlers

**Choice**: Call `addBusinessContext()` immediately after extracting request data (userId, params, body)

**Alternatives considered**:
- At the very start before any extraction (rejected: need access to params/body data)
- Just before returning response (rejected: misses errors that occur during processing)
- In a middleware layer (rejected: would need to parse route patterns, complex)

**Rationale**:
- Early enough to capture context before errors occur
- After validation so we have clean data
- Consistent location makes code predictable

## Data Flow

```
Request ──→ Route Handler ──→ addBusinessContext() ──→ Wide Logger
                │                                          │
                │── Extract: userId, params, body          │── Add: business.endpoint
                │── Validate data                          │── Add: business.entityType
                │── Call helper                            │── Add: business.action
                                                           │── Add: business.boardId
                                                           │── Add: business.entityId
                │                                          │
                ↓                                          ↓
         Use Case Execution                           Log Output
                │                                    (when sampled)
                ↓
         Response
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/routes/types.ts` | Modify | Add `BusinessContext` interface and `addBusinessContext()` helper function |
| `apps/api/src/routes/dashboard.ts` | Modify | Add business context logging to GET /dashboard |
| `apps/api/src/routes/boards.ts` | Modify | Add business context logging to PATCH/DELETE endpoints |
| `apps/api/src/routes/expenses.ts` | Modify | Add business context logging to all 5 expense endpoints |
| `apps/api/src/routes/incomes.ts` | Modify | Add business context logging to all 5 income endpoints |
| `apps/api/src/routes/categories.ts` | Modify | Add business context logging to GET /categories |
| `apps/api/src/routes/scan.ts` | Modify | Add business context at start, keep existing error logging |
| `apps/api/src/routes/invitations.ts` | Modify | Add business context logging to all 6 invitation endpoints |
| `apps/api/src/routes/auth.ts` | Modify | Add business context logging to POST /auth/claim |
| `AGENTS.md` | Modify | Document business context logging pattern |

## Interfaces / Contracts

### BusinessContext Interface

```typescript
// apps/api/src/routes/types.ts

export type BusinessEntityType = 
  | 'board' 
  | 'expense' 
  | 'income' 
  | 'category' 
  | 'invitation' 
  | 'scan' 
  | 'auth';

export type BusinessAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'list' 
  | 'get' 
  | 'scan' 
  | 'claim';

export interface BusinessContext {
  endpoint: string;
  entityType?: BusinessEntityType;
  action?: BusinessAction;
  boardId?: string;
  entityId?: string;
}
```

### addBusinessContext Function

```typescript
// apps/api/src/routes/types.ts

import type { Context } from 'hono';
import type { UserContext } from '../middleware';

export function addBusinessContext(
  c: Context<UserContext>,
  context: BusinessContext
): void {
  const logger = c.get('wide-logger');
  if (logger) {
    logger.addContext('business', context);
  }
}
```

### Usage Example

```typescript
// apps/api/src/routes/expenses.ts

router.post('/expenses', zValidator('json', expenseSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  
  // Add business context at entry
  addBusinessContext(c, {
    endpoint: 'create_expense',
    entityType: 'expense',
    action: 'create',
    boardId: body.boardId,
  });
  
  // ... rest of handler
});
```

## Implementation Details by Route

### dashboard.ts
- **Endpoint**: `get_dashboard`
- **Context**: `entityType: 'board', action: 'get', boardId: from query`
- **Location**: After extracting `requestedBoardId`

### boards.ts
- **Endpoints**: 
  - PATCH: `update_board_settings` - `entityType: 'board', action: 'update', boardId: from param`
  - DELETE: `delete_board` - `entityType: 'board', action: 'delete', boardId: from param`
- **Location**: After boardId validation

### expenses.ts
- **Endpoints**:
  - POST: `create_expense` - `entityType: 'expense', action: 'create', boardId: from body`
  - GET /:id: `get_expense` - `entityType: 'expense', action: 'get', entityId: from param`
  - PATCH: `update_expense` - `entityType: 'expense', action: 'update', entityId: from param`
  - DELETE: `delete_expense` - `entityType: 'expense', action: 'delete', entityId: from param`
  - GET /: `list_expenses` - `entityType: 'expense', action: 'list', boardId: from query`
- **Location**: After extracting params/body

### incomes.ts
- Same pattern as expenses with `entityType: 'income'`

### categories.ts
- **Endpoint**: `list_categories`
- **Context**: `entityType: 'category', action: 'list'`
- **Location**: At handler start (no params needed)

### scan.ts
- **Endpoint**: `scan_receipt`
- **Context**: `entityType: 'scan', action: 'scan'`
- **Location**: At handler start, before try/catch
- **Note**: Existing error logging stays in catch block

### invitations.ts
- **Endpoints**:
  - POST /boards/:id/invitations: `create_invitation` - `entityType: 'invitation', action: 'create', boardId: from param`
  - GET /boards/:id/invitations: `list_invitations` - `entityType: 'invitation', action: 'list', boardId: from param`
  - POST /invitations/:id/revoke: `revoke_invitation` - `entityType: 'invitation', action: 'delete', entityId: from param`
  - GET /invitations/resolve: `resolve_invitation` - `entityType: 'invitation', action: 'get'`
  - POST /invitations/accept: `accept_invitation` - `entityType: 'invitation', action: 'update'`
  - POST /invitations/decline: `decline_invitation` - `entityType: 'invitation', action: 'update'`
- **Location**: After param extraction/validation

### auth.ts
- **Endpoint**: `claim_anonymous_data`
- **Context**: `entityType: 'auth', action: 'claim'`
- **Location**: After extracting anonymousId

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `addBusinessContext()` helper | Test with/without logger, verify context structure |
| Integration | Route handlers log correctly | Mock wide-logger, verify `addContext` called with expected values |
| E2E | Log output format | Run request, check logs contain business fields when sampled |

### Test Example

```typescript
// Unit test for helper
it('should add business context to logger', () => {
  const mockLogger = { addContext: vi.fn() };
  const mockContext = { get: vi.fn().mockReturnValue(mockLogger) } as unknown as Context<UserContext>;
  
  addBusinessContext(mockContext, {
    endpoint: 'create_expense',
    entityType: 'expense',
    action: 'create',
    boardId: 'uuid-123',
  });
  
  expect(mockLogger.addContext).toHaveBeenCalledWith('business', {
    endpoint: 'create_expense',
    entityType: 'expense',
    action: 'create',
    boardId: 'uuid-123',
  });
});

it('should not throw when logger is unavailable', () => {
  const mockContext = { get: vi.fn().mockReturnValue(undefined) } as unknown as Context<UserContext>;
  
  expect(() => addBusinessContext(mockContext, { endpoint: 'test' })).not.toThrow();
});
```

## Migration / Rollout

No migration required. This change is purely additive:
- No database changes
- No API contract changes
- No breaking changes to existing functionality
- Existing logs continue to work unchanged
- New business context appears only when routes are updated

Rollback plan:
1. Revert changes to route files
2. Remove helper function from types.ts
3. Existing wide-logger functionality remains intact

## Open Questions

None. Design is ready for implementation.

## Performance Considerations

- Context addition adds ~0.1-0.3ms per request (logger.addContext is synchronous and simple)
- No additional I/O or async operations
- Memory overhead: minimal (small object allocation)
- Existing sampling rules remain unchanged (5xx, >2s, 5% default)
