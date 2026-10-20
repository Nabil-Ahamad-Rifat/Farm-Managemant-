import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { LogOut, BadgeCheck, Users, Wheat, DollarSign } from 'lucide-react-native';
import type { AnimalDueItem, Cow, Employee, FeedBatch, RevenueData } from '@farm/shared-types';
import { totalStockValue, formatCurrency } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useSession } from '@/src/context/AuthContext';
import { StatCard } from '@/src/components/ui';
import { DueSoonCard } from '@/src/components/animals/DueSoonCard';

export default function OverviewScreen() {
  const { user, isOwner, signOut } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cowCount, setCowCount] = useState(0);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);
  const [feedStockValue, setFeedStockValue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [dueSoon, setDueSoon] = useState<AnimalDueItem[]>([]);

  const fetchOverview = useCallback(async () => {
    const [cows, employees, feed, revenue, due] = await Promise.all([
      mobileApiClient.get<Cow[]>('/api/cows').catch(() => [] as Cow[]),
      mobileApiClient.get<Employee[]>('/api/employees').catch(() => [] as Employee[]),
      mobileApiClient.get<FeedBatch[]>('/api/feed').catch(() => [] as FeedBatch[]),
      // Money reports are owner-only (managers get a 403).
      isOwner ? mobileApiClient.get<RevenueData>('/api/revenue?period=1').catch(() => null) : Promise.resolve(null),
      mobileApiClient.get<AnimalDueItem[]>('/api/animals/due-soon').catch(() => [] as AnimalDueItem[]),
    ]);
    setCowCount(cows.filter((c) => c.status !== 'sold' && c.status !== 'dead').length);
    setActiveEmployeeCount(employees.filter((e) => (e.status || 'active') === 'active').length);
    setFeedStockValue(totalStockValue(feed));
    setTodayRevenue(revenue?.periods.find((p) => p.days === 1)?.totalRevenue ?? 0);
    setDueSoon(due);
  }, [isOwner]);

  useEffect(() => {
    // setLoading(false) only runs once fetchOverview's promise settles, not
    // synchronously within this effect — the rule can't see through the
    // .finally() boundary, but there's no cascading-render risk here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOverview().finally(() => setLoading(false));
  }, [fetchOverview]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchOverview();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-5 gap-5"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="rounded-2xl border border-slate-200 bg-white p-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signed in as</Text>
        <Text className="mt-1 text-lg font-bold text-slate-900">{user?.name}</Text>
        <Text className="text-xs text-slate-500">
          {user?.email}
          {isOwner ? '' : ' · Manager'}
        </Text>
        <Pressable
          onPress={signOut}
          className="mt-4 flex-row items-center gap-2 self-start rounded-xl border border-red-200 bg-red-50 px-3 py-2"
        >
          <LogOut size={14} color="#dc2626" />
          <Text className="text-xs font-semibold text-red-600">Sign out</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-4">
        <View className="min-w-[45%] flex-1">
          <StatCard label="In herd" value={String(cowCount)} icon={BadgeCheck} color="#2563eb" />
        </View>
        <View className="min-w-[45%] flex-1">
          <StatCard label="Active Employees" value={String(activeEmployeeCount)} icon={Users} color="#4f46e5" />
        </View>
        <View className="min-w-[45%] flex-1">
          <StatCard label="Feed Stock Value" value={formatCurrency(feedStockValue)} icon={Wheat} color="#d97706" />
        </View>
        {isOwner ? (
          <View className="min-w-[45%] flex-1">
            <StatCard label="Revenue Today" value={formatCurrency(todayRevenue)} icon={DollarSign} color="#059669" />
          </View>
        ) : null}
      </View>

      <DueSoonCard items={dueSoon} />
    </ScrollView>
  );
}
