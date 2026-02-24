## Exploration: Hono Wide-Logger Integration

### Current State

The Maimoni API is a Hono-based HTTP service using:
- **Factory-pattern auth middleware** (`apps/api/src/middleware/auth.ts`) with dependency injection for testing
- **UserContext** type defining `Variables: { userId: string }` for Hono context
- **Route-based architecture** with factory functions per domain (boards, expenses, incomes, etc.)
- **Minimal logging**: Only one `console.error` in `apps/api/src/routes/scan.ts:61`
- **No existing observability infrastructure** - no loggers, tracing, or monitoring tools

### Affected Areas

| File | Impact | Notes |
|------|--------|-------|
| `apps/api/package.json` | Add dependency | Install `hono-wide-logger` |
| `apps/api/src/index.ts` | Add middleware | Mount wide-logger before auth middleware |
| `apps/api/src/middleware/auth.ts` | Extend UserContext | Add wide-logger variables to context type |
| `apps/api/src/middleware/index.ts` | Export types | Re-export extended UserContext |
| `apps/api/src/routes/*.ts` | Replace console.error | Use `c.get('wide-logger')` for logging |
| `apps/api/src/routes/scan.ts` | Replace logging | Line 61: `console.error` → wide-logger |

### Approaches

#### 1. **Minimal Integration** — Mount and use
Install package, add middleware to `index.ts`, replace console.error with wide-logger.

- **Pros**: Simple, immediate value, follows package docs
- **Cons**: No custom context enrichment, limited business context
- **Effort**: Low

#### 2. **Auth Integration** — Link user context
Extend UserContext to include wide-logger types, set user context in auth middleware after verification.

- **Pros**: User tracking per request, leverages existing auth flow
- **Cons**: Requires type augmentation, slightly more complex
- **Effort**: Medium

#### 3. **Full Observability** — Business context + sampling
Add board/transaction context to routes, implement custom sampling rules, integrate with core domain events.

- **Pros**: Rich business observability, smart sampling (5xx, >2s, 5% normal)
- **Cons**: More invasive changes, needs careful testing
- **Effort**: Medium-High

### Recommendation

**Approach 2 (Auth Integration)** with optional expansion to Approach 3.

Rationale:
- The auth middleware already extracts `userId` - this maps perfectly to wide-logger's user context
- Factory pattern in auth.ts makes testing with wide-logger straightforward
- Type-safe integration via Hono's context variables
- No breaking changes to existing routes

### Integration Points

1. **Package Installation**
   ```bash
   cd apps/api && bun add hono-wide-logger
   ```

2. **Type Augmentation** (`apps/api/src/middleware/auth.ts`)
   ```typescript
   import type { WideLoggerVariables } from 'hono-wide-logger'
   
   export type UserContext = {
     Variables: {
       userId: string
     } & WideLoggerVariables
   }
   ```

3. **Middleware Mounting** (`apps/api/src/index.ts`)
   ```typescript
   import { wideLogger } from 'hono-wide-logger'
   
   // Mount BEFORE auth to capture full request lifecycle
   app.use('/api/*', wideLogger())
   app.use('/api/*', authMiddleware)
   ```

4. **Auth Integration** (`apps/api/src/middleware/auth.ts`)
   ```typescript
   // After successful verification
   c.set('userId', verified.subject.properties.id)
   
   // Set wide-logger user context
   const logger = c.get('wide-logger')
   logger.setUser({ id: verified.subject.properties.id })
   ```

5. **Route Usage** (`apps/api/src/routes/scan.ts`)
   ```typescript
   const logger = c.get('wide-logger')
   logger.error('Receipt scan failed', { error: error.message })
   ```

### Risks

1. **Sampling behavior**: Wide-logger samples 5% of normal traffic - ensure this aligns with debugging needs
2. **Performance**: Logging middleware adds overhead - verify with load tests
3. **TypeScript conflicts**: Context variable name collisions if other middleware uses 'wide-logger'
4. **Test compatibility**: Factory-based auth tests need wide-logger mock or real middleware
5. **AWS Lambda**: Ensure wide-logger works with `hono/aws-lambda` handler

### Ready for Proposal

**Yes** — All integration points identified, codebase architecture compatible, minimal blockers.

**What the orchestrator should tell the user:**
- The integration is straightforward with the factory-pattern middleware
- Need to decide on sampling configuration (use defaults or customize?)
- Should we add business context (boardId, transaction types) to logs?
- Any preference for log destination (stdout, CloudWatch, external service)?
