import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Plus, Search, Edit3, Trash2, Droplets, AlertTriangle, Wheat } from 'lucide-react-native';
import type { FeedBatch } from '@farm/shared-types';
import { isLowStock, stockPercentage, totalStockValue, totalBatchCost, formatCurrency } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useCrudList } from '@/src/hooks/useCrudList';
import { FormModal, TextField, PrimaryButton, IconButton, EmptyState, StatCard, useConfirm } from '@/src/components/ui';

const PRESET_NAMES = ['Bushi', 'Butta', 'Gom', 'Chaw', 'Khud', 'Soyabin', 'Khoil', 'Dhan', 'Kaher', 'Atta'];

const emptyForm = { name: '', quantity: '', unitPrice: '', remainingQuantity: '' };

export default function FeedScreen() {
  const { items: feed, loading, refreshing, refresh, reload } = useCrudList<FeedBatch>('/api/feed');
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeedBatch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [usageOpen, setUsageOpen] = useState(false);
  const [usageFeed, setUsageFeed] = useState<FeedBatch | null>(null);
  const [usageForm, setUsageForm] = useState({ quantity: '', note: '' });
  const [usageError, setUsageError] = useState('');

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(item: FeedBatch) {
    setEditing(item);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      remainingQuantity: String(item.remainingQuantity),
    });
    setError('');
    setModalOpen(true);
  }

  function openUsage(item: FeedBatch) {
    setUsageFeed(item);
    setUsageForm({ quantity: '', note: '' });
    setUsageError('');
    setUsageOpen(true);
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await mobileApiClient.put(`/api/feed/${editing.id}`, form, 'Failed to save feed batch');
      } else {
        await mobileApiClient.post('/api/feed', form, 'Failed to save feed batch');
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUsageSubmit() {
    if (!usageFeed) return;
    setSaving(true);
    setUsageError('');
    try {
      await mobileApiClient.post('/api/feed/usage', { feedBatchId: usageFeed.id, ...usageForm }, 'Failed to record usage');
      setUsageOpen(false);
      await reload();
    } catch (err) {
      setUsageError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: FeedBatch) {
    if (!(await confirm(`Delete the feed batch "${item.name}"?`))) return;
    try {
      await mobileApiClient.delete(`/api/feed/${item.id}`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const filtered = feed.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="gap-3 border-b border-slate-100 bg-white p-4">
        <View className="flex-row gap-3">
          <StatCard label="Total Investment" value={formatCurrency(totalBatchCost(feed))} icon={Wheat} color="#d97706" />
          <StatCard label="Stock Value" value={formatCurrency(totalStockValue(filtered))} icon={Wheat} color="#059669" />
        </View>
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search feed batches..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-slate-900"
          />
        </View>
      </View>

      {error ? (
        <View className="mx-4 mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
          <Text className="text-xs font-medium text-red-700">{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<EmptyState message="No feed batches recorded." />}
        renderItem={({ item }) => {
          const lowStock = isLowStock(item);
          const pct = stockPercentage(item);
          return (
            <View className="rounded-2xl border border-slate-200 bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
                  <View className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                    <View className={`h-full rounded-full ${lowStock ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </View>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Text className="text-[11px] text-slate-400">{pct}% remaining ({item.remainingQuantity}/{item.quantity} kg)</Text>
                    {lowStock ? (
                      <View className="flex-row items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5">
                        <AlertTriangle size={10} color="#b45309" />
                        <Text className="text-[10px] font-bold text-amber-700">Low Stock</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-xs text-slate-500">৳{item.unitPrice.toFixed(2)}/kg</Text>
                </View>
                <View className="flex-row gap-2">
                  <IconButton icon={Droplets} onPress={() => openUsage(item)} />
                  <IconButton icon={Edit3} onPress={() => openEdit(item)} />
                  <IconButton icon={Trash2} variant="danger" onPress={() => handleDelete(item)} />
                </View>
              </View>
            </View>
          );
        }}
      />

      <Pressable
        onPress={openCreate}
        className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 shadow-lg"
      >
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Add Feed Batch</Text>
      </Pressable>

      <FormModal visible={modalOpen} title={editing ? 'Edit Feed Batch' : 'Add New Feed Batch'} onClose={() => setModalOpen(false)}>
        {error ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{error}</Text>
          </View>
        ) : null}
        <TextField label="Feed / Grain Name" placeholder="e.g. Bushi, Butta, Gom" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <View className="flex-row flex-wrap gap-1.5">
          {PRESET_NAMES.map((n) => (
            <Pressable
              key={n}
              onPress={() => setForm({ ...form, name: n })}
              className={`rounded-full border px-2.5 py-1 ${form.name === n ? 'border-amber-600 bg-amber-600' : 'border-amber-200 bg-amber-50'}`}
            >
              <Text className={`text-[11px] font-semibold ${form.name === n ? 'text-white' : 'text-amber-800'}`}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <TextField
          label="Total Quantity (kg)"
          placeholder="e.g. 500"
          keyboardType="decimal-pad"
          value={form.quantity}
          onChangeText={(v) => setForm({ ...form, quantity: v, remainingQuantity: editing ? form.remainingQuantity : v })}
        />
        <TextField label="Unit Price (৳ per kg)" placeholder="e.g. 35.00" keyboardType="decimal-pad" value={form.unitPrice} onChangeText={(v) => setForm({ ...form, unitPrice: v })} />
        <TextField label="Remaining Quantity (kg)" placeholder="Defaults to initial quantity" keyboardType="decimal-pad" value={form.remainingQuantity} onChangeText={(v) => setForm({ ...form, remainingQuantity: v })} />
        <PrimaryButton label="Save Feed Batch" loading={saving} onPress={handleSubmit} />
      </FormModal>

      <FormModal visible={usageOpen} title="Record Feed Usage" subtitle={usageFeed?.name} onClose={() => setUsageOpen(false)}>
        {usageFeed ? (
          <View className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <Text className="text-xs text-amber-800">
              Available stock: <Text className="font-bold">{usageFeed.remainingQuantity.toLocaleString()} kg</Text>
            </Text>
          </View>
        ) : null}
        {usageError ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{usageError}</Text>
          </View>
        ) : null}
        <TextField label="Quantity Used (kg)" placeholder="e.g. 50" keyboardType="decimal-pad" value={usageForm.quantity} onChangeText={(v) => setUsageForm({ ...usageForm, quantity: v })} />
        <TextField label="Note (Optional)" placeholder="e.g. Morning feeding" value={usageForm.note} onChangeText={(v) => setUsageForm({ ...usageForm, note: v })} />
        <PrimaryButton label="Record Usage" loading={saving} onPress={handleUsageSubmit} />
      </FormModal>
    </View>
  );
}
