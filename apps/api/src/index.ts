import { extractReceiptInfo } from '@maimoni/ai';
import { categories, createClient, movements } from '@maimoni/db';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

const app = new Hono();

const db = createClient(process.env.DATABASE_URL!);

app.get('/movements', async (c) => {
  const boardId = c.req.query('boardId');
  if (!boardId) return c.json({ error: 'boardId is required' }, 400);

  const result = await db
    .select()
    .from(movements)
    .where(eq(movements.boardId, boardId))
    .orderBy(movements.date);

  return c.json(result);
});

app.post('/movements', async (c) => {
  const body = await c.req.json();
  const result = await db
    .insert(movements)
    .values({
      ...body,
      date: body.date ? new Date(body.date) : new Date(),
    })
    .returning();

  return c.json(result[0]);
});

app.post('/movements/scan', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) return c.json({ error: 'No file provided' }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const scanResult = await extractReceiptInfo(buffer, file.name);

  return c.json(scanResult);
});

app.get('/categories', async (c) => {
  const result = await db.select().from(categories);
  return c.json(result);
});

export default {
  port: 3000,
  fetch: app.fetch,
};
