import { createHash, randomBytes } from 'node:crypto';
import { zValidator } from '@hono/zod-validator';
import type { CategoryInput } from '@maimoni/ai';
import { extractReceiptInfo } from '@maimoni/ai';
import {
  boardMembers,
  boards,
  categories,
  claimAnonymousData,
  createClient as createDbClient,
  expenses,
  getOrCreateInitialBoard,
  incomes,
  invitations,
  users,
} from '@maimoni/db';
import { and, eq, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { z } from 'zod';
import { getEnv } from '../../../packages/utils/src/index';
import { authMiddleware, type UserContext } from './middleware';

const app = new Hono<UserContext>();

const db = createDbClient(getEnv('DATABASE_URL'));

type BoardAccessRole = 'owner' | 'editor' | 'viewer';

function createInviteToken() {
  return randomBytes(32).toString('base64url');
}

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function isMissingColumnError(error: unknown) {
  const queue: unknown[] = [error];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const candidate = current as {
      code?: string;
      message?: string;
      stack?: string;
      cause?: unknown;
    };

    const combinedText =
      `${candidate.message ?? ''}\n${candidate.stack ?? ''}\n${String(candidate)}`.toLowerCase();

    if (
      candidate.code === '42703' ||
      combinedText.includes('42703') ||
      combinedText.includes('does not exist')
    ) {
      return true;
    }

    if ('cause' in candidate) {
      queue.push(candidate.cause);
    }

    for (const key of Object.getOwnPropertyNames(candidate)) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (!descriptor || !('value' in descriptor)) {
        continue;
      }

      const value = descriptor.value;
      if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return false;
}

async function ensureInvitationsSchemaIsReady() {
  try {
    await db
      .select({
        id: invitations.id,
        invitedByUserId: invitations.invitedByUserId,
        inviteTokenHash: invitations.inviteTokenHash,
      })
      .from(invitations)
      .limit(1);

    return null;
  } catch (error) {
    if (isMissingColumnError(error)) {
      return 'Invitaciones no disponibles: falta aplicar la migración 0004_invitation_membership_upgrade.sql';
    }

    const errorText =
      error instanceof Error
        ? `${error.message}\n${error.stack ?? ''}`.toLowerCase()
        : '';
    if (
      errorText.includes('failed query') &&
      errorText.includes('invitations')
    ) {
      return 'Invitaciones temporalmente no disponibles en este entorno';
    }

    return 'Invitaciones temporalmente no disponibles en este entorno';
  }
}

async function getUserBoardRole(userId: string, boardId: string) {
  const [board] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.isActive, true)))
    .limit(1);

  if (!board) {
    return null;
  }

  if (board.ownerId === userId) {
    return { board, role: 'owner' as BoardAccessRole };
  }

  const [membership] = await db
    .select()
    .from(boardMembers)
    .where(
      and(
        eq(boardMembers.boardId, boardId),
        eq(boardMembers.userId, userId),
        eq(boardMembers.isActive, true),
      ),
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return { board, role: 'editor' as BoardAccessRole };
}

async function getOrSelectAccessibleBoard(
  userId: string,
  requestedBoardId?: string,
) {
  if (requestedBoardId) {
    const access = await getUserBoardRole(userId, requestedBoardId);
    if (!access) {
      return null;
    }

    return access;
  }

  const [ownedBoard] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.ownerId, userId), eq(boards.isActive, true)))
    .limit(1);

  if (ownedBoard) {
    return { board: ownedBoard, role: 'owner' as BoardAccessRole };
  }

  const [membership] = await db
    .select()
    .from(boardMembers)
    .where(
      and(eq(boardMembers.userId, userId), eq(boardMembers.isActive, true)),
    )
    .limit(1);

  if (membership) {
    const access = await getUserBoardRole(userId, membership.boardId);
    if (access) {
      return access;
    }
  }

  const board = await getOrCreateInitialBoard(db, { userId });
  return { board, role: 'owner' as BoardAccessRole };
}

