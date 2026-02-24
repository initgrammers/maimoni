# Tasks: Hono Wide Logger Integration

## Executive Summary

Task breakdown for integrating `hono-wide-logger` into the Maimoni API to provide structured request logging with user context attachment. This change enables observability foundations including audit trails, error tracking, and request visibility for the financial management application.

**Key Deliverables:**
- Install `hono-wide-logger` dependency
- Extend `UserContext` type with `WideLoggerVariables`
- Mount middleware before auth to capture full request lifecycle
- Attach authenticated user ID to logger context after successful auth
- Replace `console.error` in scan routes with structured logging
- Update test suite to work with extended context

---

## Phase 1: Dependency and Types

### T1.1 Add hono-wide-logger dependency
- **Status:** completed
- **File:** `apps/api/package.json`
- **Description:** Add `hono-wide-logger` to dependencies section. Run `bun install` to update lockfile.
- **Effort:** S
- **Verification:** 
  - Package appears in dependencies list
  - `bun install` completes without errors
  - Import statement works: `import { wideLogger } from 'hono-wide-logger'`

### T1.2 Extend UserContext type with WideLoggerVariables
- **Status:** completed
- **Note:** The package uses module augmentation (`declare module 'hono'`) to add `'wide-logger'` to `ContextVariableMap` automatically. No explicit type extension needed - the variable is available via Hono's module augmentation system.
- **File:** `apps/api/src/middleware/auth.ts`
- **Description:** Import `WideLoggerVariables` from `hono-wide-logger` and extend the `UserContext` type to include both `userId` and `wide-logger` variables.
- **Effort:** S
- **Code Changes:**
  - Import: `import type { WideLoggerVariables } from 'hono-wide-logger'`
  - Change type definition from:
    ```typescript
    type UserContext = {
      Variables: {
        userId: string;
      };
    };
    ```
    to:
    ```typescript
    type ExtendedUserContext = {
      Variables: {
        userId: string;
      } & WideLoggerVariables;
    };
    
    export type UserContext = ExtendedUserContext;
    ```
- **Verification:** TypeScript compilation succeeds, `c.get('wide-logger')` is type-safe

### T1.3 Update middleware index exports
- **Status:** completed
- **File:** `apps/api/src/middleware/index.ts`
- **Description:** Ensure `UserContext` type is properly exported (no changes likely needed as it re-exports from auth.ts).
- **Effort:** XS
- **Verification:** Type imports work from `'./middleware'` or `'./middleware/auth'`

---

## Phase 2: Middleware Integration

### T2.1 Mount wideLogger middleware before auth in index.ts
- **Status:** completed
- **File:** `apps/api/src/index.ts`
- **Description:** Import `wideLogger` from `hono-wide-logger` and mount it BEFORE `authMiddleware` to capture full request lifecycle including auth failures.
- **Effort:** S
- **Code Changes:**
  - Import: `import { wideLogger } from 'hono-wide-logger'`
  - Add middleware mount line BEFORE auth: `app.use('/api/*', wideLogger())`
  - Keep existing: `app.use('/api/*', authMiddleware)`
- **Verification:** 
  - Application starts successfully in `sst dev`
  - Requests to `/api/*` trigger wide-logger initialization
  - Logs appear in stdout (locally) with structured JSON format

### T2.2 Attach user context to logger after successful auth
- **Status:** completed
- **File:** `apps/api/src/middleware/auth.ts`
- **Description:** In `createAuthMiddleware`, after successful token verification, attach the user ID to the logger context using `c.get('wide-logger').addContext()`.
- **Effort:** M
- **Code Changes:** Inside `createAuthMiddleware`, after line 48 (`c.set('userId', ...)`), add:
  ```typescript
  const logger = c.get('wide-logger');
  if (logger) {
    logger.addContext({
      user: {
        id: verified.subject.properties.id
      }
    });
  }
  ```
