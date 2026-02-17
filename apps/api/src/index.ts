import { extractReceiptInfo } from '@maimoni/ai';
import {
  authSubjects,
  createOpenAuthClient,
  getSubjectIdFromAccessToken,
  normalizeAuthIssuer,
} from '@maimoni/auth';
import {
  categories,
  claimAnonymousData,
  createClient as createDbClient,
  expenses,
  getOrCreateInitialBoard,
  incomes,
  syncUser,
} from '@maimoni/db';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { getEnv } from '../../../packages/utils/src/index';

type UserContext = {
  Variables: {
    userId: string;
  };
};

const app = new Hono<UserContext>();

const db = createDbClient(getEnv('DATABASE_URL'));
const authIssuer = normalizeAuthIssuer(getEnv('AUTH_URL'));
const authClient = createOpenAuthClient(authIssuer, 'webapp');

function getBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice('Bearer '.length);
}

app.use('/api/*', async (c, next) => {
  const token = getBearerToken(c.req.header('authorization'));
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let verified: Awaited<
    ReturnType<typeof authClient.verify<typeof authSubjects>>
  >;
  try {
    verified = await authClient.verify(authSubjects, token);
  } catch (error) {
    console.error('OpenAuth verify failed', error);
    return c.json({ error: 'Auth service unavailable' }, 503);
  }

  if (verified.err || verified.subject.type !== 'user') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let subjectId: string | undefined;
  try {
    subjectId = getSubjectIdFromAccessToken(token);
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  if (!subjectId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await syncUser(db, {
    id: subjectId,
    phoneNumber: verified.subject.properties.phoneNumber ?? null,
  });

  c.set('userId', subjectId);
  await next();
});

app.get('/api/dashboard', async (c) => {
  const userId = c.get('userId');
  const board = await getOrCreateInitialBoard(db, { userId });

  const [incomeRows, expenseRows] = await Promise.all([
    db
      .select()
      .from(incomes)
      .where(and(eq(incomes.userId, userId), eq(incomes.boardId, board.id))),
    db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.boardId, board.id))),
  ]);

  return c.json({
    board,
    incomes: incomeRows,
    expenses: expenseRows,
  });
});

app.post('/api/auth/claim', async (c) => {
  const realUserId = c.get('userId');
  const body = (await c.req.json()) as { anonymousId?: string };
  const anonymousId = body.anonymousId;

  if (!anonymousId) {
    return c.json({ error: 'anonymousId is required' }, 400);
  }

  try {
    await claimAnonymousData(db, { realUserId, anonymousId });
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to claim anonymous data',
      },
      400,
    );
  }
});

app.get('/api/incomes', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.query('boardId');
  if (!boardId) return c.json({ error: 'boardId is required' }, 400);

  const result = await db
    .select()
    .from(incomes)
    .where(and(eq(incomes.userId, userId), eq(incomes.boardId, boardId)));

  return c.json(result);
});

app.post('/api/incomes', async (c) => {
  const userId = c.get('userId');
  const body = (await c.req.json()) as {
    boardId: string;
    amount: string;
    categoryId: string;
    note?: string;
    date?: string;
  };

  const result = await db
    .insert(incomes)
    .values({
      boardId: body.boardId,
      userId,
      amount: body.amount,
      categoryId: body.categoryId,
      note: body.note,
      date: body.date ? new Date(body.date) : new Date(),
    })
    .returning();

  return c.json(result[0]);
});

app.get('/api/expenses', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.query('boardId');
  if (!boardId) return c.json({ error: 'boardId is required' }, 400);

  const result = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.boardId, boardId)));

  return c.json(result);
});

app.post('/api/expenses', async (c) => {
  const userId = c.get('userId');
  const body = (await c.req.json()) as {
    boardId: string;
    amount: string;
    categoryId: string;
    note?: string;
    tags?: string[];
    receiptUrl?: string;
    date?: string;
  };

  const result = await db
    .insert(expenses)
    .values({
      boardId: body.boardId,
      userId,
      amount: body.amount,
      categoryId: body.categoryId,
      note: body.note,
      tags: body.tags,
      receiptUrl: body.receiptUrl,
      date: body.date ? new Date(body.date) : new Date(),
    })
    .returning();

  return c.json(result[0]);
});

app.post('/api/expenses/scan', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) return c.json({ error: 'No file provided' }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const scanResult = await extractReceiptInfo(buffer, file.name);

  return c.json(scanResult);
});

app.get('/api/categories', async (c) => {
  const type = c.req.query('type');
  if (type === 'income' || type === 'expense') {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.type, type));
    return c.json(result);
  }

  const result = await db.select().from(categories);
  return c.json(result);
});

export const handler = handle(app);
