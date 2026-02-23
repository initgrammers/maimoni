## Exploration: api-core-screaming-architecture

### Current State
apps/api exposes a Hono app with auth middleware and routes registered under /api in apps/api/src/index.ts. Route handlers live in apps/api/src/routes/* and directly perform DB reads/writes via @maimoni/db. Cross-cutting logic sits in apps/api/src/shared (board access, invitation helpers, Zod schemas). Auth middleware in apps/api/src/middleware/auth.ts uses @maimoni/auth and getEnv from packages/utils. Scan route uses @maimoni/ai. Tests rely on Hono testClient and a mock DB helper in apps/api/src/routes/route-test-utils.ts.

### Affected Areas
- apps/api/src/index.ts — entry point wiring db + auth + registerRoutes
- apps/api/src/routes/* — application behavior + DB access mixed in handlers
- apps/api/src/shared/* — domain-ish helpers and validation co-located with routes
- apps/api/src/middleware/auth.ts — auth boundary + context type used by routes
- apps/api/src/routes/route-test-utils.ts — DB mocking used in route tests
- apps/api/src/index.test.ts and apps/api/src/routes/*.test.ts — tests import routes and depend on current module paths

### Approaches
1. **New packages/core with DDD layers** — Create packages/core with domain (entities/values), application/use-cases (services/commands/queries), and infra (repositories, db mappers). Hono routes in apps/api adapt HTTP to use-cases.
   - Pros: clear boundaries, reusable core (future workers/cron), easier testing of use-cases
   - Cons: initial refactor cost, new module boundaries to manage, requires repository interfaces
   - Effort: Medium/High

2. **In-app core module** — Keep code in apps/api but split into src/core/{domain,application,infra} and move routes to src/http.
   - Pros: faster migration, fewer workspace/package changes
   - Cons: still tied to api app, less reuse across apps, boundaries easier to blur
   - Effort: Medium

### Recommendation
Approach 1 if the goal is long-term reuse and clean DDD boundaries; otherwise approach 2 for a staged migration. Start by extracting domain helpers (board access, invitations, schemas) into core domain/application modules and keeping Hono routes as adapters.

### Risks
- Circular dependencies if domain reaches into infra/db or Hono types
- Path changes breaking route tests and test setup imports
- Auth context type coupling between middleware and route modules
- Shared Zod schemas used by routes may not map cleanly to domain validation

### Ready for Proposal
Yes — enough structure identified to draft a proposal, but confirm desired target (new package vs in-app module) before committing.
