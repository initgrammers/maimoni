import { createSubjects, issuer } from '@openauthjs/openauth';
import { CodeProvider } from '@openauthjs/openauth/provider/code';
import { CodeUI } from '@openauthjs/openauth/ui/code';
import { Hono } from 'hono';
import twilio from 'twilio';
import { object, string } from 'valibot';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const app = new Hono();

const subjects = createSubjects({
  user: object({
    phoneNumber: string(),
  }),
});

const authIssuer = issuer({
  subjects,
  providers: {
    whatsapp: CodeProvider(
      CodeUI({
        sendCode: async (claims, code) => {
          const phoneNumber = claims.phoneNumber;
          if (!phoneNumber) throw new Error('Phone number is required');

          await twilioClient.messages.create({
            body: `Tu código de verificación para Maimonei es: ${code}`,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${phoneNumber}`,
          });
        },
      }),
    ),
  },
  success: async (ctx, value) => {
    if (value.provider === 'whatsapp') {
      return ctx.subject('user', {
        phoneNumber: value.claims.phoneNumber,
      });
    }
    throw new Error('Invalid provider');
  },
});

app.all('/auth/*', (c) => authIssuer.fetch(c.req.raw));

export default {
  port: 3001,
  fetch: app.fetch,
};
