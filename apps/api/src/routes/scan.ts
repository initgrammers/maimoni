import type { CategoryInput } from '@maimoni/ai';
import { extractReceiptInfo } from '@maimoni/ai';
import { categories } from '@maimoni/db';
import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import type { ApiDeps } from './types';

export function createScanRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();

  router.post('/scan', async (c) => {
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
      const allCategories = await db.select().from(categories);
      const categoryInputs: CategoryInput[] = allCategories.map((category) => ({
        name: category.name,
        type: category.type,
      }));
      const buffer = Buffer.from(await file.arrayBuffer());
      const scanResult = await extractReceiptInfo(
        buffer,
        file.name,
        categoryInputs,
      );
      return c.json(scanResult);
    } catch (error) {
      console.error('Receipt scan failed:', error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to process receipt',
        },
        500,
      );
    }
  });

  return router;
}
