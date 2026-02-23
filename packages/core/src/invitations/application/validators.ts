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
