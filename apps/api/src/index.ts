import { createClient as createDbClient } from '@maimoni/db';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { getEnv } from '../../../packages/utils/src/index';
import { authMiddleware, type UserContext } from './middleware';
import { registerRoutes } from './routes';

const app = new Hono<UserContext>();

const db = createDbClient(getEnv('DATABASE_URL'));

app.use('/api/*', authMiddleware);

registerRoutes(app, { db });

export const handler = handle(app);
export { app };
