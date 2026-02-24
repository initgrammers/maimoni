# Proposal: Hono Wide-Logger Integration

## Intent

Integrate structured wide-event logging into the Maimoni API using `hono-wide-logger` to replace ad-hoc console logging and establish observability foundations for a financial management application.

Financial applications require audit trails, error tracking, and request visibility. Currently, the API has minimal logging (one `console.error` in scan routes) and no observability infrastructure. Wide-event logging provides canonical log lines that capture complete request context—essential for debugging, compliance, and understanding user behavior in production.

## Scope

### In Scope
- Install and configure `hono-wide-logger` middleware in the API
- Extend `UserContext` type to include wide-logger variables
- Mount wide-logger middleware before auth to capture full request lifecycle
- Set authenticated user context in logger after successful auth verification
- Replace existing `console.error` in scan routes with structured logging
- Ensure compatibility with existing factory-pattern auth middleware tests

### Out of Scope
- Custom sampling rules (use package defaults: 5% normal, all 5xx, >2s)
- Business context enrichment (boardId, transaction types) — future enhancement
- Log aggregation infrastructure (CloudWatch, external services)
- Performance benchmarking or load testing
- Migration of other domains beyond scan routes

## Approach

**Approach 2: Auth Integration** from exploration analysis.

The API uses a factory-pattern auth middleware with dependency injection, making it ideal for integrating wide-logger context. We will:

1. Add `hono-wide-logger` dependency to `apps/api/package.json`
2. Extend `UserContext` type in `apps/api/src/middleware/auth.ts` to include `WideLoggerVariables`
3. Mount `wideLogger()` middleware in `apps/api/src/index.ts` before auth middleware
4. Set user context in auth middleware after successful token verification using `logger.setUser()`
5. Replace `console.error` at `apps/api/src/routes/scan.ts:61` with `c.get('wide-logger').error()`
6. Update auth middleware tests to include wide-logger in test context

This approach leverages the existing auth flow to attach user identity to every log line without invasive changes to route handlers.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/package.json` | New | Add `hono-wide-logger` dependency |
| `apps/api/src/index.ts` | Modified | Mount wide-logger middleware before auth |
| `apps/api/src/middleware/auth.ts` | Modified | Extend UserContext type, set user in logger |
| `apps/api/src/middleware/index.ts` | Modified | Re-export extended UserContext type |
| `apps/api/src/routes/scan.ts` | Modified | Replace console.error with wide-logger |
| `apps/api/src/middleware/auth.test.ts` | Modified | Add wide-logger to test context |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| TypeScript context variable collision | Low | `hono-wide-logger` uses `'wide-logger'` key; verify no conflicts |
| Performance overhead from logging | Low | Package is lightweight; defaults sample 95% of normal traffic |
| AWS Lambda compatibility issues | Medium | Verify `hono/aws-lambda` handler works with async middleware |
| Test breakage from context changes | Medium | Factory pattern allows injecting mock logger in tests |
| Log noise in development | Low | Sampling defaults appropriate; can override via env if needed |

## Rollback Plan

1. Revert `apps/api/package.json` to remove dependency
2. Remove wide-logger middleware mount from `apps/api/src/index.ts`
3. Revert `UserContext` type to original (remove `WideLoggerVariables`)
4. Restore `console.error` in `apps/api/src/routes/scan.ts`
5. Revert auth middleware to remove `logger.setUser()` call
6. All changes are additive; rollback restores previous behavior exactly

## Dependencies

- `hono-wide-logger` npm package (^latest)
- Existing auth middleware factory pattern (already implemented)
- No infrastructure changes required

## Success Criteria

- [ ] `hono-wide-logger` installed and builds successfully
- [ ] Wide-logger middleware mounted before auth in `apps/api/src/index.ts`
- [ ] `UserContext` type extended with `WideLoggerVariables`
- [ ] Authenticated user ID attached to log context after successful auth
- [ ] `console.error` in scan routes replaced with `c.get('wide-logger').error()`
- [ ] All existing auth middleware tests pass (9 tests)
- [ ] No TypeScript compilation errors
- [ ] Application starts successfully in `sst dev`

## References

- [hono-wide-logger on npm](https://www.npmjs.com/package/hono-wide-logger)
- Exploration analysis: `openspec/changes/hono-wide-logger-integration/exploration.md`
- Core architecture spec: `openspec/specs/core/spec.md`
