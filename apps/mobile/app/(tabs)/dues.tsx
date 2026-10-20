import { useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/src/components/ui/Text';
import { router } from 'expo-router';
import { Search, AlertCircle, Users, HandCoins, ChevronRight } from 'lucide-react-native';
import type { CustomerSummary } from '@farm/shared-types';
import { useCrudList } from '@/src/hooks/useCrudList';
import { tk } from '@/src/lib/format';
import { ChipGroup, EmptyState, StatCard } from '@/src/components/ui';
import { TypeBadge, BalanceText } from '@/src/components/StatusPill';
import { PaymentModal } from '@/src/components/PaymentModal';

export default function CustomersScreen() {
  const { items: customers, loading, refreshing, refresh, reload } = useCrudList<CustomerSummary>('/api/customers');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [paying, setPaying] = useState<CustomerSummary | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = customers.filter(
    (c) =>
      (!q || c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)) &&
      (filter === 'all' || (filter === 'owes' ? c.totalDue > 0 : c.type === filter)),
  );
  const totalDue = customers.reduce((s, c) => s + c.totalDue, 0);
  const owing = customers.filter((c) => c.totalDue > 0).length;

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
          <StatCard label="Due to you" value={tk(totalDue)} icon={AlertCircle} color="#dc2626" />
          <StatCard label="Who owe" value={`${owing} of ${customers.length}`} icon={Users} color="#475569" />
        </View>
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or phone..." placeholderTextColor="#94a3b8" className="flex-1 text-sm text-slate-900" />
        </View>
        <ChipGroup
          options={[
            { value: 'all', label: 'All' },
            { value: 'owes', label: 'Owes money' },
            { value: 'regular', label: 'Regular' },
            { value: 'new', label: 'New' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerClassName="gap-3 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<EmptyState message={customers.length ? 'No customers match.' : 'No customers yet. Record a sale and the customer is added for you.'} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/customer/${item.id}`)} className="rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
                  <TypeBadge type={item.type} />
                </View>
                <Text className="text-[11px] text-slate-500">
                  Bought {tk(item.totalSold)} · paid {tk(item.totalPaid)}
                  {item.phone ? ` · ${item.phone}` : ''}
                </Text>
                <BalanceText value={item.totalDue > 0 ? item.totalDue : -item.advance} />
              </View>
              {item.totalDue > 0 ? (
                <Pressable onPress={() => setPaying(item)} className="flex-row items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                  <HandCoins size={14} color="#047857" />
                  <Text className="text-xs font-semibold text-emerald-700">Collect</Text>
                </Pressable>
              ) : null}
              <ChevronRight size={16} color="#94a3b8" />
            </View>
          </Pressable>
        )}
      />

      <PaymentModal
        party={paying}
        mode="collect"
        onClose={() => setPaying(null)}
        onSaved={async () => {
          setPaying(null);
          await reload();
        }}
      />
    </View>
  );
}
