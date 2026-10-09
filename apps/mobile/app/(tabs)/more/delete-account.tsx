import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { useSession } from '@/src/context/AuthContext';
import { TextField, PrimaryButton, useConfirm } from '@/src/components/ui';

// Apple App Store Guideline 5.1.1(v) / Google Play's User Data policy: an app
// with in-app account creation must let the user delete that account from
// inside the app — see apps/web/src/app/api/auth/account/delete/route.ts.
export default function DeleteAccountScreen() {
  const { deleteAccount } = useSession();
  const confirm = useConfirm();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setError('');
    if (
      !(await confirm(
        'This permanently deletes your account and every record in it — cows, employees, feed, sales, income, and expenses. This cannot be undone. Continue?'
      ))
    ) {
      return;
    }

    setLoading(true);
    try {
      await deleteAccount(password || undefined);
      router.replace('/(auth)/login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50 p-5">
      <View className="rounded-2xl border border-red-200 bg-white p-6">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-600">
            <ShieldAlert size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">Delete My Account</Text>
            <Text className="text-xs text-slate-500">Permanently delete your account and all of your farm&apos;s data.</Text>
          </View>
        </View>

        <View className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3">
          <Text className="text-xs text-red-800">
            This permanently deletes your account, your ranch, and every record in it. This cannot be undone.
          </Text>
        </View>

        <View className="mt-4 gap-4">
          {error ? (
            <View className="rounded-xl border border-red-100 bg-red-50 p-3">
              <Text className="text-xs font-medium text-red-700">{error}</Text>
            </View>
          ) : null}
          <TextField
            label="Confirm Password"
            placeholder="Leave blank if you signed in with Google"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <PrimaryButton label="Delete My Account" loading={loading} onPress={handleDelete} variant="danger" />
        </View>
      </View>
    </View>
  );
}
