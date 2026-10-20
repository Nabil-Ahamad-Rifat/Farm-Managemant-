import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { TrendingUp, TrendingDown, Wallet, Scale, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { barHeightPx, farmMonth, shiftMonth, type FinanceSummary } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { fmtDate, monthLabel, tk } from '@/src/lib/format';
import { ChipGroup } from '@/src/components/ui';
import { MoneyRow, signed, minus, moneyError } from '@/src/components/money/MoneyRow';

/** GET /api/revenue (range=… or month=…) */
interface RevenueReport {
  range: { preset: string; from: string; to: string; month: string | null; days: number };
  summary: FinanceSummary;
  chart: { key: string; income: number; costs: number; profit: number }[];
  months: { month: string; income: number; costs: number; profit: number; moneyIn: number; moneyOut: number }[];
  dues: { customersOwe: number; youOweSuppliers: number; youOweWorkers: number; workerAdvances: number };
}

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'lastmonth', label: 'Last month' },
  { value: 'pick', label: 'Pick a month' },
];

function IncomeCostChart({ chart }: { chart: RevenueReport['chart'] }) {
  if (!chart.length) return null;
  const maxVal = Math.max(...chart.map((d) => Math.max(d.income, d.costs)), 1);
  const perMonth = chart[0].key.length === 7;
  // Label every bar on short ranges, otherwise about six labels.
  const every = Math.max(1, Math.ceil(chart.length / 6));

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-5">
      <Text className="text-sm font-bold text-slate-900">Income and costs</Text>
      <Text className="text-[11px] text-slate-500">{perMonth ? 'Per month' : 'Per day'}, on the profit basis</Text>
      <View className="mt-3 flex-row items-end gap-0.5" style={{ height: 90 }}>
        {chart.map((d, i) => (
          <View key={d.key} className="flex-1 items-center gap-0.5">
            <View className="w-full flex-row items-end justify-center gap-px" style={{ height: 72 }}>
              <View className="flex-1 rounded-t bg-emerald-500" style={{ height: barHeightPx(d.income, maxVal, 72) }} />
              <View className="flex-1 rounded-t bg-red-300" style={{ height: barHeightPx(d.costs, maxVal, 72) }} />
            </View>
            <Text className="text-[8px] text-slate-400">{i % every === 0 ? (perMonth ? d.key.slice(5) : d.key.slice(8)) : ' '}</Text>
          </View>
        ))}
      </View>
      <View className="mt-3 flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <View className="h-2 w-3 rounded bg-emerald-500" />
          <Text className="text-[11px] text-slate-500">Income</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="h-2 w-3 rounded bg-red-300" />
          <Text className="text-[11px] text-slate-500">Costs</Text>
        </View>
      </View>
    </View>
  );
}

function Due({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</Text>
      <Text className="mt-1 text-lg font-extrabold text-slate-900">{tk(value)}</Text>
    </View>
  );
}

