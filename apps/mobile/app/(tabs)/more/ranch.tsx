import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Sprout } from 'lucide-react-native';
import { useSession } from '@/src/context/AuthContext';
import { TextField, PrimaryButton, useConfirm } from '@/src/components/ui';

// Mirrors apps/web/src/app/dashboard/ranches/page.tsx — creating a ranch
// here reassigns the signed-in account to a brand-new, empty tenant
// workspace. There is no "switch back": the previous tenant's data becomes
// inaccessible to this account, same as on web.
export default function NewRanchScreen() {
  const { createRanch } = useSession();
  const confirm = useConfirm();
  const [ranchName, setRanchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!ranchName.trim()) {
      setError('Ranch name is required');
      return;
    }
    if (!(await confirm(`This switches your account to a brand-new, empty workspace. You will lose access to your current ranch's cows, employees, sales, and every other record. Continue?`))) {
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createRanch(ranchName.trim());
      router.replace('/(tabs)');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50 p-5">
      <View className="rounded-2xl border border-slate-200 bg-white p-6">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600">
            <Sprout size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">Create a New Ranch</Text>
            <Text className="text-xs text-slate-500">Start a fresh ranch workspace and switch your account to it.</Text>
          </View>
        </View>

        <View className="mt-5 flex-row gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={16} color="#d97706" />
          <Text className="flex-1 text-xs text-amber-800">
            This switches your account to a brand-new, empty workspace. There is no way to switch back.
          </Text>
        </View>

        <View className="mt-4 gap-4">
          {error ? (
            <View className="rounded-xl border border-red-100 bg-red-50 p-3">
              <Text className="text-xs font-medium text-red-700">{error}</Text>
            </View>
          ) : null}
          <TextField label="Ranch Name" placeholder="e.g. Sunrise Meadow Ranch" value={ranchName} onChangeText={setRanchName} />
          <PrimaryButton label="Create Ranch" loading={loading} onPress={handleCreate} />
        </View>
      </View>
    </View>
  );
}
