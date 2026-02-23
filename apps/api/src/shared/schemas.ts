import { z } from 'zod';

export const createInvitationSchema = z.object({
  targetRole: z.enum(['editor', 'viewer']).default('editor'),
  phoneNumber: z.string().min(4).optional(),
  ttlHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .optional(),
});

export const invitationActionSchema = z.object({
  token: z.string().min(20),
});

export const incomeSchema = z.object({
  boardId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  categoryId: z.string().uuid(),
  note: z.string().optional(),
  date: z.string().datetime().optional(),
});

export const expenseSchema = z.object({
  boardId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  categoryId: z.string().uuid(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  receiptUrl: z.string().url().optional(),
  date: z.string().datetime().optional(),
});

export const expenseUpdateSchema = z
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

export const incomeUpdateSchema = z
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

export const boardSettingsSchema = z
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
