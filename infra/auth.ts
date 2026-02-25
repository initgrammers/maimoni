/// <reference path="../.sst/platform/config.d.ts" />

import { getEnv } from '../packages/utils/src/index';
import { router } from './router';

export const authTable = new sst.aws.Dynamo('authTable', {
  fields: {
    pk: 'string',
    sk: 'string',
  },
  ttl: 'expiry',
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk',
  },
});

export const auth = new sst.aws.Auth.v1('auth', {
  authenticator: {
    handler: 'apps/auth/src/index.handler',
    environment: {
      ...getEnv([
        'DATABASE_URL',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_WHATSAPP_NUMBER',
        'TWILIO_PHONE_NUMBER',
      ]),
      AUTH_STORAGE: $dev
        ? `{"type":"memory","options":{"persist": "../../../apps/auth/persist.json"}}`
        : $interpolate`{"type":"dynamo","options":{"table":"${authTable.name}"}}`,
    },
    link: [authTable],
    url: {
      cors: $dev ? false : undefined,
      router: {
        instance: router,
        path: '/auth',
      },
    },
  },
});
