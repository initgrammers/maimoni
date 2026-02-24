# AGENTS.md - Maimoni Project Guidelines

## Project Overview
Financial management app using **Bun**, **SST Ion**, **TanStack Start**, **Hono API**, **Drizzle ORM**, and **LlamaIndex + Groq**. Features AI-powered receipt scanning and WhatsApp-based authentication. Uses **DDD architecture** in `packages/core` with domain/application/infra layers.

## Project Structure
```
.
├── apps/
│   ├── api/          # Hono API - thin HTTP adapters, delegates to core
│   ├── auth/         # OpenAuth service (WhatsApp/Twilio)
│   └── webapp/       # TanStack Start frontend
├── infra/            # SST Ion infrastructure modules
├── packages/
│   ├── core/         # DDD domains: boards, expenses, incomes, etc.
│   │   └── src/
│   │       ├── boards/        # domain/, application/, infra/
│   │       ├── expenses/
│   │       ├── incomes/
│   │       ├── categories/
│   │       ├── dashboard/
│   │       ├── scan/
│   │       ├── invitations/
│   │       ├── auth-claim/
│   │       └── shared/        # domain/, application/
│   ├── ai/           # LlamaIndex + Groq integration
│   ├── auth/         # Shared auth client/server
│   ├── db/           # Drizzle ORM schema & client
│   └── utils/        # Shared environment validation
└── biome.json        # Lint/Format config
```

## Commands

### Build & Development
```bash
bun install                    # Install dependencies
sst dev                        # Start local development (SST)
sst deploy --stage production  # Deploy to production
```

### Lint & Format (Biome - single source of truth)
```bash
bun run check                  # Lint & format check + auto-fix
bun run lint                   # Check only
bun run format                 # Format only
```

### Testing
```bash
# All tests (runs unit + integration + e2e)
bun run test:all

# Single test file (Bun test)
bun test src/middleware/auth.test.ts
bun test --cwd apps/api src/routes/boards.test.ts

# Single test by name
bun test -t "should return 401 when no authorization header"

# DB integration tests
bun run --cwd packages/db test:integration

# Webapp unit tests (Vitest)
bun run --cwd apps/webapp test

# E2E tests (Playwright)
bun run --cwd apps/webapp test:e2e
```

### Database
```bash
bun run --cwd packages/db db:generate   # Generate migrations
bun run --cwd packages/db db:migrate    # Run migrations
bun run --cwd packages/db db:push       # Push schema changes
bun run --cwd packages/db db:studio     # Open Drizzle Studio
```

## Code Style Guidelines

### Imports
- **Webapp**: Use `@/` alias (e.g., `import { Button } from '@/components/Button'`)
- **Packages**: Use workspace references (e.g., `import { db } from '@maimoni/db'`)
- **Core exports**: Use subpath imports (e.g., `import { updateBoardSettings } from '@maimoni/core/boards'`)
- **Order**: Node built-ins → external → workspace → relative (alphabetical within groups)

### Formatting (Biome enforced)
- 2 spaces indent, 80 char line width
- Single quotes for JS/TS strings
- No semicolons (ASI)
- Trailing commas in multi-line

### Naming Conventions
- **Files**: kebab-case (`income-form.tsx`, `board-access.test.ts`)
- **Components**: PascalCase (`IncomeForm`)
- **Functions/Variables**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Types/Interfaces**: PascalCase (`UserProfile`, `ApiResponse`)
- **Database**: snake_case in schema, camelCase in TS
- **DDD Use Cases**: camelCase with verb prefix (`createBoard`, `updateExpense`)

### Types & Error Handling
- Use `strict: true` TypeScript
- Return early for errors (guard clauses)
- Use Zod for API validation (`@hono/zod-validator`)
- Handle async errors with try/catch, return meaningful messages
- Never use `any`; use `unknown` with type guards

### Environment Variables
- **NEVER** use `process.env` directly
- Always use `getEnv()` from `packages/utils/src/index.ts`
- Import via relative path: `import { getEnv } from '../../../packages/utils/src/index'`

### DDD Architecture (packages/core)
- **domain/**: Entities, value objects, invariants (no deps on other layers)
- **application/**: Use cases, ports (interfaces), validators (Zod schemas)
- **infra/**: Repository implementations (Drizzle), external services
- **Dependency rule**: domain → application → infra
- **Cross-domain**: Use shared/application/ for shared services

### Database Conventions
- Use `drizzle-kit generate` for ALL schema changes
- Migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`, `DO $$` blocks)
- Data seeding via custom SQL in `packages/db/drizzle/`
- Use soft deletes (`isActive` boolean) not hard deletes

### API Route Patterns
- Routes are **thin adapters** - delegate to core use-cases
- Use factory functions: `createBoardsRouter(deps: ApiDeps)`
- Auth via `c.get('userId')` from UserContext
- Validation via `zValidator('json', schema)`

### Auth Middleware Testing Pattern
```typescript
// Use factory function for tests
import { createAuthMiddleware } from './middleware/auth';

function createTestApp(mockClient?: AuthClient) {
  const app = new Hono<UserContext>();
  app.use('/api/*', createAuthMiddleware(mockClient));
  return app;
}
```

### Anti-Patterns
- ❌ No ESLint/Prettier (Biome only)
- ❌ No manual `process.env` access
- ❌ No hardcoded paths in navigation (use typed router paths)
- ❌ No prop drilling (use route loaders/context)
- ❌ No `<a>` tags for internal navigation (use `Link` from router)
- ❌ No business logic in routes (move to core use-cases)

## Where to Look
| Task | Location | Notes |
|------|----------|-------|
| UI/Routes | `apps/webapp/src/routes` | TanStack Start file-based routing |
| API Routes | `apps/api/src/routes` | Hono routers, thin adapters |
| Core Logic | `packages/core/src/{domain}` | DDD use-cases, domain logic |
| DB Schema | `packages/db/src/schema.ts` | Drizzle ORM definitions |
| AI Extraction | `packages/ai/src` | Groq + LlamaParse logic |
| Infrastructure | `infra/` | SST Ion modules |
| Auth Client | `packages/auth/src/client.ts` | OpenAuth integration |
| Test Setup | `apps/api/src/test-setup.ts` | Env vars for testing |

## Testing Patterns
- **Unit tests**: `bun:test` with `describe/test/expect`
- **API tests**: Use `testClient` from `hono/testing` + mock auth
- **Mock pattern**: Factory functions with dependency injection
- **Integration tests**: Use testcontainers for PostgreSQL
- **E2E tests**: Playwright
- **Test env**: Use `apps/api/src/test-setup.ts` for env vars
