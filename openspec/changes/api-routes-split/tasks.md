# Tasks: API Routes Split

## Phase 1: Foundation (apps/api)

- [x] 1.1 Create `apps/api/src/shared/schemas.ts` and move Zod schemas for boards, invitations, incomes, expenses from `apps/api/src/index.ts`.
- [x] 1.2 Create `apps/api/src/shared/board-access.ts` and move board access helpers (`BoardAccessRole`, `getUserBoardRole`, `getOrSelectAccessibleBoard`, `listUserBoards`) from `apps/api/src/index.ts`.
- [x] 1.3 Create `apps/api/src/shared/invitations.ts` and move invitation helpers (`buildInvitationToken`, `parseInvitationToken`, `ensureInvitationsSchemaIsReady`) from `apps/api/src/index.ts`.

## Phase 2: Core Routers (apps/api)

- [x] 2.1 Create `apps/api/src/routes/dashboard.ts` with `createDashboardRouter(deps)` and move `/api/dashboard` handler from `apps/api/src/index.ts`.
- [x] 2.2 Create `apps/api/src/routes/auth.ts` with `createAuthRouter(deps)` and move `/api/auth/claim` handler from `apps/api/src/index.ts`.
- [x] 2.3 Create `apps/api/src/routes/boards.ts` with `createBoardsRouter(deps)` and move board settings/delete handlers from `apps/api/src/index.ts`.
- [x] 2.4 Create `apps/api/src/routes/invitations.ts` with `createInvitationsRouter(deps)` and move board invitation list/create/accept/resolve handlers from `apps/api/src/index.ts`.
- [x] 2.5 Create `apps/api/src/routes/incomes.ts` with `createIncomesRouter(deps)` and move incomes CRUD handlers from `apps/api/src/index.ts`.
- [x] 2.6 Create `apps/api/src/routes/expenses.ts` with `createExpensesRouter(deps)` and move expenses CRUD handlers from `apps/api/src/index.ts`, ensuring only one `router.post('/expenses', ...)` is registered.
- [x] 2.7 Create `apps/api/src/routes/categories.ts` with `createCategoriesRouter(deps)` and move `/api/categories` handler from `apps/api/src/index.ts`.
- [x] 2.8 Create `apps/api/src/routes/scan.ts` with `createScanRouter(deps)` and move `/api/scan` handler from `apps/api/src/index.ts`.

## Phase 3: Wiring (apps/api)

- [x] 3.1 Create `apps/api/src/routes/index.ts` exporting `ApiDeps` and `registerRoutes(app, deps)` to mount all routers under `/api`.
- [x] 3.2 Update `apps/api/src/index.ts` to construct `deps`, keep `app.use('/api/*', authMiddleware)`, call `registerRoutes(app, deps)`, and remove inlined routes and duplicate `POST /api/expenses`.
- [x] 3.3 Update imports/exports in `apps/api/src/index.ts` to reference shared helpers and routers only where needed; ensure `app` and `handler` exports remain unchanged.

## Phase 4: Verification (apps/api)

- [ ] 4.1 Run `bun test src/index.test.ts` under `apps/api` to confirm auth boundary and route behavior are unchanged.
- [ ] 4.2 Run `bun test src/scan.test.ts` under `apps/api` to confirm scan route behavior remains intact.
- [ ] 4.3 Run `bun run check` to ensure formatting and linting pass after the refactor.
