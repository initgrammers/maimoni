import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { registerRoutes } from './index';

describe('routes index', () => {
  it('registers all routers under /api', () => {
    const calls: Array<{ path: string }> = [];
    const app = {
      route: (path: string) => {
        calls.push({ path });
        return app;
      },
    } as unknown as Parameters<typeof registerRoutes>[0];

    registerRoutes(app, { db: {} as never });

    expect(calls).toHaveLength(8);
    expect(calls.every((call) => call.path === '/api')).toBe(true);
  });
});
