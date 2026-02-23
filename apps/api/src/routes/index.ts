import type { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createAuthRouter } from './auth';
import { createBoardsRouter } from './boards';
import { createCategoriesRouter } from './categories';
import { createDashboardRouter } from './dashboard';
import { createExpensesRouter } from './expenses';
import { createIncomesRouter } from './incomes';
import { createInvitationsRouter } from './invitations';
import { createScanRouter } from './scan';
import type { ApiDeps } from './types';

export type { ApiDeps } from './types';

export function registerRoutes(app: Hono<UserContext>, deps: ApiDeps) {
  app.route('/api', createDashboardRouter(deps));
  app.route('/api', createAuthRouter(deps));
  app.route('/api', createBoardsRouter(deps));
  app.route('/api', createInvitationsRouter(deps));
  app.route('/api', createIncomesRouter(deps));
  app.route('/api', createExpensesRouter(deps));
  app.route('/api', createCategoriesRouter(deps));
  app.route('/api', createScanRouter(deps));
}
