import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Milk, ShoppingBag, Wallet, History, AlertCircle, Wheat, TrendingUp } from 'lucide-react-native';
import { farmMonth, shiftMonth, type FinanceSummary, type MonthLine, type MonthStatement } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { monthLabel, tk } from '@/src/lib/format';
import { StatCard } from '@/src/components/ui';
import { BalanceText, TypeBadge } from '@/src/components/StatusPill';
import { MoneyRow, signed, minus, moneyError } from '@/src/components/money/MoneyRow';

/** GET /api/reports/monthly */
interface MonthlyReport {
  month: string;
  totals: MonthStatement['totals'];
  lines: (MonthLine & { customer: { id: string; name: string; type: string; phone: string | null } | null })[];
  /** Feed bought this month. */
  feed: { kg: number; spent: number; paid: number; owed: number; count: number };
  /** Profit and cash flow for the month. */
  money: FinanceSummary;
}

export default function MonthlyReportScreen() {
  // The farm's month (Bangladesh time), not the phone's UTC clock.
  const current = farmMonth();
  const [month, setMonth] = useState(current);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // The month whose request has settled (success or failure), so an error never leaves the spinner up.
  const [loaded, setLoaded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReport(await mobileApiClient.get<MonthlyReport>(`/api/reports/monthly?month=${month}`, 'Failed to load report'));
      setError('');
    } catch (err) {
      setError(moneyError(err));
    } finally {
      setLoaded(month);
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
        loaded === month && error ? null : <ActivityIndicator />
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

          <FeedAndProfit feed={report!.feed} money={report!.money} />

          <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {report!.lines.length === 0 ? (
              <Text className="px-4 py-8 text-center text-sm text-slate-500">No sales, payments or dues in {monthLabel(month)}.</Text>
            ) : (
              report!.lines.map((l, i) => (
                <Pressable
                  key={l.partyId ?? 'none'}
                  disabled={!l.customer}
                  onPress={() => l.customer && router.push(`/customer/${l.customer.id}`)}
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

function FeedAndProfit({ feed, money }: { feed: MonthlyReport['feed']; money: FinanceSummary }) {
  const p = money.profit;
  return (
    <>
      <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
          <Wheat size={18} color="#b45309" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900">Feed bought: {tk(feed.spent)}</Text>
          <Text className="text-[11px] text-slate-500">
            {feed.kg.toLocaleString('en-IN')} kg in {feed.count} purchase{feed.count === 1 ? '' : 's'} · paid {tk(feed.paid)}
            {feed.owed > 0 ? ` · still owed ${tk(feed.owed)}` : ''}
          </Text>
        </View>
      </View>

      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <TrendingUp size={16} color="#94a3b8" />
              <Text className="text-base font-bold text-slate-900">Costs and profit</Text>
            </View>
            <Text className="text-xs text-slate-500">Earned and spent this month, whether paid yet or not.</Text>
          </View>
          <Text className={`text-xl font-extrabold ${p.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{signed(p.profit)}</Text>
        </View>
        <View className="mt-3 border-t border-slate-100">
          <MoneyRow first label="Sales made" value={tk(p.salesMade)} />
          <MoneyRow label="Other income" value={tk(p.otherIncome)} />
          <MoneyRow label="Feed bought" value={minus(p.feed)} />
          <MoneyRow label="Workers' pay earned" value={minus(p.labour + p.writtenOff)} />
          <MoneyRow label="Animal care" value={minus(p.animalCare)} />
          <MoneyRow label="Other expenses" value={minus(p.otherExpenses)} />
          <MoneyRow label="Cash in / out" value={`${tk(money.cash.moneyIn)} / ${tk(money.cash.moneyOut)}`} />
        </View>
      </View>
    </>
  );
}
