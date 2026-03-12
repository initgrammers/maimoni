import { CodeProvider, type Provider } from '@maimoni/auth';
import twilio from 'twilio';
import { getEnv } from '../../../packages/utils/src/index';
import { CustomCodeUI } from './custom-code-ui';

// Feature Flag: Selecciona el canal de envio de codigos
// 'whatsapp' = Envio por WhatsApp (produccion)
// 'sms' = Envio por SMS (fallback/testing)
// 'beta' = Modo beta - muestra mensaje de contacto a Henry
export const AUTH_CHANNEL = 'sms' as 'whatsapp' | 'sms' | 'beta';

function getTwilioClient() {
  const accountSid = getEnv('TWILIO_ACCOUNT_SID');
  const authToken = getEnv('TWILIO_AUTH_TOKEN');

  if (!accountSid.startsWith('AC')) {
    throw new Error('TWILIO_ACCOUNT_SID must start with AC');
  }

  return twilio(accountSid, authToken);
}

function normalizePhoneNumber(input: string) {
  const normalized = input.trim();
  // Already has country code
  if (normalized.startsWith('+')) {
    return normalized;
  }

  const digits = normalized.replace(/\D/g, '');
  // If starts with country code (54, 593)
  if (digits.startsWith('54') || digits.startsWith('593')) {
    return `+${digits}`;
  }
  // If starts with 0, remove it
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  // Default to Ecuador
  return `+593${local}`;
}

async function _sendWhatsAppCode(phoneNumber: string, code: string) {
  const whatsappNumber = getEnv('TWILIO_WHATSAPP_NUMBER');

  const twilioClient = getTwilioClient();
  const ecuadorPhoneNumber = normalizePhoneNumber(phoneNumber);

  await twilioClient.messages.create({
    body: `Tu codigo de verificacion para Maimonei es: ${code}`,
    from: `whatsapp:${whatsappNumber}`,
    to: `whatsapp:${ecuadorPhoneNumber}`,
  });
}

async function _sendSMSCode(phoneNumber: string, code: string) {
  const messagingServiceSid = getEnv('TWILIO_MESSAGING_SERVICE_SID');

  const twilioClient = getTwilioClient();
  const ecuadorPhoneNumber = normalizePhoneNumber(phoneNumber);

  await twilioClient.messages.create({
    body: `Tu codigo de verificacion para Maimoni es: ${code}`,
    messagingServiceSid,
    to: ecuadorPhoneNumber,
  });
}

async function _sendBetaModeMessage(phoneNumber: string, code: string) {
  console.log(
    '╔══════════════════════════════════════════════════════════════╗',
  );
  console.log(
    '║                    MODO BETA - MAIMONI                       ║',
  );
  console.log(
    '╠══════════════════════════════════════════════════════════════╣',
  );
  console.log(
    '║  Estamos en beta. Por favor consulte el código a:            ║',
  );
  console.log(
    '║                                                              ║',
  );
  console.log(
    '║  Henry Villavicencio                                         ║',
  );
  console.log(
    '║  WhatsApp: +593 978 847 449                                  ║',
  );
  console.log(
    '║                                                              ║',
  );
  console.log('║  Código generado:', code.padEnd(38, ' '), '║');
  console.log('║  Teléfono:', phoneNumber.padEnd(44, ' '), '║');
  console.log(
    '╚══════════════════════════════════════════════════════════════╝',
  );
}

const AnonymousProvider = (): Provider<Record<string, never>> => ({
  type: 'anonymous',
  init(route, options) {
    route.get('/authorize', async (c) => {
      const response = await options.success(c, {});
      return options.forward(c, response);
    });
  },
});

function getCodeInfoMessage(): string {
  if (AUTH_CHANNEL === 'beta') {
    return 'Estamos en modo beta. Consulte el código con Henry Villavicencio +593 978 847 449';
  }
  if (AUTH_CHANNEL === 'whatsapp') {
    return 'Te enviaremos un codigo por WhatsApp.';
  }
  return 'Te enviaremos un codigo por SMS.';
}

export const WhatsAppCodeProvider = CodeProvider(
  CustomCodeUI({
    codeInfo: getCodeInfoMessage(),
    buttonText: 'Enviar código',
    placeholder: '0981234567',
    sendCode: async (claims, code) => {
      const phoneNumber = claims.phone ?? claims.phoneNumber;
      if (!phoneNumber) throw new Error('Phone number is required');

      console.log('Sending code via', AUTH_CHANNEL, 'to', phoneNumber);
      console.log('Code:', code);

      // if (AUTH_CHANNEL === 'whatsapp') {
      //   await sendWhatsAppCode(phoneNumber, code);
      // } else if (AUTH_CHANNEL === 'sms') {
      //   await sendSMSCode(phoneNumber, code);
      // } else {
      //   await sendBetaModeMessage(phoneNumber, code);
      // }
    },
  }),
);

export { AnonymousProvider };
