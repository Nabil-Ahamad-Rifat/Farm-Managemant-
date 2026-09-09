import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown, DollarSign, Users, Wheat, PackageOpen, RefreshCw, Coins } from 'lucide-react-native';
import type { RevenueData, DailyBreakdown } from '@farm/shared-types';
import { formatCurrency, barHeightPx } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { ChipGroup, StatCard } from '@/src/components/ui';

const PERIODS = [
  { value: '1', label: 'Today' },
  { value: '3', label: '3 Days' },
  { value: '5', label: '5 Days' },
  { value: '7', label: '7 Days' },
  { value: '15', label: '15 Days' },
  { value: '30', label: '30 Days' },
];

function DailyTrendChart({ data }: { data: DailyBreakdown[] }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.cost)), 1);

  return (
    <View className="mt-2">
      <View className="flex-row items-end gap-1" style={{ height: 90 }}>
        {data.map((d, i) => (
          <View key={i} className="flex-1 items-center gap-0.5">
            <View className="w-full justify-end gap-0.5" style={{ height: 72 }}>
              <View className="w-full rounded-t bg-red-300" style={{ height: barHeightPx(d.cost, maxVal, 72) }} />
              <View className="w-full rounded-t bg-emerald-400" style={{ height: barHeightPx(d.revenue, maxVal, 72) }} />
            </View>
            <Text className="text-[8px] text-slate-400">{d.date.slice(8)}</Text>
          </View>
        ))}
      </View>
      <View className="mt-3 flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <View className="h-2 w-3 rounded bg-emerald-400" />
          <Text className="text-[11px] text-slate-500">Revenue</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="h-2 w-3 rounded bg-red-300" />
          <Text className="text-[11px] text-slate-500">Cost</Text>
        </View>
      </View>
    </View>
  );
}

export default function RevenueScreen() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [activePeriod, setActivePeriod] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await mobileApiClient.get<RevenueData>(`/api/revenue?period=${activePeriod}`, 'Failed to fetch revenue data'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activePeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentPeriod = data?.periods.find((p) => String(p.days) === activePeriod);
  const periodLabel = PERIODS.find((p) => p.value === activePeriod)?.label ?? '';

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-5 p-4">
      <View className="flex-row items-center justify-between">
        <ChipGroup options={PERIODS} value={activePeriod} onChange={setActivePeriod} />
        <Pressable onPress={fetchData} className="rounded-xl border border-slate-200 bg-white p-2.5">
          <RefreshCw size={16} color="#475569" />
        </Pressable>
      </View>

      {error ? (
        <View className="rounded-xl border border-red-100 bg-red-50 p-4">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View className="items-center justify-center py-16">
          <ActivityIndicator />
        </View>
      ) : currentPeriod ? (
        <>
          <View className={`rounded-2xl p-6 ${currentPeriod.netProfit >= 0 ? 'bg-emerald-700' : 'bg-red-700'}`}>
            <Text className="text-sm font-semibold text-white/80">Net Profit — {periodLabel}</Text>
            <Text className="mt-2 text-3xl font-extrabold text-white">{formatCurrency(currentPeriod.netProfit)}</Text>
            <View className="mt-3 flex-row gap-6">
              <View>
                <Text className="text-[10px] uppercase tracking-wide text-white/70">Revenue</Text>
                <Text className="text-sm font-bold text-white">{formatCurrency(currentPeriod.totalRevenue)}</Text>
              </View>
              <View>
                <Text className="text-[10px] uppercase tracking-wide text-white/70">Cost</Text>
                <Text className="text-sm font-bold text-white">{formatCurrency(currentPeriod.totalCost)}</Text>
              </View>
            </View>
            <View className="mt-3 flex-row items-center gap-2">
              {currentPeriod.netProfit >= 0 ? <TrendingUp size={14} color="white" /> : <TrendingDown size={14} color="white" />}
              <Text className="text-xs text-white/90">{currentPeriod.netProfit >= 0 ? 'Profitable' : 'Running at loss'} in this period</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <StatCard label="Sales Revenue" value={formatCurrency(currentPeriod.totalSales)} subtext={`${currentPeriod.salesCount} sales`} icon={DollarSign} color="#059669" />
            <StatCard label="Other Income" value={formatCurrency(currentPeriod.totalOtherIncome)} icon={Coins} color="#0f766e" />
          </View>

          <View className="gap-3">
            <StatCard label="Labour Cost" value={formatCurrency(currentPeriod.totalSalaryCost)} subtext={`Prorated × ${activePeriod}/30`} icon={Users} color="#4338ca" />
            <View className="flex-row gap-3">
              <StatCard label="Feed Cost" value={formatCurrency(currentPeriod.totalFeedCost)} icon={Wheat} color="#b45309" />
              <StatCard label="Other Costs" value={formatCurrency(currentPeriod.totalOtherCost)} icon={PackageOpen} color="#475569" />
            </View>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="text-sm font-bold uppercase tracking-wider text-slate-700">Daily Trend — {periodLabel}</Text>
            <DailyTrendChart data={data?.dailyBreakdown ?? []} />
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-5">
            <Text className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-700">Period Summary</Text>
            <View className="gap-2">
              {data?.periods.map((p) => (
                <View
                  key={p.days}
                  className={`flex-row items-center justify-between rounded-xl p-3 ${String(p.days) === activePeriod ? 'bg-slate-100' : ''}`}
                >
                  <Text className="text-xs font-semibold text-slate-700">{PERIODS.find((pp) => pp.value === String(p.days))?.label}</Text>
                  <Text className="text-xs text-slate-500">Rev {formatCurrency(p.totalRevenue)}</Text>
                  <Text className={`text-xs font-bold ${p.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(p.netProfit)}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
