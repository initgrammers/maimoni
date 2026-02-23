import { z } from 'zod';

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
