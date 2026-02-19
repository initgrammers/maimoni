import { zValidator } from '@hono/zod-validator';
import type { CategoryInput } from '@maimoni/ai';
import { extractReceiptInfo } from '@maimoni/ai';
import {
  authSubjects,
  createOpenAuthClient,
  getSubjectIdFromAccessToken,
  normalizeAuthIssuer,
} from '@maimoni/auth';
import {
  boards,
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
import { z } from 'zod';
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
      .select({
        income: incomes,
        categoryName: categories.name,
        categoryEmoji: categories.emoji,
      })
      .from(incomes)
      .innerJoin(categories, eq(incomes.categoryId, categories.id))
      .where(
        and(
          eq(incomes.userId, userId),
          eq(incomes.boardId, board.id),
          eq(incomes.isActive, true),
        ),
      ),
    db
      .select({
        expense: expenses,
        categoryName: categories.name,
        categoryEmoji: categories.emoji,
      })
      .from(expenses)
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.boardId, board.id),
          eq(expenses.isActive, true),
        ),
      ),
  ]);

  const incomesWithCategory = incomeRows.map(
    ({ income, categoryName, categoryEmoji }) => ({
      ...income,
      categoryName,
      categoryEmoji,
    }),
  );

  const expensesWithCategory = expenseRows.map(
    ({ expense, categoryName, categoryEmoji }) => ({
      ...expense,
      categoryName,
      categoryEmoji,
    }),
  );

  return c.json({
    board,
    incomes: incomesWithCategory,
    expenses: expensesWithCategory,
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

const incomeSchema = z.object({
  boardId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  categoryId: z.string().uuid(),
  note: z.string().optional(),
  date: z.string().datetime().optional(),
});

const expenseSchema = z.object({
  boardId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  categoryId: z.string().uuid(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  receiptUrl: z.string().url().optional(),
  date: z.string().datetime().optional(),
});

const expenseUpdateSchema = z
  .object({
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    categoryId: z.string().uuid().optional(),
    note: z.string().nullable().optional(),
    date: z.string().datetime().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

const incomeUpdateSchema = z
  .object({
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    categoryId: z.string().uuid().optional(),
    note: z.string().nullable().optional(),
    date: z.string().datetime().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

const boardSettingsSchema = z.object({
  spendingLimitAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .nullable(),
});

app.get('/api/incomes', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.query('boardId');
  if (!boardId) return c.json({ error: 'boardId is required' }, 400);

  const result = await db
    .select()
    .from(incomes)
    .where(
      and(
        eq(incomes.userId, userId),
        eq(incomes.boardId, boardId),
        eq(incomes.isActive, true),
      ),
    );

  return c.json(result);
});

app.get('/api/incomes/:incomeId', async (c) => {
  const userId = c.get('userId');
  const incomeId = c.req.param('incomeId');
  const incomeIdResult = z.string().uuid().safeParse(incomeId);
  if (!incomeIdResult.success) {
    return c.json({ error: 'incomeId inválido' }, 400);
  }

  const [income] = await db
    .select()
    .from(incomes)
    .where(
      and(
        eq(incomes.id, incomeIdResult.data),
        eq(incomes.userId, userId),
        eq(incomes.isActive, true),
      ),
    )
    .limit(1);

  if (!income) {
    return c.json({ error: 'Ingreso no encontrado' }, 404);
  }

  return c.json(income);
});

app.patch(
  '/api/boards/:boardId/settings',
  zValidator('json', boardSettingsSchema),
  async (c) => {
    const userId = c.get('userId');
    const boardId = c.req.param('boardId');
    const boardIdResult = z.string().uuid().safeParse(boardId);
    if (!boardIdResult.success) {
      return c.json({ error: 'boardId inválido' }, 400);
    }

    const [board] = await db
      .select()
      .from(boards)
      .where(eq(boards.id, boardIdResult.data))
      .limit(1);

    if (!board) {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }

    if (board.ownerId !== userId) {
      return c.json(
        { error: 'No tienes permisos para actualizar este tablero' },
        403,
      );
    }

    const body = c.req.valid('json');

    const [updatedBoard] = await db
      .update(boards)
      .set({
        spendingLimitAmount: body.spendingLimitAmount,
        updatedAt: new Date(),
      })
      .where(eq(boards.id, boardIdResult.data))
      .returning();

    return c.json({ board: updatedBoard });
  },
);

app.post('/api/incomes', zValidator('json', incomeSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, body.categoryId))
    .limit(1);

  if (!category || category.type !== 'income') {
    return c.json({ error: 'Categoría de ingreso inválida' }, 400);
  }

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

app.patch(
  '/api/incomes/:incomeId',
  zValidator('json', incomeUpdateSchema),
  async (c) => {
    const userId = c.get('userId');
    const incomeId = c.req.param('incomeId');
    const incomeIdResult = z.string().uuid().safeParse(incomeId);
    if (!incomeIdResult.success) {
      return c.json({ error: 'incomeId inválido' }, 400);
    }

    const body = c.req.valid('json');

    const [existingIncome] = await db
      .select()
      .from(incomes)
      .where(
        and(
          eq(incomes.id, incomeIdResult.data),
          eq(incomes.userId, userId),
          eq(incomes.isActive, true),
        ),
      )
      .limit(1);

    if (!existingIncome) {
      return c.json({ error: 'Ingreso no encontrado' }, 404);
    }

    if (body.categoryId) {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, body.categoryId))
        .limit(1);

      if (!category || category.type !== 'income') {
        return c.json({ error: 'Categoría de ingreso inválida' }, 400);
      }
    }

    const [updatedIncome] = await db
      .update(incomes)
      .set({
        amount: body.amount,
        categoryId: body.categoryId,
        note: body.note,
        date: body.date ? new Date(body.date) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(incomes.id, incomeIdResult.data),
          eq(incomes.userId, userId),
          eq(incomes.isActive, true),
        ),
      )
      .returning();

    return c.json(updatedIncome);
  },
);

app.delete('/api/incomes/:incomeId', async (c) => {
  const userId = c.get('userId');
  const incomeId = c.req.param('incomeId');
  const incomeIdResult = z.string().uuid().safeParse(incomeId);
  if (!incomeIdResult.success) {
    return c.json({ error: 'incomeId inválido' }, 400);
  }

  const result = await db
    .update(incomes)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(incomes.id, incomeIdResult.data),
        eq(incomes.userId, userId),
        eq(incomes.isActive, true),
      ),
    )
    .returning({ id: incomes.id });

  if (result.length === 0) {
    return c.json({ error: 'Ingreso no encontrado' }, 404);
  }

  return c.json({ success: true, id: result[0].id });
});

app.post('/api/expenses', zValidator('json', expenseSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, body.categoryId))
    .limit(1);

  if (!category || category.type !== 'expense') {
    return c.json({ error: 'Categoría de gasto inválida' }, 400);
  }

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

app.get('/api/expenses/:expenseId', async (c) => {
  const userId = c.get('userId');
  const expenseId = c.req.param('expenseId');
  const expenseIdResult = z.string().uuid().safeParse(expenseId);
  if (!expenseIdResult.success) {
    return c.json({ error: 'expenseId inválido' }, 400);
  }

  const [expense] = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.id, expenseIdResult.data),
        eq(expenses.userId, userId),
        eq(expenses.isActive, true),
      ),
    )
    .limit(1);

  if (!expense) {
    return c.json({ error: 'Gasto no encontrado' }, 404);
  }

  return c.json(expense);
});

