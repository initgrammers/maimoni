import {
  DynamoStorage,
  type DynamoStorageOptions,
} from '@openauthjs/openauth/storage/dynamo';
import {
  MemoryStorage,
  type MemoryStorageOptions,
} from '@openauthjs/openauth/storage/memory';

export { issuer } from '@openauthjs/openauth';
export type { AuthorizationState } from '@openauthjs/openauth/issuer';
export { CodeProvider } from '@openauthjs/openauth/provider/code';
export type { Provider } from '@openauthjs/openauth/provider/provider';
export { CodeUI } from '@openauthjs/openauth/ui/code';

export const createStorage = (
  input:
    | { type: 'dynamo'; options: DynamoStorageOptions }
    | { type: 'memory'; options: MemoryStorageOptions },
) => {
  return input.type === 'dynamo'
    ? DynamoStorage(input.options)
    : MemoryStorage(input.options);
};

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
