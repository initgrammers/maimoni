/// <reference path="../.sst/platform/config.d.ts" />

import { getEnv } from '../packages/utils/src/index';
import { auth } from './auth';

export const api = new sst.aws.Function('Api', {
  handler: 'apps/api/src/index.handler',
  url: true,
  environment: {
    ...getEnv(['DATABASE_URL', 'GROQ_API_KEY', 'LLAMA_CLOUD_API_KEY']),
    AUTH_URL: auth.url,
  },
});
