import { Hono } from 'hono';
import type { UserContext } from '../middleware';
import { type ApiDeps, createCoreDeps, createCoreUseCases } from './types';

export function createScanRouter({ db }: ApiDeps) {
  const router = new Hono<UserContext>();
  const coreDeps = createCoreDeps({ db });
  const { scanReceipt } = createCoreUseCases(coreDeps);
  const { categoryRepository } = coreDeps.repositories;

  router.post('/scan', async (c) => {
    const userId = c.get('userId');
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    try {
      const allCategories = file ? await categoryRepository.listAll() : [];
      const categoryInputs = allCategories.map(
        (category: { name: string; type: 'income' | 'expense' }) => ({
          name: category.name,
          type: category.type,
        }),
      );

      const scanResult = await scanReceipt({
        actorId: userId,
        file: file
          ? {
              buffer: Buffer.from(await file.arrayBuffer()),
              name: file.name,
              size: file.size,
              type: file.type,
            }
          : null,
        categories: categoryInputs,
      });

      if (scanResult.status === 'scanned') {
        return c.json(scanResult.result);
      }

      if (scanResult.status === 'missing-file') {
        return c.json({ error: 'No file provided' }, 400);
      }

      if (scanResult.status === 'file-too-large') {
        return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
      }

      if (scanResult.status === 'unsupported-file-type') {
        return c.json(
          {
            error: 'Unsupported file type. Use JPEG, PNG, WebP, HEIC, or PDF.',
          },
          400,
        );
      }

      return c.json({ error: scanResult.error }, 500);
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