async function listUserBoards(userId: string) {
  const [ownedBoards, memberships] = await Promise.all([
    db
      .select({
        id: boards.id,
        name: boards.name,
        spendingLimitAmount: boards.spendingLimitAmount,
      })
      .from(boards)
      .where(and(eq(boards.ownerId, userId), eq(boards.isActive, true))),
    db
      .select({
        boardId: boardMembers.boardId,
      })
      .from(boardMembers)
      .where(
        and(eq(boardMembers.userId, userId), eq(boardMembers.isActive, true)),
      ),
  ]);

  const membershipBoardIds = memberships.map(
    (membership) => membership.boardId,
  );
  const membershipBoards =
    membershipBoardIds.length === 0
      ? []
      : await db
          .select({
            id: boards.id,
            name: boards.name,
            spendingLimitAmount: boards.spendingLimitAmount,
          })
          .from(boards)
          .where(
            and(
              eq(boards.isActive, true),
              or(
                ...membershipBoardIds.map((boardId) => eq(boards.id, boardId)),
              ),
            ),
          );

  const results: Array<{
    id: string;
    name: string;
    spendingLimitAmount: string | null;
    role: BoardAccessRole;
  }> = [];

  for (const board of ownedBoards) {
    results.push({
      id: board.id,
      name: board.name,
      spendingLimitAmount: board.spendingLimitAmount,
      role: 'owner',
    });
  }

  for (const board of membershipBoards) {
    if (results.some((item) => item.id === board.id)) {
      continue;
    }

    results.push({
      id: board.id,
      name: board.name,
      spendingLimitAmount: board.spendingLimitAmount,
      role: 'editor',
    });
  }

  return results;
}

const createInvitationSchema = z.object({
  targetRole: z.enum(['editor', 'viewer']).default('editor'),
  phoneNumber: z.string().min(4).optional(),
  ttlHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .optional(),
});

const invitationActionSchema = z.object({
  token: z.string().min(20),
});

app.use('/api/*', authMiddleware);

app.get('/api/dashboard', async (c) => {
  const userId = c.get('userId');
  const requestedBoardId = c.req.query('boardId');
  const access = await getOrSelectAccessibleBoard(userId, requestedBoardId);

  if (!access) {
    return c.json({ error: 'No tienes acceso a este tablero' }, 403);
  }

  const { board, role } = access;

  const [incomeRows, expenseRows] = await Promise.all([
    db
      .select({
        income: incomes,
        categoryName: categories.name,
        categoryEmoji: categories.emoji,
      })
      .from(incomes)
      .innerJoin(categories, eq(incomes.categoryId, categories.id))
      .where(and(eq(incomes.boardId, board.id), eq(incomes.isActive, true))),
    db
      .select({
        expense: expenses,
        categoryName: categories.name,
        categoryEmoji: categories.emoji,
      })
      .from(expenses)
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(and(eq(expenses.boardId, board.id), eq(expenses.isActive, true))),
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
    role,
    boards: await listUserBoards(userId),
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

app.post(
  '/api/boards/:boardId/invitations',
  zValidator('json', createInvitationSchema),
  async (c) => {
    const invitationSchemaError = await ensureInvitationsSchemaIsReady();
    if (invitationSchemaError) {
      return c.json({ error: invitationSchemaError }, 503);
    }

    const userId = c.get('userId');
    const boardId = c.req.param('boardId');
    const boardIdResult = z.string().uuid().safeParse(boardId);
    if (!boardIdResult.success) {
      return c.json({ error: 'boardId inválido' }, 400);
    }

    const access = await getUserBoardRole(userId, boardIdResult.data);
    if (!access) {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }
    if (access.role === 'viewer') {
      return c.json(
        { error: 'No tienes permisos para invitar en este tablero' },
        403,
      );
    }

    const body = c.req.valid('json');
    const inviteToken = createInviteToken();
    const inviteTokenHash = hashInviteToken(inviteToken);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (body.ttlHours ?? 24 * 7) * 60 * 60 * 1000,
    );

    const [invitation] = await db
      .insert(invitations)
      .values({
        boardId: boardIdResult.data,
        invitedByUserId: userId,
        invitedPhoneNumber: body.phoneNumber,
        inviteTokenHash,
        targetRole: body.targetRole,
        status: 'pending',
        expiresAt,
        isActive: true,
      })
      .returning();

    return c.json({
      invitation,
      inviteToken,
    });
  },
);

app.get('/api/boards/:boardId/invitations', async (c) => {
  const invitationSchemaError = await ensureInvitationsSchemaIsReady();
  if (invitationSchemaError) {
    return c.json({ error: invitationSchemaError }, 503);
  }

  const userId = c.get('userId');
  const boardId = c.req.param('boardId');
  const status = c.req.query('status');
  const boardIdResult = z.string().uuid().safeParse(boardId);
  if (!boardIdResult.success) {
    return c.json({ error: 'boardId inválido' }, 400);
  }

  const access = await getUserBoardRole(userId, boardIdResult.data);
  if (!access) {
    return c.json({ error: 'Tablero no encontrado' }, 404);
  }

  const baseWhere = and(
    eq(invitations.boardId, boardIdResult.data),
    eq(invitations.isActive, true),
  );

  const rows = await db
    .select({
      invitation: invitations,
      inviterName: users.name,
      inviterPhone: users.phoneNumber,
    })
    .from(invitations)
    .leftJoin(users, eq(invitations.invitedByUserId, users.id))
    .where(status ? and(baseWhere, eq(invitations.status, status)) : baseWhere);

  return c.json(
    rows.map(({ invitation, inviterName, inviterPhone }) => ({
      ...invitation,
      inviterName,
      inviterPhone,
    })),
  );
});

app.post('/api/invitations/:invitationId/revoke', async (c) => {
  const invitationSchemaError = await ensureInvitationsSchemaIsReady();
  if (invitationSchemaError) {
    return c.json({ error: invitationSchemaError }, 503);
  }

  const userId = c.get('userId');
  const invitationId = c.req.param('invitationId');
  const invitationIdResult = z.string().uuid().safeParse(invitationId);
  if (!invitationIdResult.success) {
    return c.json({ error: 'invitationId inválido' }, 400);
  }

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationIdResult.data),
        eq(invitations.isActive, true),
      ),
    )
    .limit(1);

  if (!invitation) {
    return c.json({ error: 'Invitación no encontrada' }, 404);
  }

  const access = await getUserBoardRole(userId, invitation.boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a esta invitación' }, 403);
  }
  if (access.role === 'viewer') {
    return c.json(
      { error: 'No tienes permisos para revocar invitaciones' },
      403,
    );
  }

  if (invitation.status !== 'pending') {
    return c.json(
      { error: 'Solo se pueden revocar invitaciones pendientes' },
      400,
    );
  }

  const [updated] = await db
    .update(invitations)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      updatedAt: new Date(),
      isActive: false,
    })
    .where(eq(invitations.id, invitation.id))
    .returning();

  return c.json({ invitation: updated });
});

