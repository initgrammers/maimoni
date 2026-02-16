/// <reference path="../.sst/platform/config.d.ts" />

import { api } from './api';
import { auth } from './auth';
import { webapp } from './webapp';

export const router = new sst.aws.Router('MyRouter', {
  routes: {
    '/api/*': api.url,
    '/auth/*': auth.url,
    '/*': webapp.url,
  },
});
