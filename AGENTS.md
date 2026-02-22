# AGENTS.md - Maimoni Project Guidelines

## Project Overview
Financial management app using **Bun**, **SST Ion**, **TanStack Start**, **Hono API**, **Drizzle ORM**, and **LlamaIndex + Groq**. Features AI-powered receipt scanning and WhatsApp-based authentication.

## Project Structure
```
.
├── apps/
│   ├── api/          # Hono API (LLM logic + Drizzle)
│   ├── auth/         # OpenAuth service (WhatsApp/Twilio)
│   └── webapp/       # TanStack Start frontend
├── infra/            # SST Ion infrastructure modules
├── packages/
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
# All tests
bun run test:all

# Single test file
bun test src/core.test.ts
bun test --cwd packages/db src/core.test.ts

# Single test by name
bun test -t "test name pattern"

# Specific test types
bun run --cwd packages/db test:integration    # DB integration tests
bun run --cwd apps/webapp test               # Vitest unit tests
bun run --cwd apps/webapp test:e2e           # Playwright E2E
```

### Database
```bash
bun run --cwd packages/db db:generate   # Generate migrations
db:migrate                              # Run migrations
db:push                                 # Push schema changes
db:studio                               # Open Drizzle Studio
```

## Code Style Guidelines

### Imports
- **Webapp**: Use `@/` alias (e.g., `import { Button } from '@/components/Button'`)
- **Packages**: Use workspace references (e.g., `import { db } from '@maimoni/db'`)
- **Order**: Node built-ins → external → workspace → relative (alphabetical within groups)

### Formatting (Biome enforced)
- 2 spaces indent, 80 char line width
- Single quotes for JS/TS strings
- No semicolons (ASI)
- Trailing commas in multi-line

### Naming Conventions
- **Files**: kebab-case (`income-form.tsx`)
- **Components**: PascalCase (`IncomeForm`)
- **Functions/Variables**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Types/Interfaces**: PascalCase (`UserProfile`, `ApiResponse`)
- **Database**: snake_case in schema, camelCase in TS

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

### Database Conventions
- Use `drizzle-kit generate` for ALL schema changes
- Migrations must be idempotent (`CREATE TABLE IF NOT EXISTS`, `DO $$` blocks)
- Data seeding via custom SQL in `packages/db/drizzle/`
- Use soft deletes (`isActive` boolean) not hard deletes

### Anti-Patterns
- ❌ No ESLint/Prettier (Biome only)
- ❌ No manual `process.env` access
- ❌ No hardcoded paths in navigation (use typed router paths)
- ❌ No prop drilling (use route loaders/context)
- ❌ No `<a>` tags for internal navigation (use `Link` from router)

## Where to Look
| Task | Location | Notes |
|------|----------|-------|
| UI/Routes | `apps/webapp/src/routes` | TanStack Start file-based routing |
| API Logic | `apps/api/src` | Hono handlers with Zod validation |
| DB Schema | `packages/db/src/schema.ts` | Drizzle ORM definitions |
| AI Extraction | `packages/ai/src` | Groq + LlamaParse logic |
| Infrastructure | `infra/` | SST Ion modules |
| Auth Client | `packages/auth/src/client.ts` | OpenAuth integration |

## Testing Patterns
- Unit tests: `bun:test` with `describe/test/expect`
- Mock Drizzle transactions for DB tests
- Integration tests use testcontainers for PostgreSQL
- E2E tests use Playwright
