# Design: Hono Wide Logger Integration

## Technical Approach

Integrate `hono-wide-logger` into the Maimoni API to provide structured request logging with user context attachment. The middleware will be mounted before auth to capture full request lifecycles, then enriched with authenticated user IDs after successful token verification.

This approach follows the existing factory pattern used in auth middleware and maintains backward compatibility with the current test suite.

## Architecture Decisions

### Decision: Middleware Mounting Order

**Choice**: Mount `wideLogger()` BEFORE `authMiddleware` in the middleware stack
**Alternatives considered**: Mounting after auth (rejected - would miss auth failures)
**Rationale**: To capture the complete request lifecycle including 401 responses from failed authentication, the wide-logger must initialize before auth processing begins. This ensures all requests are tracked regardless of auth outcome.

### Decision: UserContext Type Extension Strategy

**Choice**: Merge `WideLoggerVariables` into existing `UserContext` type in `apps/api/src/middleware/auth.ts`
**Alternatives considered**: Creating a separate context type (rejected - unnecessary complexity)
**Rationale**: The auth middleware already defines `UserContext` as the source of truth for context types. Extending it maintains a single source of truth and allows type-safe access to both `userId` and `wide-logger` throughout the application.

### Decision: Auth Middleware Enhancement

**Choice**: Add logger context attachment inside `createAuthMiddleware` after successful token verification
**Alternatives considered**: Separate post-auth middleware (rejected - adds unnecessary middleware layer)
**Rationale**: The auth middleware is the single point where user identity is established. Attaching the user ID to the logger context immediately after verification ensures all subsequent logging includes user attribution without requiring additional middleware.

### Decision: Console.error Replacement Strategy

**Choice**: Replace `console.error` in scan routes with `c.get('wide-logger').error()`
**Alternatives considered**: Creating a wrapper function (rejected - direct access is clearer)
**Rationale**: Direct access via context getter is explicit and type-safe. The error object will include request context (userId) automatically due to prior context attachment in auth middleware.

### Decision: Sampling Configuration

**Choice**: Use default `hono-wide-logger` sampling rules (all 5xx, >2s, 5% normal)
**Alternatives considered**: Custom sampling configuration (rejected - defaults are appropriate)
**Rationale**: The default configuration provides good observability coverage for error states and slow requests while keeping log volume manageable in production.

## Data Flow

```
Request Lifecycle with Wide Logger Integration

┌─────────────────────────────────────────────────────────────┐
│ 1. ENTRY POINT                                              │
│    apps/api/src/index.ts                                    │
│    ├─ Initialize Hono app with ExtendedUserContext          │
│    ├─ Mount wideLogger() middleware FIRST                   │
│    └─ Mount authMiddleware SECOND                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. WIDE LOGGER INITIALIZATION                               │
│    hono-wide-logger middleware                              │
│    ├─ Initialize request timer                              │
│    ├─ Create logger instance attached to context            │
│    └─ Set c.set('wide-logger', logger)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AUTHENTICATION                                           │
│    createAuthMiddleware                                     │
│    ├─ Extract bearer token                                  │
│    ├─ Verify token with authClient                          │
│    ├─ IF valid:                                             │
│    │   ├─ c.set('userId', verified.subject.properties.id)  │
│    │   └─ c.get('wide-logger').addContext({user: {id}})    │
│    └─ IF invalid: return 401 (still logged by wide-logger) │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ROUTE HANDLER                                            │
│    e.g., apps/api/src/routes/scan.ts                        │
│    ├─ Access userId: c.get('userId')                        │
│    ├─ Access logger: c.get('wide-logger')                   │
│    ├─ On error: logger.error(error)                         │
│    └─ Return response                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. LOG OUTPUT                                               │
│    hono-wide-logger post-processing                         │
│    ├─ Calculate duration_ms                                 │
│    ├─ Apply sampling rules (5xx, >2s, 5%)                  │
│    ├─ Format structured JSON log                            │
│    └─ Output to stdout (CloudWatch in production)          │
└─────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/package.json` | Modify | Add `hono-wide-logger` dependency |
| `apps/api/src/middleware/auth.ts` | Modify | Import `WideLoggerVariables`, extend `UserContext` type to include `wide-logger` variable, attach user context to logger after successful auth |
| `apps/api/src/middleware/index.ts` | Modify | Export extended `UserContext` type |
| `apps/api/src/index.ts` | Modify | Import `wideLogger` middleware, mount before auth middleware |
| `apps/api/src/routes/scan.ts` | Modify | Replace `console.error` with `c.get('wide-logger').error()` |
| `apps/api/src/middleware/auth.test.ts` | Modify | Add mock wide-logger factory for test context, ensure 9 existing tests pass with extended context |

