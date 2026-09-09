import * as SplashScreen from 'expo-splash-screen';
import { useSession } from '@/src/context/AuthContext';

SplashScreen.preventAutoHideAsync();

// Keeps the native splash screen up while we check SecureStore for an
// existing session, so the login screen never flashes before redirecting an
// already-authenticated user into the app.
export function SplashScreenController() {
  const { isLoading } = useSession();

  if (!isLoading) {
    SplashScreen.hide();
  }

  return null;
}
