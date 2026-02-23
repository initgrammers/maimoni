import { createClient } from '@openauthjs/openauth/client';
import { createSubjects } from '@openauthjs/openauth/subject';
import { object, optional, string } from 'valibot';

export const authSubjects = createSubjects({
  user: object({
    id: string(),
    phoneNumber: optional(string()),
  }),
});

export function normalizeAuthIssuer(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function createOpenAuthClient(
  issuer: string,
  clientID: string,
  fetcher?: Fetcher,
) {
  return createClient({
    issuer: normalizeAuthIssuer(issuer),
    clientID,
    fetch: fetcher as typeof fetch | undefined,
  });
}
