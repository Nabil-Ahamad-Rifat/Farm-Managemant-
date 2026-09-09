import { use, createContext, useMemo, type PropsWithChildren } from 'react';
import type { AuthUser } from '@farm/shared-types';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useStorageState } from '@/src/lib/useStorageState';

interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, tenantName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useSession must be used within an <AuthProvider>');
  }
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [[isAccessLoading, accessToken], setAccessToken] = useStorageState('accessToken');
  const [[isRefreshLoading, refreshToken], setRefreshToken] = useStorageState('refreshToken');
  const [[isUserLoading, userJson], setUserJson] = useStorageState('user');

  const isLoading = isAccessLoading || isRefreshLoading || isUserLoading;
  const user: AuthUser | null = useMemo(() => {
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as AuthUser;
    } catch {
      return null;
    }
  }, [userJson]);

  function persistSession(session: AuthSession) {
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setUserJson(JSON.stringify(session.user));
  }

  function clearSession() {
    setAccessToken(null);
    setRefreshToken(null);
    setUserJson(null);
  }

  const value: AuthContextValue = {
    user,
    isLoading,

    async signIn(email, password) {
      const session = await mobileApiClient.post<AuthSession>(
        '/api/auth/login',
        { email, password },
        'Invalid email or password'
      );
      persistSession(session);
    },

    async signUp(name, email, password, tenantName) {
      const session = await mobileApiClient.post<AuthSession>(
        '/api/auth/register',
        { name, email, password, tenantName },
        'Could not create your account'
      );
      persistSession(session);
    },

    async signOut() {
      try {
        await mobileApiClient.post('/api/auth/logout', { refreshToken });
      } catch {
        // Best-effort server-side revoke — always clear local state below
        // even if the network call fails (e.g. offline).
      }
      clearSession();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
