export function createToken(subject: string) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replaceAll(
    '=',
    '',
  );
  const payload = btoa(
    JSON.stringify({ sub: subject, iat: Math.floor(Date.now() / 1000) }),
  ).replaceAll('=', '');
  return `${header}.${payload}.dev`;
}

export async function hashToUuid(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function decodeSubject(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = JSON.parse(atob(parts[1])) as { sub?: string };
  return payload.sub ?? null;
}
