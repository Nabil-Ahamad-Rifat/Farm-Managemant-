import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { forgotPasswordSchema } from '@farm/shared-validation';
import { mobileApiClient } from '@/src/lib/apiClient';

// The reset link itself is emailed as a web URL (NEXT_PUBLIC_APP_URL/reset-password?token=...)
// and completed on the web — this screen only requests that link. A native
// deep-link flow (universal/app links) is future work, not needed for the
// Phase 4 skeleton.
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await mobileApiClient.post('/api/auth/forgot-password', { email: parsed.data.email }, 'Failed to process request');
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center bg-slate-950 px-6">
      <View className="rounded-3xl border border-white/10 bg-slate-900 p-8">
        <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-2">
          <ArrowLeft size={16} color="#94a3b8" />
          <Text className="text-xs font-semibold text-slate-400">Back to sign in</Text>
        </Pressable>

        <Text className="text-2xl font-bold text-white">Reset your password</Text>
        <Text className="mt-1 text-sm text-slate-400">
          Enter your email and we&apos;ll send you a link to reset your password.
        </Text>

        {error ? (
          <View className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <Text className="text-xs font-medium text-red-400">{error}</Text>
          </View>
        ) : null}

        {sent ? (
          <View className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <Text className="text-xs font-medium text-emerald-400">
              If that email exists, a reset link has been sent — check your inbox.
            </Text>
          </View>
        ) : (
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

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="mt-2 items-center rounded-xl bg-emerald-600 px-4 py-3 disabled:opacity-50"
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Send Reset Link</Text>}
            </Pressable>
          </View>
        )}

        <View className="mt-6 flex-row justify-center gap-1">
          <Text className="text-xs text-slate-400">Remembered your password?</Text>
          <Link href="/(auth)/login" className="text-xs font-semibold text-emerald-400">
            Sign in
          </Link>
        </View>
      </View>
    </View>
  );
}
