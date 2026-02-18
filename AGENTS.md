# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-16T22:56:00Z
**Commit:** d632bc0
**Branch:** main

## OVERVIEW
Financial management app ("Maimoni") using **Bun**, **SST Ion**, and **TanStack Start**. Features AI-powered receipt scanning and WhatsApp-based authentication.

## STRUCTURE
```
.
├── apps/
│   ├── api/          # Hono API (LLM logic + Drizzle)
│   ├── auth/         # OpenAuth service (WhatsApp/Twilio)
│   └── webapp/       # TanStack Start frontend
├── infra/            # SST Ion infrastructure modules
├── packages/
│   ├── ai/           # LlamaIndex + Groq integration
│   ├── db/           # Drizzle ORM schema & client
│   └── utils/        # Shared environment validation
└── biome.json        # Tooling (Lint/Format)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| UI Layout/Routes | `apps/webapp/src/routes` | TanStack Start (Beta) |
| API Logic | `apps/api/src` | Hono handlers |
| DB Schema | `packages/db/src/schema.ts` | Drizzle ORM |
| AI Extraction | `packages/ai/src` | Groq + LlamaParse |
| Infrastructure | `infra/` | SST Ion modules |

## CONVENTIONS
- **Tooling**: Use **Biome** for linting and formatting (`bun run check`).
- **Imports**: Use `@/` alias in `webapp` and workspace references (`@maimoni/*`) elsewhere.
- **Environment**: All environment variables must be declared in `packages/utils/src/index.ts` via `getEnv`.
- **Routing**: TanStack Start file-based routing.
- **Database**: 
  - Manage ALL schema changes via `drizzle-kit generate` and `migrate`.
  - Migrations MUST be idempotent: Use `CREATE TABLE IF NOT EXISTS`, `DO $$` blocks for enums/constraints, and `ON CONFLICT DO NOTHING` for seeds.
  - Data seeding (like categories) MUST be handled as custom SQL migrations in `packages/db/drizzle/`.

## ANTI-PATTERNS
- **No ESLint/Prettier**: Biome is the single source of truth for style.
- **No Manual Env Access**: Never use `process.env` directly anywhere. Always use `getEnv` from `packages/utils/src/index.ts` (imported via relative path).
- **Mock Data**: `webapp/src/routes/index.tsx` contains mocks; replace with loaders/API calls for production.

## COMMANDS
```bash
bun install        # Install dependencies
bun run check      # Lint & Format check
sst dev            # Start local development (SST)
```
