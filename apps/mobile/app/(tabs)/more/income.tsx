import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Plus, Search, Edit3, Trash2, Coins } from 'lucide-react-native';
import type { OtherIncome } from '@farm/shared-types';
import { daysAgo, sumAmounts, formatCurrency } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useCrudList } from '@/src/hooks/useCrudList';
import { FormModal, TextField, ChipGroup, DateField, PrimaryButton, IconButton, EmptyState, StatCard, useConfirm } from '@/src/components/ui';

const CATEGORIES = [
  { value: 'subsidy', label: 'Subsidy' },
  { value: 'grant', label: 'Grant/Aid' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'donation', label: 'Donation' },
  { value: 'rental', label: 'Rental' },
  { value: 'refund', label: 'Refund' },
  { value: 'other', label: 'Other' },
];

const PERIOD_FILTERS = [
  { value: '1', label: 'Today' },
  { value: '3', label: '3 Days' },
  { value: '5', label: '5 Days' },
  { value: '7', label: '7 Days' },
  { value: '15', label: '15 Days' },
  { value: '30', label: '30 Days' },
  { value: '0', label: 'All' },
];

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { description: '', amount: '', category: 'other', incomeDate: today() };

export default function IncomeScreen() {
  const { items: incomes, loading, refreshing, refresh, reload } = useCrudList<OtherIncome>('/api/income');
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [periodDays, setPeriodDays] = useState('1');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OtherIncome | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(income: OtherIncome) {
    setEditing(income);
    setForm({
      description: income.description,
      amount: String(income.amount),
      category: income.category,
      incomeDate: new Date(income.incomeDate).toISOString().slice(0, 10),
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await mobileApiClient.put(`/api/income/${editing.id}`, form, 'Failed to save income record');
      } else {
        await mobileApiClient.post('/api/income', form, 'Failed to save income record');
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(income: OtherIncome) {
    if (!(await confirm(`Delete this income record: ${income.description}?`))) return;
    try {
      await mobileApiClient.delete(`/api/income/${income.id}`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const periodDaysNum = Number(periodDays);
  const filtered = incomes.filter((inc) => {
    const matchesSearch = inc.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || inc.category === categoryFilter;
    const matchesPeriod = periodDaysNum === 0 || new Date(inc.incomeDate) >= daysAgo(periodDaysNum);
    return matchesSearch && matchesCategory && matchesPeriod;
  });
  const totalAmount = sumAmounts(filtered);
  const categoryLabel = (val: string) => CATEGORIES.find((c) => c.value === val)?.label || val;

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
        <StatCard label="Total Other Income" value={formatCurrency(totalAmount)} subtext={`${filtered.length} records`} icon={Coins} color="#0f766e" />
        <ChipGroup options={PERIOD_FILTERS} value={periodDays} onChange={setPeriodDays} />
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search income records..." placeholderTextColor="#94a3b8" className="flex-1 text-sm text-slate-900" />
        </View>
        <ChipGroup options={[{ value: 'all', label: 'All' }, ...CATEGORIES]} value={categoryFilter} onChange={setCategoryFilter} />
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
        ListEmptyComponent={<EmptyState message="No income records found." />}
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">{item.description}</Text>
                <Text className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">{categoryLabel(item.category)}</Text>
                <Text className="mt-1 text-xs text-slate-500">{new Date(item.incomeDate).toLocaleDateString()}</Text>
                <Text className="mt-1 text-sm font-bold text-teal-700">{formatCurrency(item.amount)}</Text>
              </View>
              <View className="flex-row gap-2">
                <IconButton icon={Edit3} onPress={() => openEdit(item)} />
                <IconButton icon={Trash2} variant="danger" onPress={() => handleDelete(item)} />
              </View>
            </View>
          </View>
        )}
      />

      <Pressable onPress={openCreate} className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-teal-700 px-5 py-3.5 shadow-lg">
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Add Income</Text>
      </Pressable>

      <FormModal visible={modalOpen} title={editing ? 'Edit Income Record' : 'Add Other Income'} onClose={() => setModalOpen(false)}>
        {error ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{error}</Text>
          </View>
        ) : null}
        <TextField label="Description" placeholder="e.g. Government livestock subsidy" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
        <TextField label="Amount (৳)" placeholder="e.g. 5000.00" keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} />
        <DateField label="Income Date" value={form.incomeDate} onChange={(v) => setForm({ ...form, incomeDate: v })} maxDate={new Date()} />
        <ChipGroup label="Category" options={CATEGORIES} value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <PrimaryButton label="Save Income" loading={saving} onPress={handleSubmit} />
      </FormModal>
    </View>
  );
}
