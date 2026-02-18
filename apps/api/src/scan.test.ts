import { describe, expect, mock, test } from 'bun:test';
import type { CategoryInput, ScanResult } from '@maimoni/ai';
import { Hono } from 'hono';

const VALID_SCAN_RESULT: ScanResult = {
  total_amount: 25.5,
  date: '2026-02-17T12:00:00.000Z',
  merchant_name: "McDonald's",
  category: 'Alimentación',
  type: 'expense',
  note: "McDonald's - 2 Big Macs",
  items: [
    { name: 'Big Mac', price: 10.25 },
    { name: 'Big Mac', price: 10.25 },
    { name: 'Coca Cola', price: 5.0 },
  ],
};

const mockExtract = mock(
  async (_buf: Buffer, _name: string, _cats: CategoryInput[]) =>
    VALID_SCAN_RESULT,
);

const app = new Hono();

app.post('/api/scan', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) return c.json({ error: 'No file provided' }, 400);

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
  ];
  if (!allowedTypes.includes(file.type)) {
    return c.json(
      { error: 'Unsupported file type. Use JPEG, PNG, WebP, HEIC, or PDF.' },
      400,
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const scanResult = await mockExtract(buffer, file.name, []);
    return c.json(scanResult);
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to process receipt',
      },
      500,
    );
  }
});

function createFormData(file: File | null): FormData {
  const formData = new FormData();
  if (file) formData.append('file', file);
  return formData;
}

describe('POST /api/scan', () => {
  test('returns 400 when no file is provided', async () => {
    const formData = createFormData(null);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('No file provided');
  });

  test('returns 400 for unsupported file type', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const formData = createFormData(file);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Unsupported file type');
  });

  test('returns 400 for file exceeding 10MB', async () => {
    const largeContent = new Uint8Array(11 * 1024 * 1024);
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    const formData = createFormData(file);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('File too large');
  });

  test('returns scan result for valid image', async () => {
    const file = new File(['fake-image-bytes'], 'receipt.jpg', {
      type: 'image/jpeg',
    });
    const formData = createFormData(file);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as ScanResult;
    expect(body.total_amount).toBe(25.5);
    expect(body.merchant_name).toBe("McDonald's");
    expect(body.type).toBe('expense');
  });

  test('accepts PDF files', async () => {
    const file = new File(['fake-pdf'], 'invoice.pdf', {
      type: 'application/pdf',
    });
    const formData = createFormData(file);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    expect(res.status).toBe(200);
  });

  test('accepts PNG files', async () => {
    const file = new File(['fake-png'], 'receipt.png', { type: 'image/png' });
    const formData = createFormData(file);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    expect(res.status).toBe(200);
  });

  test('accepts WebP files', async () => {
    const file = new File(['fake-webp'], 'receipt.webp', {
      type: 'image/webp',
    });
    const formData = createFormData(file);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    expect(res.status).toBe(200);
  });

  test('returns 500 when extraction fails', async () => {
    mockExtract.mockImplementationOnce(async () => {
      throw new Error('AI extraction failed');
    });

    const file = new File(['fake'], 'receipt.jpg', { type: 'image/jpeg' });
    const formData = createFormData(file);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('AI extraction failed');
  });
});
