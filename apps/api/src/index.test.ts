import './test-setup';
import { describe, expect, it, mock } from 'bun:test';
import { testClient } from 'hono/testing';

mock.module('@maimoni/ai', () => ({
  extractReceiptInfo: async () => ({
    total_amount: 0,
    date: '2026-02-17T12:00:00.000Z',
    merchant_name: 'Mock',
    category: 'Mock',
    type: 'expense',
    note: 'Mock',
    items: [],
  }),
}));

async function loadApp() {
  const { app } = await import('./index');
  return app;
}

describe('API Integration Tests', () => {
  describe('Authentication', () => {
    it('should return 401 when no authorization header', async () => {
      const app = await loadApp();
      const res = await app.request('/api/dashboard');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when invalid token format', async () => {
      const app = await loadApp();
      const res = await app.request('/api/dashboard', {
        headers: { authorization: 'InvalidToken' },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Protected Endpoints', () => {
    it('should protect /api/categories', async () => {
      const app = await loadApp();
      const res = await app.request('/api/categories');
      expect(res.status).toBe(401);
    });

    it('should protect /api/expenses', async () => {
      const app = await loadApp();
      const res = await app.request('/api/expenses');
      expect(res.status).toBe(401);
    });

    it('should protect /api/incomes', async () => {
      const app = await loadApp();
      const res = await app.request('/api/incomes');
      expect(res.status).toBe(401);
    });

    it('should protect /api/scan', async () => {
      const app = await loadApp();
      const res = await app.request('/api/scan', { method: 'POST' });
      expect(res.status).toBe(401);
    });

    it('should protect /api/boards/:boardId/invitations', async () => {
      const app = await loadApp();
      const res = await app.request('/api/boards/test-board/invitations');
      expect(res.status).toBe(401);
    });

    it('should protect /api/auth/claim', async () => {
      const app = await loadApp();
      const res = await app.request('/api/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousId: 'anon-123' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should require auth before validation', async () => {
      const app = await loadApp();
      const res = await app.request('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Test',
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent routes', async () => {
      const app = await loadApp();
      const res = await app.request('/api/nonexistent-route');
      expect([401, 404]).toContain(res.status);
    });

    it('should return 401 for protected POST routes', async () => {
      const app = await loadApp();
      const res = await app.request('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'test' }),
      });

      expect(res.status).toBe(401);
    });
  });
});

describe('API with testClient', () => {
  it('should provide typed access to routes', async () => {
    const app = await loadApp();
    const client = testClient(app) as {
      api: {
        dashboard: { $get: unknown };
        categories: { $get: unknown };
        expenses: { $get: unknown; $post: unknown };
        incomes: { $get: unknown; $post: unknown };
        scan: { $post: unknown };
      };
    };

    expect(client.api).toBeDefined();
    expect(client.api.dashboard.$get).toBeDefined();
    expect(client.api.categories.$get).toBeDefined();
    expect(client.api.expenses.$get).toBeDefined();
    expect(client.api.expenses.$post).toBeDefined();
    expect(client.api.incomes.$get).toBeDefined();
    expect(client.api.incomes.$post).toBeDefined();
    expect(client.api.scan.$post).toBeDefined();
  });
});
