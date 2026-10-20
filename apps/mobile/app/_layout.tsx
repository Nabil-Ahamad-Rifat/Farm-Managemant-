import '../global.css';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { AuthProvider, useSession } from '@/src/context/AuthContext';
import { SplashScreenController } from '@/src/components/SplashScreenController';
import { UpdateRequiredScreen } from '@/src/components/UpdateRequiredScreen';
import { fetchVersionInfo, isVersionBelow } from '@/src/lib/version';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashScreenController />
      <AppGate />
    </AuthProvider>
  );
}

function AppGate() {
  const [versionState, setVersionState] = useState<'checking' | 'ok' | 'blocked'>('checking');

  useEffect(() => {
    let cancelled = false;
    fetchVersionInfo().then((info) => {
      if (cancelled) return;
      const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
      setVersionState(info && isVersionBelow(currentVersion, info.forceUpdateBelow) ? 'blocked' : 'ok');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (versionState === 'checking') return null;
  if (versionState === 'blocked') return <UpdateRequiredScreen />;

  return <RootNavigator />;
}

function RootNavigator() {
  const { user } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="animal/[id]" options={{ headerShown: true, title: 'Animal', headerTitleStyle: { fontWeight: '700' } }} />
        <Stack.Screen name="worker/[id]" options={{ headerShown: true, title: 'Worker', headerTitleStyle: { fontWeight: '700' } }} />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