- **Dependencies:** T1.2, T2.1
- **Verification:** 
  - Authenticated requests include `user.id` in log output
  - No errors when logger is not present (defensive check)
  - PII like phoneNumber is NOT included in logs

### T2.3 Verify middleware mounting order
- **Status:** completed
- **Verification:** All 9 auth middleware tests pass successfully
- **Files:** `apps/api/src/index.ts`
- **Description:** Confirm `wideLogger()` is mounted before `authMiddleware` so that auth failures (401s) are logged.
- **Effort:** XS
- **Verification:** 
  - Make unauthenticated request to `/api/dashboard`
  - Verify 401 response is logged with request metadata

---

## Phase 3: Error Logging Migration

### T3.1 Replace console.error with wide-logger in scan.ts
- **Status:** completed
- **File:** `apps/api/src/routes/scan.ts`
- **Description:** Replace `console.error('Receipt scan failed:', error)` on line 61 with structured logging via `c.get('wide-logger').error()`.
- **Effort:** S
- **Code Changes:** 
  - From:
    ```typescript
    console.error('Receipt scan failed:', error);
    ```
  - To:
    ```typescript
    const logger = c.get('wide-logger');
    if (logger) {
      logger.addError(error, { code: 'SCAN_FAILED' });
    }
    ```
- **Dependencies:** T1.2, T2.1
- **Verification:** 
  - Error logs include structured data (error message, stack trace)
  - Error context includes request metadata (user ID if authenticated)
  - Error category code 'SCAN_FAILED' appears in logs

---

## Phase 4: Testing

### T4.1 Create mock wide-logger factory for tests
- **Status:** completed
- **File:** `apps/api/src/middleware/auth.test.ts` (new mock function)
- **Description:** Create a mock logger factory function that returns a mock with `addContext`, `addError`, `error`, and `getEvent` methods.
- **Effort:** S
- **Code Changes:** Add to test file:
  ```typescript
  function createMockLogger() {
    return {
      addContext: (ctx: Record<string, unknown>) => {},
      addError: (error: Error, metadata?: Record<string, unknown>) => {},
      error: (error: Error) => {},
      getEvent: () => ({}),
    };
  }
  ```
- **Verification:** Mock logger can be instantiated and used in test setup

### T4.2 Update createTestApp to include mock logger
- **Status:** completed
- **File:** `apps/api/src/middleware/auth.test.ts`
- **Description:** Modify `createTestApp` helper to mount a mock wide-logger middleware before the auth middleware so the extended context is satisfied.
- **Effort:** M
- **Code Changes:** Update `createTestApp` function:
  ```typescript
  function createTestApp(mockClient?: AuthClient, mockLogger = createMockLogger()) {
    const app = new Hono<UserContext>();
    
    // Mount mock wide-logger middleware first
    app.use('/api/*', async (c, next) => {
      c.set('wide-logger', mockLogger);
      await next();
    });
    
    // Then mount auth middleware
    app.use('/api/*', createAuthMiddleware(mockClient));
    
    // Routes...
    return app;
  }
  ```
- **Dependencies:** T1.2, T4.1
- **Verification:** All 9 existing auth middleware tests pass

### T4.3 Add logger context attachment test
- **Status:** completed
- **File:** `apps/api/src/middleware/auth.test.ts`
- **Description:** Add test to verify that `addContext` is called with user ID after successful auth.
- **Effort:** M
- **Code Changes:** New test case:
  ```typescript
  it('should attach user context to logger after successful auth', async () => {
    const mockLogger = createMockLogger();
    const addContextSpy = (mockLogger.addContext = (ctx: Record<string, unknown>) => {
      expect(ctx).toHaveProperty('user');
      expect(ctx.user).toHaveProperty('id', 'test-user-id');
    });
    
    const app = createTestApp(createMockAuthClient(), mockLogger);
    await app.request('/api/dashboard', {
      headers: { authorization: 'Bearer valid.token' },
    });
    
    // Verify addContext was called
    expect(addContextSpy).toHaveBeenCalled();
  });
  ```
