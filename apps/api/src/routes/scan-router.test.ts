import '../test-setup';
import { describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { createMockDb } from './route-test-utils';

const USER_ID = 'user-1';

let shouldThrow = false;
const mockExtract = mock(async () => {
  if (shouldThrow) {
    throw new Error('scan failed');
  }
  return {
    total_amount: 10,
    date: '2026-02-17T12:00:00.000Z',
    merchant_name: 'Shop',
    category: 'Food',
    type: 'expense',
    note: 'Lunch',
    items: [],
  };
});

mock.module('@maimoni/ai', () => ({
  extractReceiptInfo: mockExtract,
}));

async function createApp(db: unknown) {
  const { createScanRouter } = await import('./scan');
  const app = new Hono<UserContext>();
  app.use('/api/*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/api', createScanRouter({ db } as never));
  return app;
}

function createFormData(file: File | null) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  return formData;
}

describe('scan router', () => {
  it('returns 400 when no file is provided', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = await createApp(db);
    const formData = createFormData(null);

    const res = await app.request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
  });

  it('returns scan result for valid images', async () => {
    const db = createMockDb({
      selectResults: [[{ name: 'Food', type: 'expense' }]],
    });
    const app = await createApp(db);
    const file = new File(['fake'], 'receipt.jpg', { type: 'image/jpeg' });
    const formData = createFormData(file);

    const res = await app.request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.merchant_name).toBe('Shop');
    expect(mockExtract).toHaveBeenCalled();
  });

  it('rejects files larger than 10MB', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = await createApp(db);
    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'receipt.jpg',
      { type: 'image/jpeg' },
    );
    const formData = createFormData(file);

    const res = await app.request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
  });

  it('rejects unsupported file types', async () => {
    const db = createMockDb({ selectResults: [[]] });
    const app = await createApp(db);
    const file = new File(['fake'], 'receipt.txt', { type: 'text/plain' });
    const formData = createFormData(file);

    const res = await app.request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
  });

  it('returns 500 when receipt extraction fails', async () => {
    const db = createMockDb({
      selectResults: [[{ name: 'Food', type: 'expense' }]],
    });
    const app = await createApp(db);
    const file = new File(['fake'], 'receipt.jpg', { type: 'image/jpeg' });
    const formData = createFormData(file);

    shouldThrow = true;
    const res = await app.request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });
    shouldThrow = false;

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('scan failed');
  });

  it('returns 500 with fallback message for non-error throws', async () => {
    const db = createMockDb({
      selectResults: [[{ name: 'Food', type: 'expense' }]],
    });
    const app = await createApp(db);
    const file = new File(['fake'], 'receipt.jpg', { type: 'image/jpeg' });
    const formData = createFormData(file);

    mockExtract.mockImplementationOnce(() => {
      throw 'boom';
    });

    const res = await app.request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to process receipt');
  });
});