app.get('/api/invitations/resolve', async (c) => {
  const invitationSchemaError = await ensureInvitationsSchemaIsReady();
  if (invitationSchemaError) {
    return c.json({ error: invitationSchemaError }, 503);
  }

  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'token es requerido' }, 400);
  }

  const tokenHash = hashInviteToken(token);
  const [resolved] = await db
    .select({
      invitation: invitations,
      boardName: boards.name,
      inviterName: users.name,
    })
    .from(invitations)
    .innerJoin(boards, eq(invitations.boardId, boards.id))
    .leftJoin(users, eq(invitations.invitedByUserId, users.id))
    .where(
      and(
        eq(invitations.inviteTokenHash, tokenHash),
        eq(invitations.isActive, true),
      ),
    )
    .limit(1);

  if (!resolved) {
    return c.json({ error: 'Invitación no encontrada' }, 404);
  }

  let status = resolved.invitation.status;
  const now = new Date();
  if (
    status === 'pending' &&
    resolved.invitation.expiresAt &&
    resolved.invitation.expiresAt <= now
  ) {
    const [expiredInvitation] = await db
      .update(invitations)
      .set({
        status: 'expired',
        isActive: false,
        updatedAt: now,
      })
      .where(eq(invitations.id, resolved.invitation.id))
      .returning();
    status = expiredInvitation?.status ?? 'expired';
  }

  return c.json({
    invitationId: resolved.invitation.id,
    boardId: resolved.invitation.boardId,
    boardName: resolved.boardName,
    targetRole: resolved.invitation.targetRole,
    status,
    expiresAt: resolved.invitation.expiresAt,
    inviterName: resolved.inviterName,
  });
});

