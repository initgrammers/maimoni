/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'maimoni',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      providers: {
        aws: {
          region: 'us-east-1',
        },
      },
    };
  },
  async run() {
    const infra = await import('./infra');

    return {
      api: infra.api.url,
      auth: infra.auth.url,
      webapp: infra.webapp.url,
      router: infra.router.url,
    };
  },
});
