/// <reference path="../.sst/platform/config.d.ts" />

import { getEnv } from '../packages/utils/src/index';

export const auth = new sst.aws.Function('Auth', {
  handler: 'apps/auth/src/index.ts',
  url: true,
  environment: getEnv([
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_NUMBER',
  ]),
});
