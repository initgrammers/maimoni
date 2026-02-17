import { authSubjects, subjectFromPhone } from '@maimoni/auth';
import { createClient, syncUser } from '@maimoni/db';
import { issuer } from '@openauthjs/openauth';
import { CodeProvider } from '@openauthjs/openauth/provider/code';
import type { Provider } from '@openauthjs/openauth/provider/provider';
import { MemoryStorage } from '@openauthjs/openauth/storage/memory';
import { CodeUI } from '@openauthjs/openauth/ui/code';
import { handle } from 'hono/aws-lambda';
import twilio from 'twilio';
import { getEnv } from '../../../packages/utils/src/index';

const db = createClient(getEnv('DATABASE_URL'));

const AnonymousProvider = (): Provider<Record<string, never>> => ({
  type: 'anonymous',
  init(route, options) {
    route.get('/authorize', async (c) => {
      const response = await options.success(c, {});
      return options.forward(c, response);
    });
  },
});

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured');
  }

  if (!accountSid.startsWith('AC')) {
    throw new Error('TWILIO_ACCOUNT_SID must start with AC');
  }

  return twilio(accountSid, authToken);
}

function toEcuadorPhoneNumber(input: string) {
  const normalized = input.trim();
  if (normalized.startsWith('+')) {
    return normalized;
  }

  const digits = normalized.replace(/\D/g, '');
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  return `+593${local}`;
}

const authIssuer = issuer({
  storage: MemoryStorage({
    persist: '/tmp/openauth-store.json',
  }),
  subjects: authSubjects,
  providers: {
    anonymous: AnonymousProvider(),
    whatsapp: CodeProvider(
      CodeUI({
        mode: 'phone',
        copy: {
          email_placeholder: 'Telefono',
          code_info: 'Te enviaremos un codigo por WhatsApp.',
        },
        sendCode: async (claims, code) => {
          const phoneNumber = claims.phone ?? claims.phoneNumber;
          if (!phoneNumber) throw new Error('Phone number is required');
          const ecuadorPhoneNumber = toEcuadorPhoneNumber(phoneNumber);
          console.log('Sending code to', code);
          const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
          if (!whatsappNumber) {
            throw new Error('TWILIO_WHATSAPP_NUMBER is not configured');
          }

          const twilioClient = getTwilioClient();

          await twilioClient.messages.create({
            body: `Tu codigo de verificacion para Maimonei es: ${code}`,
            from: `whatsapp:${whatsappNumber}`,
            to: `whatsapp:${ecuadorPhoneNumber}`,
          });
        },
      }),
    ),
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
          phoneNumber: undefined,
        },
        { subject: userId },
      );
    }

    throw new Error('Invalid provider');
  },
});

export const handler = handle(authIssuer);