app.post(
  '/api/invitations/accept',
  zValidator('json', invitationActionSchema),
  async (c) => {
    const invitationSchemaError = await ensureInvitationsSchemaIsReady();
    if (invitationSchemaError) {
      return c.json({ error: invitationSchemaError }, 503);
    }

    const userId = c.get('userId');
    const body = c.req.valid('json');
    const tokenHash = hashInviteToken(body.token);

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.inviteTokenHash, tokenHash),
          eq(invitations.isActive, true),
        ),
      )
      .limit(1);

    if (!invitation) {
      return c.json({ error: 'Invitación no encontrada' }, 404);
    }

    if (invitation.status !== 'pending') {
      return c.json({ error: 'Esta invitación ya no está disponible' }, 400);
    }

    if (invitation.expiresAt && invitation.expiresAt <= new Date()) {
      await db
        .update(invitations)
        .set({
          status: 'expired',
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id));
      return c.json({ error: 'Esta invitación expiró' }, 400);
    }

    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, invitation.boardId), eq(boards.isActive, true)))
      .limit(1);
    if (!board) {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }

    const [existingMembership] = await db
      .select()
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, invitation.boardId),
          eq(boardMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existingMembership) {
      await db
        .update(boardMembers)
        .set({
          isActive: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(boardMembers.boardId, invitation.boardId),
            eq(boardMembers.userId, userId),
          ),
        );
    } else {
      await db.insert(boardMembers).values({
        boardId: invitation.boardId,
        userId,
        isActive: true,
        joinedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const [updatedInvitation] = await db
      .update(invitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedByUserId: userId,
        inviteeUserId: userId,
        invitedAnonymousId: null,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitation.id))
      .returning();

    return c.json({
      invitation: updatedInvitation,
      boardId: invitation.boardId,
      alreadyMember: Boolean(existingMembership),
    });
  },
);

app.post(
  '/api/invitations/decline',
  zValidator('json', invitationActionSchema),
  async (c) => {
    const invitationSchemaError = await ensureInvitationsSchemaIsReady();
    if (invitationSchemaError) {
      return c.json({ error: invitationSchemaError }, 503);
    }

    const body = c.req.valid('json');
    const tokenHash = hashInviteToken(body.token);

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.inviteTokenHash, tokenHash),
          eq(invitations.isActive, true),
        ),
      )
      .limit(1);

    if (!invitation) {
      return c.json({ error: 'Invitación no encontrada' }, 404);
    }

    if (invitation.status !== 'pending') {
      return c.json({ error: 'Esta invitación ya fue procesada' }, 400);
    }

    const [updatedInvitation] = await db
      .update(invitations)
      .set({
        status: 'declined',
        declinedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitation.id))
      .returning();

    return c.json({ invitation: updatedInvitation });
  },
);

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

const boardSettingsSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    spendingLimitAmount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

app.get('/api/incomes', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.query('boardId');
  if (!boardId) return c.json({ error: 'boardId is required' }, 400);

  const access = await getUserBoardRole(userId, boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este tablero' }, 403);
  }

  const result = await db
    .select()
    .from(incomes)
    .where(and(eq(incomes.boardId, boardId), eq(incomes.isActive, true)));

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
    .where(and(eq(incomes.id, incomeIdResult.data), eq(incomes.isActive, true)))
    .limit(1);

  if (!income) {
    return c.json({ error: 'Ingreso no encontrado' }, 404);
  }

  const access = await getUserBoardRole(userId, income.boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este ingreso' }, 403);
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

    const access = await getUserBoardRole(userId, boardIdResult.data);
    if (!access) {
      return c.json({ error: 'Tablero no encontrado' }, 404);
    }

    if (access.role !== 'owner') {
      return c.json(
        { error: 'No tienes permisos para actualizar este tablero' },
        403,
      );
    }

    const body = c.req.valid('json');

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      updateFields.name = body.name;
    }

    if (body.spendingLimitAmount !== undefined) {
      updateFields.spendingLimitAmount = body.spendingLimitAmount;
    }

    const [updatedBoard] = await db
      .update(boards)
      .set(updateFields)
      .where(eq(boards.id, access.board.id))
      .returning();

    return c.json({ board: updatedBoard });
  },
);

app.delete('/api/boards/:boardId', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.param('boardId');
  const boardIdResult = z.string().uuid().safeParse(boardId);
  if (!boardIdResult.success) {
    return c.json({ error: 'boardId inválido' }, 400);
  }

  const access = await getUserBoardRole(userId, boardIdResult.data);
  if (!access) {
    return c.json({ error: 'Tablero no encontrado' }, 404);
  }

  if (access.role !== 'owner') {
    return c.json(
      { error: 'No tienes permisos para eliminar este tablero' },
      403,
    );
  }

  const userBoards = await listUserBoards(userId);
  if (userBoards.length <= 1) {
    return c.json({ error: 'No puedes eliminar tu único tablero' }, 400);
  }

  const result = await db
    .update(boards)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(boards.id, boardIdResult.data), eq(boards.isActive, true)))
    .returning({ id: boards.id });

  if (result.length === 0) {
    return c.json({ error: 'Tablero no encontrado' }, 404);
  }

  return c.json({ success: true, id: result[0].id });
});

