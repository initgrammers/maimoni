/**
 * Anonymous user initialization and management
 * Handles creation of anonymous users and token storage
 */

import { createToken } from './auth';

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
  const anonymousId = getAnonymousId();
  const accessToken = localStorage.getItem('accessToken');
  return !!anonymousId && !accessToken;
}

/**
 * Store anonymous user credentials in localStorage
 */
function storeAnonymousCredentials(anonymousId: string, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  localStorage.setItem(ANONYMOUS_TOKEN_KEY, token);
}

/**
 * Create an anonymous user and obtain JWT token
 * Called when no accessToken exists and no anonymousId is found
 */
export async function initializeAnonymousUser(): Promise<AnonymousUser | null> {
  try {
    const response = await fetch('/api/auth/anonymous', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to create anonymous user:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data.anonymousId) {
      console.error('No anonymousId returned from server');
      return null;
    }

    // Create a JWT token for the anonymous user
    const token = createToken(data.anonymousId);
    
    // Store credentials
    storeAnonymousCredentials(data.anonymousId, token);

    return {
      anonymousId: data.anonymousId,
      token,
    };
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
  // First check for authenticated token
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    return accessToken;
  }
  
  // Fall back to anonymous token in local mode
  return getAnonymousToken();
}
