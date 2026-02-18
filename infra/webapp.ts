/// <reference path="../.sst/platform/config.d.ts" />

import { getEnv } from '../packages/utils/src/index';
import { api } from './api';
import { auth } from './auth';

export const webapp = new sst.aws.TanStackStart('Webapp', {
  path: 'apps/webapp',
  environment: {
    ...getEnv(['DATABASE_URL', 'LLAMA_CLOUD_API_KEY', 'TWILIO_ACCOUNT_SID']),
    API_URL: api.url,
    AUTH_URL: auth.url,
  },
});
