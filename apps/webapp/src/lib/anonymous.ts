/**
 * Anonymous user initialization and management
 * Handles creation of anonymous users using the openauth library
 */

import { startAuth } from './openauth';

const ANONYMOUS_ID_KEY = 'anonymousId';
const ANONYMOUS_TOKEN_KEY = 'anonymousToken';

export interface AnonymousUser {
  anonymousId: string;
  token: string;
}

/**
 * Get the anonymous ID from localStorage
 */
export function getAnonymousId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ANONYMOUS_ID_KEY);
}

/**
 * Get the anonymous token from localStorage
 */
export function getAnonymousToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ANONYMOUS_TOKEN_KEY);
}

/**
 * Check if the app is in local mode (has anonymousId but no accessToken)
 */
export function isLocalMode(): boolean {
  if (typeof window === 'undefined') return false;
  const anonymousId = getAnonymousId();
  // Solo necesita anonymousId para modo local
  // El token puede existir pero expenses/incomes van a localStorage
  return !!anonymousId;
}

/**
 * Create an anonymous user via auth server
 * This triggers a redirect to the auth server for authentication
 * The callback at /callback/auth will handle saving the token
 */
export async function initializeAnonymousUser(): Promise<AnonymousUser | null> {
  try {
    // Use the existing openauth library to start anonymous auth
    // This will redirect to AUTH_URL/auth/anonymous/authorize
    // The callback at /callback/auth will save the token
    await startAuth('anonymous');

    // This function doesn't return because it redirects
    // The callback will handle the token saving
    return null;
  } catch (error) {
    console.error('Error initializing anonymous user:', error);
    return null;
  }
}

/**
 * Clear all anonymous data from localStorage
 * Called when user logs in or when migrating data
 */
export function clearAnonymousData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ANONYMOUS_ID_KEY);
  localStorage.removeItem(ANONYMOUS_TOKEN_KEY);
  // Also clear local expenses/incomes
  localStorage.removeItem('expenses');
  localStorage.removeItem('incomes');
}

/**
 * Get the anonymous token for API calls
 * Returns null if not in local mode
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // First check for authenticated token
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    return accessToken;
  }

  // Fall back to anonymous token in local mode
  return getAnonymousToken();
}
