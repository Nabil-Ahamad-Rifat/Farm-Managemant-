import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createApiClient } from '@farm/api-client';
import { setStorageItemAsync } from '@/src/lib/useStorageState';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

/** The stored Bearer token, for requests apiClient can't make itself (e.g. <Image> photo loads). */
export const getAccessToken = () => getStoredItem('accessToken');

interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

// AuthContext registers itself here on mount so that a refresh triggered
// from deep inside apiClient (outside of any signIn/signUp call) can still
// update the React state useStorageState holds — writing straight to
// SecureStore/localStorage below does NOT do that on its own, since
// useStorageState's state is only ever updated through its own setter.
type SessionListener = (tokens: RefreshedTokens | null) => void;
let sessionListener: SessionListener | null = null;
export function setSessionListener(listener: SessionListener | null) {
  sessionListener = listener;
}

// Multiple 401s firing at once (e.g. a screen's list fetch + a background
// refresh) must share one in-flight refresh call — the backend rotates the
// refresh token on every use and treats a second use of an already-rotated
// token as theft/replay, revoking the whole chain. Racing two refresh calls
// with the same stored token would trigger exactly that.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getStoredItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await setStorageItemAsync('accessToken', null);
        await setStorageItemAsync('refreshToken', null);
        await setStorageItemAsync('user', null);
        sessionListener?.(null);
        return false;
      }

      const tokens = (await res.json()) as RefreshedTokens;
      await setStorageItemAsync('accessToken', tokens.accessToken);
      await setStorageItemAsync('refreshToken', tokens.refreshToken);
      sessionListener?.(tokens);
      return true;
    } catch {
      // Network failure talking to /refresh — leave the stored session
      // alone (don't log the user out just because they're offline) and
      // let the original request's error surface as-is.
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// Every request from this client identifies itself as mobile (so the backend
// returns tokens in the response body instead of relying on a cookie — see
// apps/web/src/lib/auth/clientType.ts) and attaches the stored Bearer token
// once one exists. Reads storage directly rather than through AuthContext so
// this stays a standalone module usable from anywhere, not just components.
export const mobileApiClient = createApiClient({
  baseUrl: API_URL,
  getAuthHeaders: async () => {
    const token = await getStoredItem('accessToken');
    return {
      'X-Client-Type': 'mobile',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },
  onUnauthorized: refreshSession,
});
