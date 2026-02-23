import '../test-setup';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { createAuthMiddleware, type UserContext } from './auth';

// Mock del auth client
type AuthClient = ReturnType<
  typeof import('@maimoni/auth').createOpenAuthClient
>;

const createMockAuthClient = (overrides = {}): AuthClient =>
  ({
    verify: async () => ({
      err: null,
      subject: {
        type: 'user' as const,
        properties: {
          id: 'test-user-id',
          phoneNumber: '+593991234567',
        },
      },
      ...overrides,
    }),
    authorize: async () => ({
      url: 'http://test',
      state: 'test',
      challenge: 'test',
    }),
    exchange: async () => ({ err: null, tokens: { access_token: 'test' } }),
    refresh: async () => ({ err: null, tokens: { access_token: 'test' } }),
  }) as unknown as AuthClient;

// Helper para crear app de test con mock auth
function createTestApp(mockClient?: AuthClient) {
  const app = new Hono<UserContext>();

  // Usar middleware con mock client si se proporciona
  app.use('/api/*', createAuthMiddleware(mockClient));

  // Ruta simple para testing
  app.get('/api/dashboard', (c) => {
    return c.json({ userId: c.get('userId'), data: 'test' });
  });

  app.get('/api/categories', (c) => c.json([]));

  app.post('/api/expenses', async (c) => {
    const body = await c.req.json();
    return c.json({ id: '1', ...body });
  });

  return app;
}

describe('Auth Middleware Tests', () => {
  describe('Authentication', () => {
    it('should return 401 when no authorization header', async () => {
      const app = createTestApp(createMockAuthClient());
      const res = await app.request('/api/dashboard');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when invalid token format', async () => {
      const app = createTestApp(createMockAuthClient());
      const res = await app.request('/api/dashboard', {
        headers: { authorization: 'InvalidToken' },
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 when token verification fails', async () => {
      const app = createTestApp(
        createMockAuthClient({
          err: new Error('Invalid token'),
          subject: null,
        }),
      );

      const res = await app.request('/api/dashboard', {
        headers: { authorization: 'Bearer invalid.token.here' },
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 when subject type is not user', async () => {
      const app = createTestApp(
        createMockAuthClient({
          subject: {
            type: 'admin' as const,
            properties: { id: 'admin-id', phoneNumber: '+593991234567' },
          },
        }),
      );

      const res = await app.request('/api/dashboard', {
        headers: { authorization: 'Bearer valid.token' },
      });

      expect(res.status).toBe(401);
    });

    it('should set userId when token is valid', async () => {
      const app = createTestApp(createMockAuthClient());

      const res = await app.request('/api/dashboard', {
        headers: { authorization: 'Bearer valid.token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('test-user-id');
    });
  });

  describe('Protected Endpoints', () => {
    it('should protect /api/categories', async () => {
      const app = createTestApp(createMockAuthClient());
      const res = await app.request('/api/categories');
      expect(res.status).toBe(401);
    });

    it('should protect /api/expenses', async () => {
      const app = createTestApp(createMockAuthClient());
      const res = await app.request('/api/expenses');
      expect(res.status).toBe(401);
    });
  });

  describe('testClient integration', () => {
    it('should work with testClient', async () => {
      const app = createTestApp(createMockAuthClient());
      const client = testClient(app) as {
        api: {
          dashboard: {
            $get: (opts: {
              header: Record<string, string>;
            }) => Promise<Response>;
          };
        };
      };

      const res = await client.api.dashboard.$get({
        header: { authorization: 'Bearer valid.token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('test-user-id');
    });
  });
});

describe('Production Auth Middleware', () => {
  it('should use default client when no mock provided', async () => {
    // Importa el middleware por defecto (sin mock)
    const { authMiddleware } = await import('./auth');

    const app = new Hono<UserContext>();
    app.use('/api/*', authMiddleware);
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Sin token debe retornar 401
    const res = await app.request('/api/test');
    expect(res.status).toBe(401);
  });
});
