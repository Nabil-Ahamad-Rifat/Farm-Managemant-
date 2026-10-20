import { useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/src/components/ui/Text';
import { router } from 'expo-router';
import { Search, AlertCircle, Store, Wallet, ChevronRight } from 'lucide-react-native';
import type { SupplierSummary } from '@farm/shared-types';
import { useCrudList } from '@/src/hooks/useCrudList';
import { tk } from '@/src/lib/format';
import { ChipGroup, EmptyState, StatCard } from '@/src/components/ui';
import { BalanceText } from '@/src/components/StatusPill';
import { PaymentModal } from '@/src/components/PaymentModal';

export default function SuppliersScreen() {
  const { items: suppliers, loading, refreshing, refresh, reload } = useCrudList<SupplierSummary>('/api/suppliers');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [paying, setPaying] = useState<SupplierSummary | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = suppliers.filter(
    (s) => (!q || s.name.toLowerCase().includes(q) || (s.phone ?? '').includes(q)) && (filter === 'all' || s.totalDue > 0),
  );
  const totalDue = suppliers.reduce((sum, s) => sum + s.totalDue, 0);
  const owed = suppliers.filter((s) => s.totalDue > 0).length;

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
          <StatCard label="You owe" value={tk(totalDue)} icon={AlertCircle} color="#dc2626" />
          <StatCard label="Suppliers owed" value={`${owed} of ${suppliers.length}`} icon={Store} color="#475569" />
        </View>
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or phone..." placeholderTextColor="#94a3b8" className="flex-1 text-sm text-slate-900" />
        </View>
        <ChipGroup
          options={[
            { value: 'all', label: 'All' },
            { value: 'owed', label: 'I owe money' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerClassName="gap-3 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<EmptyState message={suppliers.length ? 'No suppliers match.' : 'No suppliers yet. Buy feed on credit and the supplier is added for you.'} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/supplier/${item.id}`)} className="rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
                <Text className="text-[11px] text-slate-500">
                  Bought {tk(item.totalBought)} · paid {tk(item.totalPaid)}
                  {item.phone ? ` · ${item.phone}` : ''}
                </Text>
                <BalanceText value={item.totalDue > 0 ? item.totalDue : -item.advance} />
              </View>
              {item.totalDue > 0 ? (
                <Pressable onPress={() => setPaying(item)} className="flex-row items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                  <Wallet size={14} color="#92400e" />
                  <Text className="text-xs font-semibold text-amber-800">Pay</Text>
                </Pressable>
              ) : null}
              <ChevronRight size={16} color="#94a3b8" />
            </View>
          </Pressable>
        )}
      />

      <PaymentModal
        party={paying}
        mode="pay"
        onClose={() => setPaying(null)}
        onSaved={async () => {
          setPaying(null);
          await reload();
        }}
      />
    </View>
  );
}
