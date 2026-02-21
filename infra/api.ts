/// <reference path="../.sst/platform/config.d.ts" />

import { getEnv } from '../packages/utils/src/index';
import { auth } from './auth';
import { router } from './router';

export const api = new sst.aws.Function('Api', {
  handler: 'apps/api/src/index.handler',
  environment: {
    ...getEnv(['DATABASE_URL', 'GROQ_API_KEY', 'LLAMA_CLOUD_API_KEY']),
    AUTH_URL: auth.url,
  },
  link: [auth],
  timeout: '60 seconds',
  url: {
    router: {
      instance: router,
      path: '/api',
    },
  },
});
