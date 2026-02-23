import './test-setup';
import { describe, expect, it } from 'bun:test';
import { testClient } from 'hono/testing';
import { app } from './index';

describe('API Integration Tests', () => {
  describe('Authentication', () => {
    it('should return 401 when no authorization header', async () => {
      const res = await app.request('/api/dashboard');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when invalid token format', async () => {
      const res = await app.request('/api/dashboard', {
        headers: { authorization: 'InvalidToken' },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Protected Endpoints', () => {
    it('should protect /api/categories', async () => {
      const res = await app.request('/api/categories');
      expect(res.status).toBe(401);
    });

    it('should protect /api/expenses', async () => {
      const res = await app.request('/api/expenses');
      expect(res.status).toBe(401);
    });

    it('should protect /api/incomes', async () => {
      const res = await app.request('/api/incomes');
      expect(res.status).toBe(401);
    });

    it('should protect /api/scan', async () => {
      const res = await app.request('/api/scan', { method: 'POST' });
      expect(res.status).toBe(401);
    });

    it('should protect /api/boards/:boardId/invitations', async () => {
      const res = await app.request('/api/boards/test-board/invitations');
      expect(res.status).toBe(401);
    });

    it('should protect /api/auth/claim', async () => {
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
      const res = await app.request('/api/nonexistent-route');
      expect([401, 404]).toContain(res.status);
    });

    it('should return 401 for protected POST routes', async () => {
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
  it('should provide typed access to routes', () => {
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
