import { createClient as createDbClient } from '@maimoni/db';
import { Hono } from 'hono';
import { wideLogger } from 'hono-wide-logger';
import { getEnv } from '../../../packages/utils/src/index';
import { authMiddleware, errorHandler, type UserContext } from './middleware';
import { registerRoutes } from './routes';
import { createJsonStorage } from './wide-storage';

const app = new Hono<UserContext>();

const db = createDbClient(getEnv('DATABASE_URL'));

// Wide-event logging - must be before auth to capture auth failures
// Disable file storage in production (Lambda is read-only)
const isProduction = getEnv('SST_STAGE') === 'production';
app.use(
  '/api/*',
  wideLogger({
    storage: isProduction ? undefined : createJsonStorage(),
    sampleRate: 1, // Log all events for debugging
    logger: console,
  }),
);
app.use('/api/*', authMiddleware);

registerRoutes(app, { db });

// Global error handler
app.onError(errorHandler);

export { app };
