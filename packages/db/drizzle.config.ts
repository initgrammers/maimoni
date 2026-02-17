import { defineConfig } from 'drizzle-kit';
import { getEnv } from '../../packages/utils/src/index';

const databaseUrl = getEnv('DATABASE_URL');

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
