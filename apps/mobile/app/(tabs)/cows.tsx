import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Plus, Search, Edit3, Trash2 } from 'lucide-react-native';
import type { Cow } from '@farm/shared-types';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useCrudList } from '@/src/hooks/useCrudList';
import { FormModal, TextField, ChipGroup, PrimaryButton, IconButton, EmptyState, useConfirm } from '@/src/components/ui';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'sick', label: 'Sick' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'sick', label: 'Sick' },
];

const emptyForm = { tagNumber: '', name: '', breed: '', purchasePrice: '', status: 'active' as string };

export default function CowsScreen() {
  const { items: cows, loading, refreshing, refresh, reload } = useCrudList<Cow>('/api/cows');
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(cow: Cow) {
    setEditing(cow);
    setForm({
      tagNumber: cow.tagNumber,
      name: cow.name,
      breed: cow.breed || '',
      purchasePrice: cow.purchasePrice !== null ? String(cow.purchasePrice) : '',
      status: cow.status,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await mobileApiClient.put(`/api/cows/${editing.id}`, form, 'Failed to save cow details');
      } else {
        await mobileApiClient.post('/api/cows', form, 'Failed to save cow details');
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cow: Cow) {
    if (!(await confirm(`Remove ${cow.name} (${cow.tagNumber}) from the herd record?`))) return;
    try {
      await mobileApiClient.delete(`/api/cows/${cow.id}`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const filtered = cows.filter((cow) => {
    const q = search.toLowerCase();
    const matchesSearch =
      cow.tagNumber.toLowerCase().includes(q) || cow.name.toLowerCase().includes(q) || (cow.breed?.toLowerCase().includes(q) ?? false);
    const matchesStatus = statusFilter === 'all' || cow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by tag #, name, or breed..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-slate-900"
          />
        </View>
        <ChipGroup options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
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
        ListEmptyComponent={<EmptyState message="No cattle records found." />}
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <View className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5">
                    <Text className="text-xs font-mono text-slate-700">{item.tagNumber}</Text>
                  </View>
                  <Text
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.status === 'active'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : item.status === 'sold'
                          ? 'border-slate-200 bg-slate-100 text-slate-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {item.status}
                  </Text>
                </View>
                <Text className="mt-1.5 text-sm font-bold text-slate-900">{item.name}</Text>
                <Text className="text-xs text-slate-500">{item.breed || 'Breed unspecified'}</Text>
                {item.purchasePrice !== null ? (
                  <Text className="mt-1 text-xs font-semibold text-slate-700">
                    ${item.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row gap-2">
                <IconButton icon={Edit3} onPress={() => openEdit(item)} />
                <IconButton icon={Trash2} variant="danger" onPress={() => handleDelete(item)} />
              </View>
            </View>
          </View>
        )}
      />

      <Pressable
        onPress={openCreate}
        className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 shadow-lg"
      >
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Add Cow</Text>
      </Pressable>

      <FormModal visible={modalOpen} title={editing ? 'Edit Cattle Record' : 'Register New Cow'} onClose={() => setModalOpen(false)}>
        {error ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{error}</Text>
          </View>
        ) : null}
        <TextField label="Tag Number (Unique Identifier)" placeholder="e.g. COW-101" value={form.tagNumber} onChangeText={(v) => setForm({ ...form, tagNumber: v })} />
        <TextField label="Cow Name" placeholder="e.g. Bella" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <TextField label="Breed" placeholder="e.g. Holstein Friesian, Angus" value={form.breed} onChangeText={(v) => setForm({ ...form, breed: v })} />
        <TextField
          label="Purchase Price ($)"
          placeholder="e.g. 1200.00"
          keyboardType="decimal-pad"
          value={form.purchasePrice}
          onChangeText={(v) => setForm({ ...form, purchasePrice: v })}
        />
        <ChipGroup label="Health & Inventory Status" options={STATUS_OPTIONS} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
        <PrimaryButton label="Save Cow" loading={saving} onPress={handleSubmit} />
      </FormModal>
    </View>
  );
}