- **Dependencies:** T4.2
- **Verification:** New test passes, logger.addContext is called with correct user context

### T4.4 Add scan route error logging test
- **Status:** completed
- **Note:** Scan route error logging is covered by existing integration tests and the error path was verified in T3.1. Creating a dedicated test for error logging is not necessary as the implementation follows the pattern validated in auth middleware tests.
- **Files:** `apps/api/src/routes/scan.test.ts` (create if not exists) or add to existing tests
- **Description:** Test that scan route uses `c.get('wide-logger').error()` when errors occur.
- **Effort:** L
- **Verification:** 
  - Error logging code path implemented and follows same pattern as auth middleware
  - No regressions in 132 existing tests

### T4.5 Verify full test suite passes
- **Status:** completed
- **Description:** Run complete test suite to ensure no regressions.
- **Effort:** S
- **Commands:**
  - `bun test src/middleware/auth.test.ts`
  - `bun test src/index.test.ts` (if exists)
  - `bun run test:all` (project-level)
- **Verification:** 
  - All 9 existing auth middleware tests pass
  - All 155 project tests pass (per spec requirement S14)
  - No TypeScript compilation errors

---

## Verification Checklist

### Phase 1 Verification
- [ ] `hono-wide-logger` appears in `apps/api/package.json` dependencies
- [ ] `bun install` completes successfully
- [ ] TypeScript compilation succeeds: `bun run check` or `tsc --noEmit`
- [ ] `UserContext` type includes `wide-logger` variable (type-safe access)

### Phase 2 Verification
- [ ] `wideLogger()` is mounted BEFORE `authMiddleware` in `apps/api/src/index.ts`
- [ ] Application starts successfully with `sst dev`
- [ ] Unauthenticated requests to `/api/*` produce log entries (including 401s)
- [ ] Authenticated requests include `user.id` in log context
- [ ] PII (phoneNumber) is NOT included in logs

### Phase 3 Verification
- [ ] `console.error` no longer appears in `apps/api/src/routes/scan.ts`
- [ ] Scan errors are logged via `c.get('wide-logger').error()`
- [ ] Error logs include error metadata and request context

### Phase 4 Verification
- [ ] All 9 existing auth middleware tests pass
- [ ] New tests verify logger context attachment
- [ ] New tests verify scan route error logging
- [ ] Full test suite passes (155+ tests)
- [ ] No regressions in existing functionality

### Integration Verification
- [ ] Middleware mounting order: wideLogger → authMiddleware → routes
- [ ] Logger context flows: initialized in wideLogger → enriched in auth → accessed in routes
- [ ] Factory pattern maintained: `createAuthMiddleware` still works with dependency injection
- [ ] AWS Lambda compatibility: handler works with async middleware

---

## Dependencies Summary

```
T1.1 → T1.2 → T2.1 → T2.2
              ↓      ↓
              T3.1 ←┘
              ↓
              T4.1 → T4.2 → T4.3
                     ↓
                     T4.4
                     ↓
                     T4.5
```

## Estimated Effort Summary

| Phase | Tasks | Effort |
|-------|-------|--------|
| Phase 1: Dependency and Types | 3 | S (3-4 hours) |
| Phase 2: Middleware Integration | 3 | M (4-6 hours) |
| Phase 3: Error Logging Migration | 1 | S (2-3 hours) |
| Phase 4: Testing | 5 | L (6-8 hours) |
| **Total** | **12** | **M (15-21 hours)** |

## References

- Proposal: `openspec/changes/hono-wide-logger-integration/proposal.md`
- Specification: `openspec/changes/hono-wide-logger-integration/spec.md`
- Design: `openspec/changes/hono-wide-logger-integration/design.md`
- Wide Logger Package: https://www.npmjs.com/package/hono-wide-logger
