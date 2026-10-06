import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Milk, ShoppingBag, Wallet, History, AlertCircle } from 'lucide-react-native';
import { monthKey, shiftMonth, type MonthLine, type MonthStatement } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { monthLabel, tk } from '@/src/lib/format';
import { StatCard } from '@/src/components/ui';
import { BalanceText, TypeBadge } from '@/src/components/StatusPill';

/** GET /api/reports/monthly */
interface MonthlyReport {
  month: string;
  totals: MonthStatement['totals'];
  lines: (MonthLine & { customer: { id: string; name: string; type: string; phone: string | null } | null })[];
}

export default function MonthlyReportScreen() {
  const current = monthKey(new Date());
  const [month, setMonth] = useState(current);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setReport(await mobileApiClient.get<MonthlyReport>(`/api/reports/monthly?month=${month}`, 'Failed to load report'));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [month]);

  useEffect(() => {
    // load() only sets state after its request settles, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const t = report?.month === month ? report.totals : null;
  const owing = report?.lines.filter((l) => l.closing > 0).length ?? 0;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="gap-4 p-4 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-2">
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} className="rounded-xl p-2" accessibilityLabel="Previous month">
          <ChevronLeft size={20} color="#475569" />
        </Pressable>
        <Text className="text-base font-bold text-slate-900">{monthLabel(month)}</Text>
        <Pressable
          onPress={() => month < current && setMonth(shiftMonth(month, 1))}
          className={`rounded-xl p-2 ${month < current ? '' : 'opacity-30'}`}
          accessibilityLabel="Next month"
        >
          <ChevronRight size={20} color="#475569" />
        </Pressable>
      </View>

      {error ? <Text className="text-xs text-red-700">{error}</Text> : null}
      {!t ? (
        <ActivityIndicator />
      ) : (
        <>
          <View className="flex-row gap-3">
            <StatCard label="Milk sold" value={`${t.milkLitres} L`} icon={Milk} color="#0284c7" />
            <StatCard label="Total sales" value={tk(t.sold)} icon={ShoppingBag} color="#475569" />
          </View>
          <View className="flex-row gap-3">
            <StatCard label="Received" value={tk(t.collected)} icon={Wallet} color="#059669" />
            <StatCard label="Due from before" value={tk(t.carriedIn)} icon={History} color="#475569" />
          </View>
          <StatCard
            label="Due at month end"
            value={tk(t.dueAtEnd)}
            subtext={owing ? `${owing} customer${owing === 1 ? '' : 's'} still owe` : 'Nothing owed'}
            icon={AlertCircle}
            color="#dc2626"
          />

          <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {report!.lines.length === 0 ? (
              <Text className="px-4 py-8 text-center text-sm text-slate-500">No sales, payments or dues in {monthLabel(month)}.</Text>
            ) : (
              report!.lines.map((l, i) => (
                <Pressable
                  key={l.partyId ?? 'none'}
                  disabled={!l.customer}
                  onPress={() => l.customer && router.push(`/(tabs)/more/customer/${l.customer.id}`)}
                  className={`gap-1 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''} ${l.closing > 0 ? 'bg-red-50/40' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-slate-900">{l.customer?.name ?? 'No customer (older sales)'}</Text>
                      {l.customer ? <TypeBadge type={l.customer.type} /> : null}
                    </View>
                    <BalanceText value={l.closing} />
                  </View>
                  <Text className="text-[11px] text-slate-500">
                    {l.milkLitres ? `${l.milkLitres} L · ` : ''}sold {tk(l.sold)} · paid {tk(l.paid)}
                    {l.carriedIn ? ` · from before ${l.carriedIn > 0 ? tk(l.carriedIn) : `advance ${tk(-l.carriedIn)}`}` : ''}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
          <Text className="text-[11px] text-slate-500">Due at month end = due from before + sold − paid. Paid is money received in the month.</Text>
        </>
      )}
    </ScrollView>
  );
}