export default function RevenueScreen() {
  const thisMonth = farmMonth();
  const [preset, setPreset] = useState('month');
  const [pickedMonth, setPickedMonth] = useState(shiftMonth(thisMonth, -1));
  const [data, setData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const query = preset === 'pick' ? `month=${pickedMonth}` : `range=${preset}`;

  const fetchData = useCallback(async () => {
    try {
      setData(await mobileApiClient.get<RevenueReport>(`/api/revenue?${query}`, 'Failed to load the money report'));
      setError('');
    } catch (err) {
      setError(moneyError(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // A new period must show the spinner again before its request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchData();
  }, [fetchData]);

  function showMonth(month: string) {
    if (month === thisMonth) setPreset('month');
    else {
      setPickedMonth(month);
      setPreset('pick');
    }
  }

  const r = data?.range;
  const periodText = !r
    ? ''
    : r.month && (r.preset === 'month' || r.preset === 'lastmonth' || r.preset === 'pick')
      ? monthLabel(r.month) + (r.preset === 'month' ? ' (so far)' : '')
      : r.from === r.to
        ? fmtDate(r.from)
        : `${fmtDate(r.from)} – ${fmtDate(r.to)}`;
  const p = data?.summary.profit;
  const c = data?.summary.cash;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="gap-4 p-4 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await fetchData();
            setRefreshing(false);
          }}
        />
      }
    >
      <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <ChipGroup options={PRESETS} value={preset} onChange={setPreset} />
        {preset === 'pick' ? (
          <View className="flex-row items-center justify-between rounded-xl border border-slate-200 p-1">
            <Pressable onPress={() => setPickedMonth(shiftMonth(pickedMonth, -1))} className="rounded-lg p-2" accessibilityLabel="Previous month">
              <ChevronLeft size={18} color="#475569" />
            </Pressable>
            <Text className="text-sm font-bold text-slate-900">{monthLabel(pickedMonth)}</Text>
            <Pressable
              onPress={() => pickedMonth < thisMonth && setPickedMonth(shiftMonth(pickedMonth, 1))}
              className={`rounded-lg p-2 ${pickedMonth < thisMonth ? '' : 'opacity-30'}`}
              accessibilityLabel="Next month"
            >
              <ChevronRight size={18} color="#475569" />
            </Pressable>
          </View>
        ) : null}
        {r ? (
          <Text className="text-sm font-semibold text-slate-700">
            {periodText} <Text className="font-normal text-slate-500">· {r.days} day{r.days === 1 ? '' : 's'}</Text>
          </Text>
        ) : null}
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
      ) : data && p && c ? (
        <>
          <View className="rounded-2xl border border-slate-200 bg-white p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Profit</Text>
                <Text className={`mt-1 text-3xl font-extrabold ${p.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{signed(p.profit)}</Text>
                <Text className="mt-1 text-xs text-slate-500">What the farm earned minus what it cost, whether paid yet or not.</Text>
              </View>
              <View className={`h-10 w-10 items-center justify-center rounded-xl ${p.profit < 0 ? 'bg-red-600' : 'bg-emerald-700'}`}>
                {p.profit < 0 ? <TrendingDown size={20} color="white" /> : <TrendingUp size={20} color="white" />}
              </View>
            </View>
            <View className="mt-4 border-t border-slate-100">
              <MoneyRow first label={`Sales made (${p.salesCount})`} value={tk(p.salesMade)} />
              <MoneyRow label="Other income" value={tk(p.otherIncome)} />
              <MoneyRow label="Feed bought" value={minus(p.feed)} hint="Feed with days set is spread over those days" />
              <MoneyRow label="Workers' pay earned" value={minus(p.labour)} hint="Salary ÷ 30 per day worked, plus daily labour" />
              {p.writtenOff > 0 ? <MoneyRow label="Advances written off" value={minus(p.writtenOff)} /> : null}
              <MoneyRow label="Animal care" value={minus(p.animalCare)} hint="Costs on animal records: vet, medicine, vaccine, AI" />
              <MoneyRow label="Other expenses" value={minus(p.otherExpenses)} />
              <MoneyRow label="Profit" value={signed(p.profit)} strong />
            </View>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Cash flow</Text>
                <Text className={`mt-1 text-3xl font-extrabold ${c.net < 0 ? 'text-red-600' : 'text-slate-900'}`}>{signed(c.net)}</Text>
                <Text className="mt-1 text-xs text-slate-500">Money that actually came in minus money that went out.</Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                <Wallet size={20} color="white" />
              </View>
            </View>
            <View className="mt-4 border-t border-slate-100">
              <MoneyRow first label="Received from customers" value={tk(c.fromCustomers)} />
              <MoneyRow label="Other income" value={tk(c.otherIncome)} />
              <MoneyRow label="Money in" value={tk(c.moneyIn)} strong />
              <MoneyRow label="Paid to suppliers" value={minus(c.toSuppliers)} />
              {c.feedPaidOnSpot > 0 ? <MoneyRow label="Feed paid on the spot" value={minus(c.feedPaidOnSpot)} /> : null}
              <MoneyRow label="Paid to workers" value={minus(c.toWorkers)} />
              {c.animalCare > 0 ? <MoneyRow label="Animal care" value={minus(c.animalCare)} /> : null}
              <MoneyRow label="Other expenses" value={minus(c.otherExpenses)} />
              <MoneyRow label="Money out" value={minus(c.moneyOut)} strong />
            </View>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-5">
            <View className="flex-row items-center gap-2">
              <Scale size={16} color="#94a3b8" />
              <Text className="text-base font-bold text-slate-900">Dues right now</Text>
            </View>
            <Text className="text-xs text-slate-500">Why profit and cash differ: sales not yet paid for, and bills not yet paid.</Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              <Due label="Customers owe you" value={data.dues.customersOwe} />
              <Due label="You owe suppliers" value={data.dues.youOweSuppliers} />
              <Due label="You owe workers" value={data.dues.youOweWorkers} />
              <Due label="Advances to workers" value={data.dues.workerAdvances} />
            </View>
          </View>

          <IncomeCostChart chart={data.chart} />

          <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <View className="p-5 pb-3">
              <Text className="text-base font-bold text-slate-900">Month by month</Text>
              <Text className="text-xs text-slate-500">Tap a month to see it in full.</Text>
            </View>
            {data.months.map((m) => (
              <Pressable
                key={m.month}
                onPress={() => showMonth(m.month)}
                className={`gap-1 border-t border-slate-100 px-5 py-3 ${r?.month === m.month ? 'bg-sky-50' : ''}`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-slate-900">{monthLabel(m.month)}</Text>
                  <Text className={`text-sm font-bold ${m.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{signed(m.profit)}</Text>
                </View>
                <Text className="text-[11px] text-slate-500">
                  Income {tk(m.income)} · Costs {tk(m.costs)} · In {tk(m.moneyIn)} · Out {tk(m.moneyOut)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
