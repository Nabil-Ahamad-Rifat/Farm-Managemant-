import { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Plus, Search, Edit3, Trash2, Wallet, AlertCircle, Tag, FileText } from 'lucide-react-native';
import type { Sale } from '@farm/shared-types';
import { daysAgo } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useCrudList } from '@/src/hooks/useCrudList';
import { useSaleOptions } from '@/src/hooks/useSaleOptions';
import { tk, fmtDate } from '@/src/lib/format';
import { ChipGroup, IconButton, EmptyState, StatCard, useConfirm } from '@/src/components/ui';
import { StatusPill } from '@/src/components/StatusPill';
import { SaleFormModal } from '@/src/components/SaleFormModal';

const PRODUCT_LABELS: Record<string, string> = { milk: 'Milk', cow_sale: 'Cow', other: 'Other', general: 'General', products: 'Products' };

const PERIOD_FILTERS = [
  { value: '1', label: 'Today' },
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '0', label: 'All' },
];

/** Paid amount for any sale: derived for customer sales, hand-set status for older ones. */
const salePaid = (s: Sale) => (s.customerId ? s.paidAmount ?? 0 : s.status === 'paid' ? s.amount : 0);
const saleStatus = (s: Sale) => (s.customerId ? s.status : s.status === 'paid' ? 'paid' : 'pending');

export default function SalesScreen() {
  const { items: sales, loading, refreshing, refresh, reload } = useCrudList<Sale>('/api/sales');
  const options = useSaleOptions();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodDays, setPeriodDays] = useState('1');
  const [modal, setModal] = useState<{ sale: Sale | null } | null>(null);
  const [error, setError] = useState('');

  async function afterChange() {
    await Promise.all([reload(), options.reload()]);
  }

  async function handleDelete(sale: Sale) {
    if (!(await confirm(`Delete the ${tk(sale.amount)} sale to ${sale.customerName}?`))) return;
    try {
      await mobileApiClient.delete(`/api/sales/${sale.id}`);
      await afterChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const q = search.toLowerCase();
  const period = Number(periodDays);
  const filtered = sales.filter(
    (s) =>
      (s.customerName.toLowerCase().includes(q) || (s.cow ? `${s.cow.name} ${s.cow.tagNumber}`.toLowerCase().includes(q) : false)) &&
      (statusFilter === 'all' || saleStatus(s) === statusFilter) &&
      (period === 0 || new Date(s.createdAt) >= daysAgo(period)),
  );
  const received = filtered.reduce((sum, s) => sum + salePaid(s), 0);
  const due = filtered.reduce((sum, s) => sum + Math.max(0, s.amount - salePaid(s)), 0);

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
          <StatCard label="Received" value={tk(received)} icon={Wallet} color="#059669" />
          <StatCard label="Unpaid" value={tk(due)} icon={AlertCircle} color="#dc2626" />
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
            { value: 'partial', label: 'Partial' },
            { value: 'pending', label: 'Due' },
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
        contentContainerClassName="gap-3 p-4 pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<EmptyState message="No sales found." />}
        renderItem={({ item }) => {
          const paid = salePaid(item);
          const left = Math.max(0, item.amount - paid);
          return (
            <View className="rounded-2xl border border-slate-200 bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-bold text-slate-900">{item.customerName}</Text>
                  {item.cow ? <Text className="text-[11px] text-slate-400">{item.cow.name} ({item.cow.tagNumber})</Text> : null}
                  <View className="flex-row items-center gap-1.5">
                    <View className="flex-row items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      <Tag size={9} color="#475569" />
                      <Text className="text-[10px] font-semibold uppercase text-slate-600">{PRODUCT_LABELS[item.saleType] ?? item.saleType}</Text>
                    </View>
                    <StatusPill status={saleStatus(item)} />
                  </View>
                  {item.quantity != null && item.unitPrice != null ? (
                    <Text className="text-[11px] text-slate-500">
                      {item.quantity}
                      {item.saleType === 'milk' ? ' L' : ''} × {tk(item.unitPrice)}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <View className="flex-row items-center gap-1">
                      <FileText size={10} color="#94a3b8" />
                      <Text className="text-[11px] text-slate-400">{item.notes}</Text>
                    </View>
                  ) : null}
                  <Text className="text-sm font-bold text-slate-900">{tk(item.amount)}</Text>
                  {left > 0 && paid > 0 ? <Text className="text-[11px] font-semibold text-red-600">{tk(paid)} paid · {tk(left)} due</Text> : null}
                  <Text className="text-[11px] text-slate-400">{fmtDate(item.createdAt)}</Text>
                </View>
                <View className="flex-row gap-2">
                  <IconButton icon={Edit3} onPress={() => setModal({ sale: item })} />
                  <IconButton icon={Trash2} variant="danger" onPress={() => handleDelete(item)} />
                </View>
              </View>
            </View>
          );
        }}
      />

      <Pressable onPress={() => setModal({ sale: null })} className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 shadow-lg">
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Record Sale</Text>
      </Pressable>

      <SaleFormModal
        open={!!modal}
        sale={modal?.sale}
        customers={options.customers}
        activeCows={options.activeCows}
        defaultMilkPrice={options.defaultMilkPrice}
        onClose={() => setModal(null)}
        onSaved={async () => {
          setModal(null);
          await afterChange();
        }}
      />
    </View>
  );
}
