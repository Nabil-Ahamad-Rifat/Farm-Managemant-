import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { mobileApiClient } from '@/src/lib/apiClient';
import { TextField, PrimaryButton } from '@/src/components/ui';

/** The milk price the sale form starts with for customers who haven't bought milk before. */
export default function MilkPriceScreen() {
  const [price, setPrice] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    mobileApiClient
      .get<{ defaultMilkPrice: number }>('/api/settings', 'Failed to load settings')
      .then((s) => setPrice(String(s.defaultMilkPrice)))
      .catch((err) => setError((err as Error).message));
  }, []);

  async function save() {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const s = await mobileApiClient.put<{ defaultMilkPrice: number }>('/api/settings', { defaultMilkPrice: price }, 'Failed to save');
      setPrice(String(s.defaultMilkPrice));
      setMessage('Saved');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (price === null && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 gap-4 bg-slate-50 p-5">
      <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-sm text-slate-600">
          New sales fill in each customer&apos;s last milk price. Customers who haven&apos;t bought milk before start with this price.
        </Text>
        <TextField label="Default milk price (৳ per L)" keyboardType="decimal-pad" value={price ?? ''} onChangeText={setPrice} />
        {error ? <Text className="text-xs font-medium text-red-700">{error}</Text> : null}
        {message ? <Text className="text-xs font-semibold text-emerald-700">{message}</Text> : null}
        <PrimaryButton label="Save" loading={saving} onPress={save} />
      </View>
    </View>
  );
}
