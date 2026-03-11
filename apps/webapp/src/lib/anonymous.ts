/**
 * Anonymous user initialization and management
 * Handles creation of anonymous users and token storage
 */

const ANONYMOUS_ID_KEY = 'anonymousId';
const ANONYMOUS_TOKEN_KEY = 'anonymousToken';

// Auth server URL from environment
const AUTH_URL =
  typeof window !== 'undefined'
    ? import.meta.env.VITE_AUTH_URL || '/auth'
    : '/auth';

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
 * Create an anonymous user via auth server and obtain JWT token
 * Called when no accessToken exists and no anonymousId is found
 */
export async function initializeAnonymousUser(): Promise<AnonymousUser | null> {
  try {
    // Call the auth server to create anonymous user
    // The auth server will create the user in DB and return a JWT token
    const response = await fetch(`${AUTH_URL}/anonymous/authorize`, {
      method: 'GET',
      credentials: 'include', // Include cookies for session
    });

    if (!response.ok) {
      console.error('Failed to create anonymous user:', response.statusText);
      return null;
    }

    // The auth server should redirect or return the token
    // For anonymous, we need to extract the user info from the response
    // or from the session cookie

    // If the response contains the token directly
    const data = await response.json();

    // Extract user ID from the token or response
    const token = data.access_token || data.token;
    const userId = data.user?.id || data.sub || data.userId;

    if (!token || !userId) {
      console.error('No token or userId returned from auth server');
      return null;
    }

    // Store credentials
    storeAnonymousCredentials(userId, token);

    return {
      anonymousId: userId,
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
  if (typeof window === 'undefined') return null;

  // First check for authenticated token
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    return accessToken;
  }

  // Fall back to anonymous token in local mode
  return getAnonymousToken();
}
