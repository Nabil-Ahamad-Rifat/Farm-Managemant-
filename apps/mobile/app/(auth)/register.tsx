import { useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput } from '@/src/components/ui/Text';
import { Link, router } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import { registerSchema } from '@farm/shared-validation';
import { useSession } from '@/src/context/AuthContext';
import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';

export default function RegisterScreen() {
  const { signUp } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    const parsed = registerSchema.safeParse({ name, email, password, tenantName: tenantName || undefined });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.path[0] === 'password' ? 'Password must be at least 8 characters' : 'Name, a valid email, and password are required');
      return;
    }

    setLoading(true);
    try {
      await signUp(parsed.data.name, parsed.data.email, parsed.data.password, parsed.data.tenantName);
      router.replace('/(tabs)');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-slate-950">
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-10">
        <View className="rounded-3xl border border-white/10 bg-slate-900 p-8">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <Sprout size={20} color="white" />
            </View>
            <Text className="text-xl font-extrabold text-white">Farm Manager</Text>
          </View>

          <Text className="mt-6 text-2xl font-bold text-white">Create your farm account</Text>
          <Text className="mt-1 text-sm text-slate-400">Start managing your farm&apos;s operations today.</Text>

          {error ? (
            <View className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <Text className="text-xs font-medium text-red-400">{error}</Text>
            </View>
          ) : null}

          <View className="mt-6 gap-4">
            <View>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Karim Hossain"
                placeholderTextColor="#64748b"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </View>
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
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </View>
            <View>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Farm Name (Optional)</Text>
              <TextInput
                value={tenantName}
                onChangeText={setTenantName}
                placeholder="e.g. Karim's Farm"
                placeholderTextColor="#64748b"
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
                <Text className="font-semibold text-white">Create Account</Text>
              )}
            </Pressable>

            <GoogleSignInButton onError={setError} />
          </View>

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-xs text-slate-400">Already have an account?</Text>
            <Link href="/(auth)/login" className="text-xs font-semibold text-emerald-400">
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
