/// <reference path="../.sst/platform/config.d.ts" />

import { domain } from "./domain";

export const router = new sst.aws.Router('router', {
    domain: $dev ? undefined : {
        name: domain,
        dns: sst.cloudflare.dns()
    }
});