app.post('/api/incomes', zValidator('json', incomeSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const access = await getUserBoardRole(userId, body.boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este tablero' }, 403);
  }
  if (access.role === 'viewer') {
    return c.json({ error: 'No tienes permisos para crear ingresos' }, 403);
  }

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
        and(eq(incomes.id, incomeIdResult.data), eq(incomes.isActive, true)),
      )
      .limit(1);

    if (!existingIncome) {
      return c.json({ error: 'Ingreso no encontrado' }, 404);
    }

    const access = await getUserBoardRole(userId, existingIncome.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este ingreso' }, 403);
    }
    if (access.role === 'viewer') {
      return c.json({ error: 'No tienes permisos para editar ingresos' }, 403);
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
          eq(incomes.boardId, existingIncome.boardId),
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
    .select()
    .from(incomes)
    .where(and(eq(incomes.id, incomeIdResult.data), eq(incomes.isActive, true)))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Ingreso no encontrado' }, 404);
  }

  const existingIncome = result[0];
  const access = await getUserBoardRole(userId, existingIncome.boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este ingreso' }, 403);
  }
  if (access.role === 'viewer') {
    return c.json({ error: 'No tienes permisos para eliminar ingresos' }, 403);
  }

  const deleted = await db
    .update(incomes)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(incomes.id, incomeIdResult.data),
        eq(incomes.boardId, existingIncome.boardId),
        eq(incomes.isActive, true),
      ),
    )
    .returning({ id: incomes.id });

  if (deleted.length === 0) {
    return c.json({ error: 'Ingreso no encontrado' }, 404);
  }

  return c.json({ success: true, id: deleted[0].id });
});

app.post('/api/expenses', zValidator('json', expenseSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const access = await getUserBoardRole(userId, body.boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este tablero' }, 403);
  }
  if (access.role === 'viewer') {
    return c.json({ error: 'No tienes permisos para crear gastos' }, 403);
  }

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
      and(eq(expenses.id, expenseIdResult.data), eq(expenses.isActive, true)),
    )
    .limit(1);

  if (!expense) {
    return c.json({ error: 'Gasto no encontrado' }, 404);
  }

  const access = await getUserBoardRole(userId, expense.boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este gasto' }, 403);
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
        and(eq(expenses.id, expenseIdResult.data), eq(expenses.isActive, true)),
      )
      .limit(1);

    if (!existingExpense) {
      return c.json({ error: 'Gasto no encontrado' }, 404);
    }

    const access = await getUserBoardRole(userId, existingExpense.boardId);
    if (!access) {
      return c.json({ error: 'No tienes acceso a este gasto' }, 403);
    }
    if (access.role === 'viewer') {
      return c.json({ error: 'No tienes permisos para editar gastos' }, 403);
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
        and(
          eq(expenses.id, expenseIdResult.data),
          eq(expenses.boardId, existingExpense.boardId),
          eq(expenses.isActive, true),
        ),
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

  const existingRows = await db
    .select()
    .from(expenses)
    .where(
      and(eq(expenses.id, expenseIdResult.data), eq(expenses.isActive, true)),
    )
    .limit(1);

  if (existingRows.length === 0) {
    return c.json({ error: 'Gasto no encontrado' }, 404);
  }

  const existingExpense = existingRows[0];
  const access = await getUserBoardRole(userId, existingExpense.boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este gasto' }, 403);
  }
  if (access.role === 'viewer') {
    return c.json({ error: 'No tienes permisos para eliminar gastos' }, 403);
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
        eq(expenses.boardId, existingExpense.boardId),
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

  const access = await getUserBoardRole(userId, boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este tablero' }, 403);
  }

  const result = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.boardId, boardId), eq(expenses.isActive, true)));

  return c.json(result);
});

app.post('/api/expenses', zValidator('json', expenseSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const access = await getUserBoardRole(userId, body.boardId);
  if (!access) {
    return c.json({ error: 'No tienes acceso a este tablero' }, 403);
  }
  if (access.role === 'viewer') {
    return c.json({ error: 'No tienes permisos para crear gastos' }, 403);
  }

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
export { app };
