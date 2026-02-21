import {
  createOpenAuthClient,
  normalizeAuthIssuer,
} from '@maimoni/auth/client';

type Challenge = {
  state: string;
  verifier?: string;
};

type AccessTokenPayload = {
  sub?: string;
  properties?: {
    phoneNumber?: string;
  };
};

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const base64 =
    padding === 0 ? normalized : normalized + '='.repeat(4 - padding);
  return atob(base64);
}

function readMeta(name: string) {
  if (typeof document === 'undefined') {
    return '';
  }

  return (
    document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
    ''
  );
}

export function getApiBase() {
  const raw = import.meta.env.VITE_API_URL ?? readMeta('maimoni-api-url') ?? '';
  const normalized = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return normalized.endsWith('/api') ? normalized.slice(0, -4) : normalized;
}

export function getAuthBase() {
  const raw =
    import.meta.env.VITE_AUTH_URL ?? readMeta('maimoni-auth-url') ?? '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function getClient() {
  return createOpenAuthClient(normalizeAuthIssuer(getAuthBase()), 'webapp');
}

export async function startAuth(provider: 'anonymous' | 'whatsapp') {
  const redirectUri = `${window.location.origin}/callback/auth`;
  const { challenge, url } = await getClient().authorize(redirectUri, 'code', {
    provider,
    pkce: true,
  });

  localStorage.setItem('auth_challenge', JSON.stringify(challenge));
  window.location.href = url;
}

export async function finishAuthFromCallback(search: URLSearchParams) {
  const code = search.get('code');
  if (!code) {
    throw new Error('Missing code');
  }

  const challengeRaw = localStorage.getItem('auth_challenge');
  if (!challengeRaw) {
    throw new Error('Missing auth challenge');
  }

  const challenge = JSON.parse(challengeRaw) as Challenge;
  const redirectUri = `${window.location.origin}/callback/auth`;
  const exchanged = await getClient().exchange(
    code,
    redirectUri,
    challenge.verifier,
  );

  if (exchanged.err || !exchanged.tokens) {
    throw new Error('Failed to exchange authorization code');
  }

  localStorage.removeItem('auth_challenge');
  localStorage.setItem('accessToken', exchanged.tokens.access);
  localStorage.setItem('refreshToken', exchanged.tokens.refresh);

  const payload = JSON.parse(
    decodeBase64Url(exchanged.tokens.access.split('.')[1] ?? ''),
  ) as AccessTokenPayload;

  if (payload.properties?.phoneNumber) {
    localStorage.removeItem('anonymousId');
  } else if (payload.sub) {
    localStorage.setItem('anonymousId', payload.sub);
  }
}
