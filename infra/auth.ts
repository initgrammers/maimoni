/// <reference path="../.sst/platform/config.d.ts" />

import { getEnv } from '../packages/utils/src/index';

export const auth = new sst.aws.Function('Auth', {
  handler: 'apps/auth/src/index.handler',
  url: {
    cors: false,
  },
  environment: getEnv([
    'DATABASE_URL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_NUMBER',
  ]),
});
