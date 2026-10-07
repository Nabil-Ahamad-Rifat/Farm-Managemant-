import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Plus, Search, Edit3, Trash2, Droplets, AlertTriangle, Wheat, Store, ChevronLeft, ChevronRight, ShoppingBag, Wallet } from 'lucide-react-native';
import type { FeedBatch, SupplierSummary } from '@farm/shared-types';
import { feedMonthSummary, isLowStock, monthKey, shiftMonth, stockPercentage, totalStockValue } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { generateIdempotencyKey } from '@/src/lib/idempotency';
import { useCrudList } from '@/src/hooks/useCrudList';
import { tk, fmtDate, monthLabel } from '@/src/lib/format';
import { FormModal, TextField, PrimaryButton, IconButton, EmptyState, StatCard, ChipGroup, useConfirm } from '@/src/components/ui';
import { StatusPill } from '@/src/components/StatusPill';
import { FeedPurchaseModal } from '@/src/components/FeedPurchaseModal';

/** Paid/partial/due for a batch: derived for supplier purchases; older and supplier-less ones are paid. */
const payStatus = (b: FeedBatch) => (b.supplierId ? b.payStatus ?? 'pending' : 'paid');

export default function FeedScreen() {
  const { items: feed, loading, refreshing, refresh, reload } = useCrudList<FeedBatch>('/api/feed');
  const confirm = useConfirm();

  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const loadSuppliers = () =>
    mobileApiClient
      .get<SupplierSummary[]>('/api/suppliers')
      .then(setSuppliers)
      .catch(() => {
        // Non-fatal: the supplier picker just shows no existing suppliers.
      });
  useEffect(() => {
    loadSuppliers();
  }, []);

  const [search, setSearch] = useState('');
  const currentMonth = monthKey(new Date());
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState('month');
  const [purchase, setPurchase] = useState<{ batch: FeedBatch | null } | null>(null);
  const [error, setError] = useState('');

  const [usageFeed, setUsageFeed] = useState<FeedBatch | null>(null);
  const [usageForm, setUsageForm] = useState({ quantity: '', note: '' });
  const [usageError, setUsageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [usageKey, setUsageKey] = useState(generateIdempotencyKey);

  async function afterChange() {
    await Promise.all([reload(), loadSuppliers()]);
  }

  function openUsage(item: FeedBatch) {
    setUsageFeed(item);
    setUsageForm({ quantity: '', note: '' });
    setUsageError('');
    setUsageKey(generateIdempotencyKey());
  }

  async function handleUsageSubmit() {
    if (!usageFeed) return;
    setSaving(true);
    setUsageError('');
    try {
      await mobileApiClient.post('/api/feed/usage', { feedBatchId: usageFeed.id, ...usageForm }, 'Failed to record usage', {
        idempotencyKey: usageKey,
      });
      setUsageFeed(null);
      await reload();
    } catch (err) {
      setUsageError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: FeedBatch) {
    if (!(await confirm(`Delete the ${item.name} purchase of ${item.quantity} kg?`))) return;
    try {
      await mobileApiClient.delete(`/api/feed/${item.id}`);
      await afterChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const summary = feedMonthSummary(feed, month);
  const q = search.toLowerCase();
  // "This month" lists that month's purchases; "In stock" lists everything with stock left.
  const shown = view === 'stock' ? feed.filter((b) => b.remainingQuantity > 0) : summary.purchases;
  const filtered = shown.filter((item) => item.name.toLowerCase().includes(q) || (item.supplier?.name ?? '').toLowerCase().includes(q));
  const owed = suppliers.reduce((s, x) => s + x.totalDue, 0);
  const runningLow = feed.filter((b) => b.schedule && b.schedule.remaining > 0 && b.schedule.daysLeft <= 1);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={filtered}
        ListHeaderComponent={
          <View className="-mx-4 -mt-4 mb-1">
            <View className="gap-3 border-b border-slate-100 bg-white p-4">
              <View className="flex-row items-center justify-between rounded-xl border border-slate-200 p-1">
                <Pressable onPress={() => setMonth(shiftMonth(month, -1))} className="rounded-lg p-2" accessibilityLabel="Previous month">
                  <ChevronLeft size={18} color="#475569" />
                </Pressable>
                <Text className="text-sm font-bold text-slate-900">{monthLabel(month)}</Text>
                <Pressable
                  onPress={() => month < currentMonth && setMonth(shiftMonth(month, 1))}
                  className={`rounded-lg p-2 ${month < currentMonth ? '' : 'opacity-30'}`}
                  accessibilityLabel="Next month"
                >
                  <ChevronRight size={18} color="#475569" />
                </Pressable>
              </View>
              <View className="flex-row gap-3">
                <StatCard label="Bought" value={`${summary.totals.kg} kg`} subtext={`${summary.totals.count} purchases`} icon={Wheat} color="#d97706" />
                <StatCard label="Spent" value={tk(summary.totals.spent)} icon={ShoppingBag} color="#475569" />
              </View>
              <View className="flex-row gap-3">
                <StatCard label="Paid" value={tk(summary.totals.paid)} icon={Wallet} color="#059669" />
                <StatCard label="Still owed" value={tk(summary.totals.owed)} icon={Store} color="#dc2626" />
              </View>
              {summary.byFeed.length ? (
                <View className="rounded-xl border border-slate-200">
                  {summary.byFeed.map((f, i) => (
                    <View key={f.name} className={`flex-row items-center justify-between px-3 py-2 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                      <Text className="text-xs font-semibold text-slate-900">{f.name}</Text>
                      <Text className="text-xs text-slate-600">
                        {f.kg} kg · <Text className="font-bold text-slate-900">{tk(f.spent)}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text className="text-[11px] text-slate-500">
                Stock value now {tk(Math.round(totalStockValue(feed)))} · you owe suppliers {tk(owed)} in total
              </Text>
              <ChipGroup
                options={[
                  { value: 'month', label: 'Bought this month' },
                  { value: 'stock', label: 'All in stock' },
                ]}
                value={view}
                onChange={setView}
              />
              {runningLow.length ? (
                <View className="flex-row items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle size={14} color="#b45309" />
                  <Text className="flex-1 text-xs text-amber-900">
                    Running out soon: {runningLow.map((b) => `${b.name} (${b.schedule!.remaining} kg)`).join(', ')}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <Search size={16} color="#94a3b8" />
                <TextInput value={search} onChangeText={setSearch} placeholder="Search feed or supplier..." placeholderTextColor="#94a3b8" className="flex-1 text-sm text-slate-900" />
              </View>
            </View>
      
            {error ? (
              <View className="mx-4 mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
                <Text className="text-xs font-medium text-red-700">{error}</Text>
              </View>
            ) : null}
          </View>
        }
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4 pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<EmptyState message={view === 'month' ? `No feed bought in ${monthLabel(month)}.` : 'No feed in stock.'} />}
        renderItem={({ item }) => {
          const s = item.schedule;
          const total = item.quantity * item.unitPrice;
          const due = item.supplierId ? Math.max(0, total - (item.paidAmount ?? 0)) : 0;
          const low = s ? s.remaining > 0 && s.daysLeft <= 1 : isLowStock(item);
          const finished = s ? s.remaining <= 0 : item.remainingQuantity <= 0;
          const pct = s ? Math.round((s.daysLeft / s.coverDays) * 100) : stockPercentage(item);
          return (
            <View className={`rounded-2xl border border-slate-200 bg-white p-4 ${finished ? 'opacity-60' : ''}`}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
                  <Text className="text-[11px] text-slate-400">
                    {fmtDate(item.purchasedAt ?? item.createdAt)}
                    {item.supplier ? ` · ${item.supplier.name}` : ''}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs text-slate-600">
                      {item.quantity} kg × {tk(item.unitPrice)} = <Text className="font-bold text-slate-900">{tk(total)}</Text>
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <StatusPill status={payStatus(item)} />
                    {due > 0 ? <Text className="text-[11px] font-semibold text-red-600">{tk(due)} due</Text> : null}
                  </View>
                  <View className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                    <View className={`h-full rounded-full ${low ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.max(0, Math.min(pct, 100))}%` }} />
                  </View>
                  <Text className={`text-[11px] ${low ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                    {s
                      ? finished
                        ? `Finished ${fmtDate(s.runsOutOn)}`
                        : `${item.remainingQuantity} kg left · ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} left · ${s.perDayQty} kg/day (${tk(s.perDayCost)}/day)`
                      : `${pct}% remaining (${item.remainingQuantity}/${item.quantity} kg)`}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <IconButton icon={Droplets} onPress={() => openUsage(item)} />
                  <IconButton icon={Edit3} onPress={() => setPurchase({ batch: item })} />
                  <IconButton icon={Trash2} variant="danger" onPress={() => handleDelete(item)} />
                </View>
              </View>
            </View>
          );
        }}
      />

      <Pressable onPress={() => setPurchase({ batch: null })} className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 shadow-lg">
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Buy feed</Text>
      </Pressable>

      <FeedPurchaseModal
        open={!!purchase}
        batch={purchase?.batch}
        suppliers={suppliers}
        onClose={() => setPurchase(null)}
        onSaved={async () => {
          setPurchase(null);
          await afterChange();
        }}
      />

      <FormModal visible={!!usageFeed} title={usageFeed?.schedule ? 'Record extra use' : 'Record Feed Usage'} subtitle={usageFeed?.name} onClose={() => setUsageFeed(null)}>
        {usageFeed ? (
          <View className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <Text className="text-xs text-amber-800">
              Available stock: <Text className="font-bold">{usageFeed.remainingQuantity.toLocaleString()} kg</Text>
            </Text>
            {usageFeed.schedule ? (
              <Text className="mt-1 text-xs text-amber-800">
                {usageFeed.schedule.perDayQty} kg/day is taken off automatically. Record only extra use here — it lowers stock, not cost.
              </Text>
            ) : null}
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