app.patch(
  '/api/expenses/:expenseId',
  zValidator('json', expenseUpdateSchema),
  async (c) => {
    const userId = c.get('userId');
    const expenseId = c.req.param('expenseId');
    const expenseIdResult = z.string().uuid().safeParse(expenseId);
    if (!expenseIdResult.success) {
      return c.json({ error: 'expenseId inválido' }, 400);
    }

    const body = c.req.valid('json');

    const [existingExpense] = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.id, expenseIdResult.data),
          eq(expenses.userId, userId),
          eq(expenses.isActive, true),
        ),
      )
      .limit(1);

    if (!existingExpense) {
      return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    if (body.categoryId) {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, body.categoryId))
        .limit(1);

      if (!category || category.type !== 'expense') {
        return c.json({ error: 'Categoría de gasto inválida' }, 400);
      }
    }

    const [updatedExpense] = await db
      .update(expenses)
      .set({
        amount: body.amount,
        categoryId: body.categoryId,
        note: body.note,
        date: body.date ? new Date(body.date) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(eq(expenses.id, expenseIdResult.data), eq(expenses.userId, userId)),
      )
      .returning();

    return c.json(updatedExpense);
  },
);

app.delete('/api/expenses/:expenseId', async (c) => {
  const userId = c.get('userId');
  const expenseId = c.req.param('expenseId');
  const expenseIdResult = z.string().uuid().safeParse(expenseId);
  if (!expenseIdResult.success) {
    return c.json({ error: 'expenseId inválido' }, 400);
  }

  const result = await db
    .update(expenses)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(expenses.id, expenseIdResult.data),
        eq(expenses.userId, userId),
        eq(expenses.isActive, true),
      ),
    )
    .returning({ id: expenses.id });

  if (result.length === 0) {
    return c.json({ error: 'Gasto no encontrado' }, 404);
  }

  return c.json({ success: true, id: result[0].id });
});

app.get('/api/expenses', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.query('boardId');
  if (!boardId) return c.json({ error: 'boardId is required' }, 400);

  const result = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.boardId, boardId),
        eq(expenses.isActive, true),
      ),
    );

  return c.json(result);
});

app.post('/api/expenses', zValidator('json', expenseSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Validar que la categoría sea de tipo 'expense'
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, body.categoryId))
    .limit(1);

  if (!category || category.type !== 'expense') {
    return c.json({ error: 'Categoría de gasto inválida' }, 400);
  }

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
    const allCategories = await db.select().from(categories);
    const categoryInputs: CategoryInput[] = allCategories.map((c) => ({
      name: c.name,
      type: c.type,
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
          error instanceof Error ? error.message : 'Failed to process receipt',
      },
      500,
    );
  }
});

app.get('/api/categories', async (c) => {
  const type = c.req.query('type');
  let query = db.select().from(categories);

  if (type === 'income' || type === 'expense') {
    // @ts-expect-error - drizzle type complexity
    query = query.where(eq(categories.type, type));
  }

  const allCategories = await query;

  const parentCategories = allCategories.filter((cat) => !cat.parentId);
  const result = parentCategories.map((parent) => ({
    ...parent,
    subcategories: allCategories
      .filter((cat) => cat.parentId === parent.id)
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        emoji: sub.emoji,
      })),
  }));

  return c.json(result);
});

export const handler = handle(app);