## Interfaces / Contracts

### Extended UserContext Type

```typescript
// apps/api/src/middleware/auth.ts
import type { WideLoggerVariables } from 'hono-wide-logger';

// Extended context merging existing UserContext with WideLoggerVariables
type ExtendedUserContext = {
  Variables: {
    userId: string;
  } & WideLoggerVariables;
};

// Export for use across API
export type UserContext = ExtendedUserContext;
```

### Logger Access in Routes

```typescript
// apps/api/src/routes/scan.ts (example)
router.post('/scan', async (c) => {
  // Access logger via context
  const logger = c.get('wide-logger');
  
  try {
    // ... scan logic ...
  } catch (error) {
    // Structured error logging with context
    logger.error(error);
    return c.json({ error: 'Scan failed' }, 500);
  }
});
```

### Auth Middleware Logger Integration

```typescript
// Inside createAuthMiddleware after successful verification
const userId = verified.subject.properties.id;
c.set('userId', userId);

// Attach user context to logger for subsequent logging
const logger = c.get('wide-logger');
if (logger) {
  logger.addContext({
    user: {
      id: userId
      // PII like phoneNumber is intentionally excluded
    }
  });
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Extended UserContext type compatibility | TypeScript compilation check |
| Unit | Logger context attachment in auth middleware | Mock logger with `addContext` spy, verify called with user ID |
| Unit | Scan route error logging | Mock logger with `error` spy, verify called on exception |
| Integration | Middleware mounting order | Request to `/api/dashboard` without auth, verify 401 is logged |
| Integration | Full request lifecycle with auth | Request with valid token, verify user ID appears in log output |
| E2E | No regression in existing functionality | Run full test suite, verify all 155 tests pass |

### Factory Pattern Testing with Wide Logger

```typescript
// Mock logger factory for tests
function createMockLogger() {
  return {
    addContext: (ctx: Record<string, unknown>) => {},
    addError: (error: Error) => {},
    error: (error: Error) => {},
    getEvent: () => ({}),
  };
}

// Test app factory with mock logger context
function createTestApp(mockClient?: AuthClient, mockLogger = createMockLogger()) {
  const app = new Hono<ExtendedUserContext>();
  
  // Mount mock wide-logger middleware first
  app.use('/api/*', async (c, next) => {
    c.set('wide-logger', mockLogger);
    await next();
  });
  
  // Then mount auth middleware with mock client
  app.use('/api/*', createAuthMiddleware(mockClient));
  
  return app;
}
```

## Migration / Rollout

No migration required. This is a pure addition to observability infrastructure with no breaking changes to:
- API route signatures
- Request/response formats
- Database schema
- Client contracts

## Open Questions

- [ ] Confirm `hono-wide-logger` package version compatibility with Hono 4.11.9
- [ ] Verify AWS Lambda handler compatibility with async middleware initialization

## Component Diagram

```
                    ┌──────────────────────────────────────────┐
                    │         apps/api/src/index.ts            │
                    │  ┌────────────────────────────────────┐  │
                    │  │  const app = new Hono<             │  │
                    │  │    ExtendedUserContext>()          │  │
                    │  └────────────────────────────────────┘  │
                    │                    │                       │
                    │  ┌─────────────────┴─────────────────┐    │
                    │  │   app.use('/api/*', wideLogger()) │    │
                    │  │   app.use('/api/*', authMiddleware)│    │
                    │  └────────────────────────────────────┘   │
                    └──────────────────────────────────────────┘
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           │                             │                             │
           ▼                             ▼                             ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ hono-wide-logger     │    │ apps/api/src/        │    │ apps/api/src/        │
│ middleware           │    │ middleware/auth.ts   │    │ routes/*.ts          │
│                      │    │                      │    │                      │
│ • Initialize timer   │◄───│ • Verify token       │    │ • Business logic     │
│ • Create logger      │    │ • Set userId         │───►│ • c.get('userId')    │
│ • c.set('wide-logger│    │ • c.get('wide-logger)│    │ • c.get('wide-logger│
│                      │    │   .addContext()      │    │   .error() on fail   │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
           │                                                          │
           │                    ┌─────────────────────────────────────┘
           │                    │
           └────────────────────┤
                                ▼
                    ┌──────────────────────┐
                    │ CloudWatch Logs      │
                    │ (via SST Ion/Lambda) │
                    │                      │
                    │ Structured JSON logs │
                    │ Queryable via Insights│
                    └──────────────────────┘
```
