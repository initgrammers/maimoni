import {
  authSubjects,
  createStorage,
  issuer,
  subjectFromPhone,
} from '@maimoni/auth';
import { createClient, syncUser } from '@maimoni/db';
import { handle } from 'hono/aws-lambda';
import { getEnv } from '../../../packages/utils/src/index';
import { AnonymousProvider, WhatsAppCodeProvider } from './providers';

const db = createClient(getEnv('DATABASE_URL'));

const storage = createStorage(JSON.parse(getEnv('AUTH_STORAGE')));

const issuerApp = issuer({
  allow: async () => true,
  storage,
  basePath: '/auth',
  subjects: authSubjects,
  providers: {
    anonymous: AnonymousProvider(),
    whatsapp: WhatsAppCodeProvider,
  },
  success: async (ctx, value) => {
    if (value.provider === 'whatsapp') {
      const phoneNumber = value.claims.phone ?? value.claims.phoneNumber;
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }
      const userId = await subjectFromPhone(phoneNumber);
      await syncUser(db, { id: userId, phoneNumber });
      return ctx.subject(
        'user',
        {
          id: userId,
          phoneNumber,
        },
        { subject: userId },
      );
    }

    if (value.provider === 'anonymous') {
      const userId = crypto.randomUUID();
      await syncUser(db, { id: userId, phoneNumber: null });
      return ctx.subject(
        'user',
        {
          id: userId,
          phoneNumber: undefined,
        },
        { subject: userId },
      );
    }

    throw new Error('Invalid provider');
  },
});

export const handler = handle(issuerApp);
