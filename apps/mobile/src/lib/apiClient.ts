import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createApiClient } from '@farm/api-client';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function getStoredAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync('accessToken');
}

// Every request from this client identifies itself as mobile (so the backend
// returns tokens in the response body instead of relying on a cookie — see
// apps/web/src/lib/auth/clientType.ts) and attaches the stored Bearer token
// once one exists. Reads storage directly rather than through AuthContext so
// this stays a standalone module usable from anywhere, not just components.
export const mobileApiClient = createApiClient({
  baseUrl: API_URL,
  getAuthHeaders: async () => {
    const token = await getStoredAccessToken();
    return {
      'X-Client-Type': 'mobile',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },
});
