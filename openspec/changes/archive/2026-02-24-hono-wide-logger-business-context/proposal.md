# Proposal: Hono Wide-Logger Business Context Enhancement

## Intent

Extend the existing `hono-wide-logger` integration to capture business context (endpoint names, entity IDs, actions) across all API routes. Currently, logs capture request metadata and user ID but lack business-specific identifiers needed for debugging, audit trails, and analytics queries.

## Scope

### In Scope
- Add business context to all 8 API route files (dashboard, boards, expenses, incomes, categories, scan, invitations, auth)
- ~30+ endpoints across the API
- Create `addBusinessContext()` helper in `routes/types.ts`
- Standard context fields: `endpoint`, `entityType`, `action`, `boardId`, `entityId`
- Update AGENTS.md with pattern documentation

### Out of Scope
- Changing sampling rules (keeping 5xx, >2s, 5% default)
- External log storage or log shipping configuration
- Dashboard/visualization for logs
- Alerting rules based on business context
- Migration of historical logs

## Approach

**Helper Function Pattern** - Add `addBusinessContext(c, context)` to `routes/types.ts` with type-safe interface:

```typescript
interface BusinessContext {
  endpoint: string;
  entityType?: 'board' | 'expense' | 'income' | 'category' | 'invitation' | 'scan' | 'auth';
  action?: 'create' | 'update' | 'delete' | 'list' | 'get' | 'scan' | 'claim';
  boardId?: string;
  entityId?: string;
}

export function addBusinessContext(c: Context, context: BusinessContext): void
```

Each route handler calls this at entry point with appropriate context extracted from request params/query/body.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/routes/types.ts` | New | Add `addBusinessContext()` helper and `BusinessContext` interface |
| `apps/api/src/routes/dashboard.ts` | Modified | Add context to GET /dashboard endpoint |
| `apps/api/src/routes/boards.ts` | Modified | Add context to PATCH/DELETE /boards/:boardId endpoints |
| `apps/api/src/routes/expenses.ts` | Modified | Add context to all 5 expense endpoints |
| `apps/api/src/routes/incomes.ts` | Modified | Add context to all 5 income endpoints |
| `apps/api/src/routes/categories.ts` | Modified | Add context to GET /categories endpoint |
| `apps/api/src/routes/scan.ts` | Modified | Enhance existing logging with business context |
| `apps/api/src/routes/invitations.ts` | Modified | Add context to all 6 invitation endpoints |
| `apps/api/src/routes/auth.ts` | Modified | Add context to POST /auth/claim endpoint |
| `AGENTS.md` | Modified | Document business context logging pattern |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Performance overhead from logger context calls | Low | Context adds <1ms per request; benchmark before/after |
| Inconsistent naming conventions across developers | Medium | Type-safe helper enforces valid values; code review checklist |
| Missing business context in new routes | Medium | Document in AGENTS.md; lint rule suggestion |
| Over-logging sensitive data | Low | Helper excludes PII; only log IDs not content |

## Rollback Plan

1. Revert changes to route files (git revert)
2. Remove `addBusinessContext()` from `routes/types.ts`
3. Verify existing wide-logger functionality remains intact (logs still capture user ID and request metadata)
4. No database or infrastructure changes required

## Dependencies

- Existing `hono-wide-logger` integration (completed)
- `UserContext` type with wide-logger module augmentation
- No new external dependencies

## Success Criteria

- [ ] All 8 route files use `addBusinessContext()` in every endpoint handler
- [ ] Logs contain `business.endpoint`, `business.entityType`, `business.action` fields when sampled
- [ ] CloudWatch Logs Insights can query by board ID: `fields @timestamp, business.boardId | filter business.boardId = 'xxx'`
- [ ] All existing tests pass (132 tests)
- [ ] No increase in p95 latency > 5ms
- [ ] AGENTS.md updated with pattern documentation

## References

- Package: https://www.npmjs.com/package/hono-wide-logger
- Current Logging Spec: `openspec/specs/logging/spec.md`
- Exploration Analysis: `openspec/changes/hono-wide-logger-business-context/exploration.md`
- Previous Integration Archive: `openspec/changes/archive/2026-02-23-hono-wide-logger-integration/`
