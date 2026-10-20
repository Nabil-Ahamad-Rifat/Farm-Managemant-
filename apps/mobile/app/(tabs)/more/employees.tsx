import { useCallback, useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/src/components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Search, HandCoins, Wallet, ChevronRight } from 'lucide-react-native';
import type { WorkerListItem } from '@farm/shared-types';
import { useCrudList } from '@/src/hooks/useCrudList';
import { tk } from '@/src/lib/format';
import { ChipGroup, EmptyState, StatCard } from '@/src/components/ui';
import { WorkerFormModal, WorkerPaymentModal } from '@/src/components/workers/WorkerModals';
import { balanceInfo, payLabel } from '@/src/components/workers/shared';

const FILTERS = [
  { value: 'active', label: 'Working' },
  { value: 'left', label: 'Left' },
  { value: 'all', label: 'All' },
];

export default function EmployeesScreen() {
  const { items: workers, loading, refreshing, error, refresh, reload } = useCrudList<WorkerListItem>('/api/employees');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState<WorkerListItem | null>(null);

  // Coming back from a worker's page: pick up pay or absences added there.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // Farm-wide totals: never affected by the search box or filter.
  const owed = workers.reduce((s, w) => s + Math.max(0, w.account.balance), 0);
  const advances = workers.reduce((s, w) => s + Math.max(0, -w.account.balance), 0);
  const monthEarned = workers.reduce((s, w) => s + w.thisMonth.earned, 0);
  const monthPaid = workers.reduce((s, w) => s + w.thisMonth.paid, 0);

  const q = search.trim().toLowerCase();
  const shown = workers.filter(
    (w) =>
      (filter === 'all' || (filter === 'left') === (w.status === 'left')) &&
      (!q || w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q) || (w.phone ?? '').includes(q)),
  );
  const counts: Record<string, number> = {
    active: workers.filter((w) => w.status !== 'left').length,
    left: workers.filter((w) => w.status === 'left').length,
    all: workers.length,
  };

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
        data={shown}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-4 pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View className="gap-3">
            <View className="flex-row gap-3">
              <StatCard
                label="You owe workers"
                value={tk(owed)}
                subtext={advances > 0 ? `Advances given ${tk(advances)}` : 'Earned but not paid yet'}
                icon={HandCoins}
                color={owed > 0 ? '#dc2626' : '#475569'}
              />
              <StatCard label="Labour this month" value={tk(monthEarned)} subtext={`Paid ${tk(monthPaid)} this month`} icon={Wallet} color="#047857" />
            </View>
            <Text className="text-xs text-slate-500">Monthly pay is salary ÷ 30 per day. Tap a worker for their pay account.</Text>
            <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search size={16} color="#94a3b8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, work or phone..."
                placeholderTextColor="#94a3b8"
                className="flex-1 text-sm text-slate-900"
              />
            </View>
            <ChipGroup options={FILTERS.map((f) => ({ ...f, label: `${f.label} ${counts[f.value]}` }))} value={filter} onChange={setFilter} />
            {error ? (
              <View className="rounded-xl border border-red-100 bg-red-50 p-3">
                <Text className="text-xs font-medium text-red-700">{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState message={workers.length === 0 ? 'No workers yet. Add your first worker.' : 'No workers match this search or filter.'} />}
        renderItem={({ item }) => {
          const bal = balanceInfo(item.account.balance);
          return (
            <Pressable onPress={() => router.push(`/worker/${item.id}`)} className="rounded-2xl border border-slate-200 bg-white p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                  <Text className="text-base font-bold text-white">{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
                    {item.status === 'left' ? (
                      <Text className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Left</Text>
                    ) : null}
                  </View>
                  <Text className="text-xs text-slate-500">
                    {item.role ? `${item.role} · ` : ''}
                    {payLabel(item)}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    This month {tk(item.thisMonth.earned)}
                    {item.thisMonth.daysAbsent > 0 ? ` · ${item.thisMonth.daysAbsent} absent` : ''}
                  </Text>
                </View>
                <ChevronRight size={16} color="#cbd5e1" />
              </View>
              <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
                <View className={`rounded-full border px-2.5 py-1 ${bal.pill}`}>
                  <Text className={`text-xs font-bold ${bal.pillText}`}>{bal.label}</Text>
                </View>
                <Pressable onPress={() => setPaying(item)} className="flex-row items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <Wallet size={14} color="#047857" />
                  <Text className="text-xs font-semibold text-emerald-700">Pay</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => setAdding(true)}
        className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 shadow-lg"
      >
        <Plus size={18} color="white" />
        <Text className="font-semibold text-white">Add worker</Text>
      </Pressable>

      {adding ? (
        <WorkerFormModal
          onClose={() => setAdding(false)}
          onSaved={(saved) => {
            setAdding(false);
            reload();
            router.push(`/worker/${saved.id}`);
          }}
        />
      ) : null}
      {paying ? (
        <WorkerPaymentModal
          worker={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            reload();
          }}
        />
      ) : null}
    </View>
  );
}
