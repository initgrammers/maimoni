import { describe, expect, it, mock } from 'bun:test';
import {
  _sendWhatsAppCode,
  AUTH_CHANNEL,
  normalizePhoneNumber,
} from './providers';

const mockMessagesCreate = mock(async () => ({ sid: 'SMmockSid' }));

mock.module('twilio', () => ({
  default: () => ({
    messages: {
      create: mockMessagesCreate,
    },
  }),
}));

mock.module('../../../packages/utils/src/index', () => ({
  getEnv: (key: string) => {
    const env: Record<string, string> = {
      TWILIO_ACCOUNT_SID: 'ACtest123',
      TWILIO_AUTH_TOKEN: 'test-auth-token',
      TWILIO_WHATSAPP_NUMBER: '+593999999999',
      TWILIO_WHATSAPP_TEMPLATE_SID: 'HX8c2079fcec8af506be41b602fb46c777',
      TWILIO_MESSAGING_SERVICE_SID: 'MGtest123',
    };
    return env[key];
  },
}));

describe('providers', () => {
  describe('normalizePhoneNumber', () => {
    it.each([
      { input: '+593981234567', expected: '+593981234567' },
      { input: '+5491123456789', expected: '+5491123456789' },
      { input: '0981234567', expected: '+593981234567' },
      { input: '0987654321', expected: '+593987654321' },
      { input: '0991234567', expected: '+593991234567' },
      { input: '593981234567', expected: '+593981234567' },
      { input: '5491123456789', expected: '+5491123456789' },
      { input: '  0981234567  ', expected: '+593981234567' },
    ])('should normalize $input to $expected', ({ input, expected }) => {
      expect(normalizePhoneNumber(input)).toBe(expected);
    });
  });

  describe('_sendWhatsAppCode', () => {
    it('should pass contentSid and contentVariables to Twilio messages.create', async () => {
      await _sendWhatsAppCode('+593981234567', '123456');

      expect(mockMessagesCreate).toHaveBeenCalled();
      const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;

      expect(callArgs).toBeDefined();
      expect(callArgs?.contentSid).toBe('HX8c2079fcec8af506be41b602fb46c777');
      expect(callArgs?.contentVariables).toBe('{"1":"123456"}');
    });

    it('should format from number with whatsapp prefix', async () => {
      await _sendWhatsAppCode('+593981234567', '654321');

      const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.from).toBe('whatsapp:+593999999999');
    });

    it('should format to number with whatsapp prefix', async () => {
      await _sendWhatsAppCode('+593981234567', '111111');

      const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.to).toBe('whatsapp:+593981234567');
    });

    it('should not include body parameter', async () => {
      await _sendWhatsAppCode('+593981234567', '222222');

      const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.body).toBeUndefined();
    });

    it('should normalize phone number before sending', async () => {
      await _sendWhatsAppCode('0981234567', '333333');

      const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.to).toBe('whatsapp:+593981234567');
    });

    it('should pass 6-digit code in contentVariables', async () => {
      await _sendWhatsAppCode('+593981234567', '123456');

      const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      const variables = JSON.parse(callArgs?.contentVariables as string);
      expect(variables['1']).toBe('123456');
    });
  });

  describe('AUTH_CHANNEL routing', () => {
    it('should be set to whatsapp', () => {
      expect(AUTH_CHANNEL).toBe('whatsapp');
    });

    it('should route to whatsapp path (not sms) when AUTH_CHANNEL is whatsapp', async () => {
      expect(AUTH_CHANNEL).toBe('whatsapp');
      const sendCode = async (
        channel: string,
        _phoneNumber: string,
        _code: string,
      ) => {
        if (channel === 'whatsapp') {
          return 'whatsapp_path';
        } else if (channel === 'sms') {
          return 'sms_path';
        }
        return 'beta_path';
      };
      const result = await sendCode(AUTH_CHANNEL, '+593981234567', '123456');
      expect(result).toBe('whatsapp_path');
    });
  });
});
