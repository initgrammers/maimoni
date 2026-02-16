# INFRASTRUCTURE KNOWLEDGE BASE

## OVERVIEW
Modular SST Ion (v3) configuration. The infrastructure is split into functional modules to maintain isolation and clarity. A central router acts as the gateway for all services.

## STRUCTURE
```
infra/
├── api.ts      # API service (Hono on AWS Lambda)
├── auth.ts     # Authentication service (OpenAuth)
├── webapp.ts   # TanStack Start frontend
├── router.ts   # Gateway directing traffic to services
└── index.ts    # Module exports
```

## WHERE TO LOOK
| Resource | File | Responsibility |
|----------|------|----------------|
| Traffic Routing | `router.ts` | Defines path-based routing for the app |
| Compute / Env | `api.ts` | Backend Lambda config and environment links |
| Frontend | `webapp.ts` | Static site or SSR hosting configuration |
| Auth Service | `auth.ts` | Identity provider and auth worker setup |

## CONVENTIONS
- **Validation**: Always use `getEnv` from `@maimoni/utils` to declare and validate environment variables.
- **Modularity**: Keep service-specific logic within its respective file.
- **Reference**: Use `/// <reference path="../.sst/platform/config.d.ts" />` for SST type safety.

## ANTI-PATTERNS
- **Direct process.env**: Avoid accessing `process.env` directly. Use the validated `getEnv` helper.
- **Monolithic Config**: Don't add non-routing logic to `router.ts`.
- **Hardcoded Secrets**: Never put sensitive strings in infra files; link them via `getEnv` or SST secrets.
