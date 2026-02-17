import { redirect } from '@tanstack/react-router';

export function getClientAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('accessToken');
}

export function requireClientAuth() {
  const accessToken = getClientAccessToken();
  if (!accessToken) {
    throw redirect({ to: '/' as never });
  }

  return accessToken;
}
