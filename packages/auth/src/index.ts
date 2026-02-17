import { createClient } from '@openauthjs/openauth/client';
import { createSubjects } from '@openauthjs/openauth/subject';
import { object, optional, string } from 'valibot';

export const authSubjects = createSubjects({
  user: object({
    phoneNumber: optional(string()),
  }),
});

export function normalizeAuthIssuer(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function createOpenAuthClient(issuer: string, clientID: string) {
  return createClient({
    issuer: normalizeAuthIssuer(issuer),
    clientID,
  });
}

export function getSubjectIdFromAccessToken(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) {
    return undefined;
  }

  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf-8'),
  ) as { sub?: string };

  return payload.sub;
}

export async function subjectFromPhone(phoneNumber: string) {
  const bytes = new TextEncoder().encode(phoneNumber);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
