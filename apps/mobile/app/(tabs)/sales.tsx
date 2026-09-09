import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Plus, Search, Edit3, Trash2, DollarSign, Clock, CheckCircle, FileText, Tag } from 'lucide-react-native';
import type { Sale, Cow } from '@farm/shared-types';
import { daysAgo, sumAmounts, calculateSaleAmount, formatCurrency } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useCrudList } from '@/src/hooks/useCrudList';
import { FormModal, TextField, ChipGroup, DateField, SelectField, PrimaryButton, IconButton, EmptyState, StatCard, useConfirm } from '@/src/components/ui';

const SALE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'cow_sale', label: 'Cow Sale' },
  { value: 'milk', label: 'Milk' },
  { value: 'products', label: 'Products' },
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
const emptyForm = { customerName: '', amount: '', status: 'paid', cowId: '', saleType: 'general', quantity: '', unitPrice: '', notes: '', saleDate: today() };

export default function SalesScreen() {
  const { items: sales, loading, refreshing, refresh, reload } = useCrudList<Sale>('/api/sales');
  const confirm = useConfirm();

  const [activeCows, setActiveCows] = useState<Cow[]>([]);
  useEffect(() => {
    mobileApiClient
      .get<Cow[]>('/api/cows')
      .then((cows) => setActiveCows(cows.filter((c) => c.status === 'active')))
      .catch(() => {
        // Non-fatal — the cow-linking field just shows no options.
      });
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodDays, setPeriodDays] = useState('1');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const calculatedAmount = useMemo(() => {
    const result = calculateSaleAmount(form.quantity, form.unitPrice);
    return result !== null ? result.toFixed(2) : '';
  }, [form.quantity, form.unitPrice]);
  const displayAmount = calculatedAmount !== '' ? calculatedAmount : form.amount;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(sale: Sale) {
    setEditing(sale);
    setForm({
      customerName: sale.customerName,
      amount: String(sale.amount),
      status: sale.status,
      cowId: sale.cowId || '',
      saleType: sale.saleType || 'general',
      quantity: sale.quantity?.toString() || '',
      unitPrice: sale.unitPrice?.toString() || '',
      notes: sale.notes || '',
      saleDate: new Date(sale.createdAt).toISOString().slice(0, 10),
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit() {
    setError('');
    const finalAmount = calculatedAmount !== '' ? calculatedAmount : form.amount;
    if (!finalAmount || parseFloat(finalAmount) <= 0) {
      setError('Please enter a valid amount, or fill in Quantity and Unit Price.');
      return;
    }

    setSaving(true);
    const payload = { ...form, amount: finalAmount, quantity: form.quantity || null, unitPrice: form.unitPrice || null };
    try {
      if (editing) {
        await mobileApiClient.put(`/api/sales/${editing.id}`, payload, 'Failed to save sale record');
      } else {
        await mobileApiClient.post('/api/sales', payload, 'Failed to save sale record');
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sale: Sale) {
    if (!(await confirm(`Delete this sale to ${sale.customerName}?`))) return;
    try {
      await mobileApiClient.delete(`/api/sales/${sale.id}`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const periodDaysNum = Number(periodDays);
  const filtered = sales.filter((sale) => {
    const q = search.toLowerCase();
    const matchesSearch =
      sale.customerName.toLowerCase().includes(q) ||
      (sale.cow ? sale.cow.name.toLowerCase().includes(q) || sale.cow.tagNumber.toLowerCase().includes(q) : false);
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    const matchesPeriod = periodDaysNum === 0 || new Date(sale.createdAt) >= daysAgo(periodDaysNum);
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const totalRevenue = sumAmounts(filtered.filter((s) => s.status === 'paid'));
  const pendingRevenue = sumAmounts(filtered.filter((s) => s.status === 'pending'));
  const saleTypeLabel = (val: string) => SALE_TYPES.find((t) => t.value === val)?.label || val;

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
          <StatCard label="Collected" value={formatCurrency(totalRevenue)} icon={DollarSign} color="#059669" />
          <StatCard label="Pending" value={formatCurrency(pendingRevenue)} icon={Clock} color="#d97706" />
        </View>
        <ChipGroup options={PERIOD_FILTERS} value={periodDays} onChange={setPeriodDays} />
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by customer or cow tag..." placeholderTextColor="#94a3b8" className="flex-1 text-sm text-slate-900" />
        </View>
        <ChipGroup
          options={[
            { value: 'all', label: 'All' },
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
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
        ListEmptyComponent={<EmptyState message="No sales transactions found." />}
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">{item.customerName}</Text>
                {item.cow ? <Text className="text-[11px] text-slate-400">{item.cow.name} ({item.cow.tagNumber})</Text> : null}
                <View className="mt-1.5 flex-row items-center gap-1.5">
                  <View className="flex-row items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                    <Tag size={9} color="#475569" />
                    <Text className="text-[10px] font-semibold uppercase text-slate-600">{saleTypeLabel(item.saleType)}</Text>
                  </View>
                  <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${item.status === 'paid' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    {item.status === 'paid' ? <CheckCircle size={9} color="#047857" /> : <Clock size={9} color="#b45309" />}
                    <Text className={`text-[10px] font-semibold uppercase ${item.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>{item.status}</Text>
                  </View>
                </View>
                {item.notes ? (
                  <View className="mt-1 flex-row items-center gap-1">
                    <FileText size={10} color="#94a3b8" />
                    <Text className="text-[11px] text-slate-400">{item.notes}</Text>
                  </View>
                ) : null}
                <Text className="mt-1.5 text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</Text>
                <Text className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View className="flex-row gap-2">
                <IconButton icon={Edit3} onPress={() => openEdit(item)} />
                <IconButton icon={Trash2} variant="danger" onPress={() => handleDelete(item)} />
              </View>
            </View>
          </View>
        )}
      />

      <Pressable onPress={openCreate} className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 shadow-lg">
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Record Sale</Text>
      </Pressable>

      <FormModal visible={modalOpen} title={editing ? 'Edit Transaction' : 'Record New Sale'} onClose={() => setModalOpen(false)}>
        {error ? (
          <View className="rounded-xl border border-red-100 bg-red-50 p-3">
            <Text className="text-xs font-medium text-red-700">{error}</Text>
          </View>
        ) : null}
        <TextField label="Customer / Buyer Name" placeholder="e.g. Abdul Karim" value={form.customerName} onChangeText={(v) => setForm({ ...form, customerName: v })} />
        <ChipGroup label="Sale Type" options={SALE_TYPES} value={form.saleType} onChange={(v) => setForm({ ...form, saleType: v })} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="Quantity" keyboardType="decimal-pad" placeholder="e.g. 10" value={form.quantity} onChangeText={(v) => setForm({ ...form, quantity: v })} />
          </View>
          <View className="flex-1">
            <TextField label="Unit Price (৳)" keyboardType="decimal-pad" placeholder="e.g. 85.00" value={form.unitPrice} onChangeText={(v) => setForm({ ...form, unitPrice: v })} />
          </View>
        </View>
        <TextField
          label={calculatedAmount ? `Total Amount (Auto: ৳${calculatedAmount})` : 'Total Amount (৳)'}
          placeholder="e.g. 850.00"
          keyboardType="decimal-pad"
          editable={!calculatedAmount}
          value={displayAmount}
          onChangeText={(v) => setForm({ ...form, amount: v })}
        />
        <DateField label="Sale Date" value={form.saleDate} onChange={(v) => setForm({ ...form, saleDate: v })} maxDate={new Date()} />
        <SelectField
          label="Link Livestock (Optional)"
          placeholder="None"
          value={form.cowId}
          options={activeCows.map((c) => ({ value: c.id, label: c.name, sublabel: c.tagNumber }))}
          onChange={(v) => setForm({ ...form, cowId: v })}
        />
        <ChipGroup
          label="Payment Status"
          options={[
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
          ]}
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
        />
        <TextField label="Notes (Optional)" placeholder="e.g. Morning milk delivery" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />
        <PrimaryButton label="Save Transaction" loading={saving} onPress={handleSubmit} />
      </FormModal>
    </View>
  );
}
