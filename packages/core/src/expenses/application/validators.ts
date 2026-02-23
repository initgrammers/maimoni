import { z } from 'zod';

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
