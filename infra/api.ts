/// <reference path="../.sst/platform/config.d.ts" />

import { getEnv } from '../packages/utils/src/index';

export const api = new sst.aws.Function('Api', {
  handler: 'apps/api/src/index.ts',
  url: true,
  environment: getEnv(['DATABASE_URL', 'GROQ_API_KEY', 'LLAMA_CLOUD_API_KEY']),
});
