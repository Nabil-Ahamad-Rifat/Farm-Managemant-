import { useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '@/src/components/ui/Text';
import { Link, router } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import { loginSchema } from '@farm/shared-validation';
import { useSession } from '@/src/context/AuthContext';
import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError('Enter a valid email and password.');
      return;
    }

    setLoading(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      router.replace('/(tabs)');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-slate-950">
      <View className="flex-1 justify-center px-6">
        <View className="rounded-3xl border border-white/10 bg-slate-900 p-8">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <Sprout size={20} color="white" />
            </View>
            <Text className="text-xl font-extrabold text-white">Farm Manager</Text>
          </View>

          <Text className="mt-6 text-2xl font-bold text-white">Welcome back</Text>
          <Text className="mt-1 text-sm text-slate-400">Sign in to your farm management account.</Text>

          {error ? (
            <View className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <Text className="text-xs font-medium text-red-400">{error}</Text>
            </View>
          ) : null}

          <View className="mt-6 gap-4">
            <View>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="owner@farm.com"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </View>
            <View>
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</Text>
                <Link href="/(auth)/forgot-password" className="text-[11px] font-semibold text-emerald-400">
                  Forgot password?
                </Link>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="mt-2 items-center rounded-xl bg-emerald-600 px-4 py-3 disabled:opacity-50"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-semibold text-white">Continue to Dashboard</Text>
              )}
            </Pressable>

            <GoogleSignInButton onError={setError} />
          </View>

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-xs text-slate-400">Don&apos;t have an account?</Text>
            <Link href="/(auth)/register" className="text-xs font-semibold text-emerald-400">
              Create farm account
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
