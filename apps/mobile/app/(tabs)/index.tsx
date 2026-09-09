import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { LogOut, BadgeCheck, Users, Wheat, DollarSign } from 'lucide-react-native';
import type { Cow, Employee, FeedBatch, RevenueData } from '@farm/shared-types';
import { totalStockValue, formatCurrency } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { useSession } from '@/src/context/AuthContext';
import { StatCard } from '@/src/components/ui';

export default function OverviewScreen() {
  const { user, signOut } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cowCount, setCowCount] = useState(0);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);
  const [feedStockValue, setFeedStockValue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);

  const fetchOverview = useCallback(async () => {
    const [cows, employees, feed, revenue] = await Promise.all([
      mobileApiClient.get<Cow[]>('/api/cows').catch(() => [] as Cow[]),
      mobileApiClient.get<Employee[]>('/api/employees').catch(() => [] as Employee[]),
      mobileApiClient.get<FeedBatch[]>('/api/feed').catch(() => [] as FeedBatch[]),
      mobileApiClient.get<RevenueData>('/api/revenue?period=1').catch(() => null),
    ]);
    setCowCount(cows.length);
    setActiveEmployeeCount(employees.filter((e) => (e.status || 'active') === 'active').length);
    setFeedStockValue(totalStockValue(feed));
    setTodayRevenue(revenue?.periods.find((p) => p.days === 1)?.totalRevenue ?? 0);
  }, []);

  useEffect(() => {
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
        <Text className="text-xs text-slate-500">{user?.email}</Text>
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
          <StatCard label="Herd (Cows)" value={String(cowCount)} icon={BadgeCheck} color="#2563eb" />
        </View>
        <View className="min-w-[45%] flex-1">
          <StatCard label="Active Employees" value={String(activeEmployeeCount)} icon={Users} color="#4f46e5" />
        </View>
        <View className="min-w-[45%] flex-1">
          <StatCard label="Feed Stock Value" value={formatCurrency(feedStockValue)} icon={Wheat} color="#d97706" />
        </View>
        <View className="min-w-[45%] flex-1">
          <StatCard label="Revenue Today" value={formatCurrency(todayRevenue)} icon={DollarSign} color="#059669" />
        </View>
      </View>
    </ScrollView>
  );
}
