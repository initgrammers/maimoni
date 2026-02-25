import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { app } from './app';

const devApp = new Hono();
devApp.use(cors());

devApp.route('', app);

export default {
  fetch: devApp.fetch,
  port: 3001,
};
