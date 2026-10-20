import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/src/components/ui/Text';
import { router, type Href } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ShoppingBag, PackagePlus, Ban, Search, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { farmMonth, shiftMonth } from '@farm/business-logic';
import { mobileApiClient } from '@/src/lib/apiClient';
import { fmtDate, monthLabel, tk } from '@/src/lib/format';

// Mobile version of the web History page (GET /api/ledger): every sale,
// payment, purchase and expense in a month, with who added it. Owner only.

type Flow = 'in' | 'out' | 'sale' | 'purchase' | 'loss';

interface LedgerEntry {
  id: string;
  type: string;
  flow: Flow;
  date: string;
  title: string;
  detail: string;
  amount: number;
  href: string;
  byId: string | null;
}

interface Ledger {
  total: number;
  entries: LedgerEntry[];
  totals: { moneyIn: number; moneyOut: number; salesMade: number; boughtOnCredit: number; writtenOff: number };
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

const TYPES: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'sale', label: 'Sales' },
  { value: 'payment', label: 'Received' },
  { value: 'income', label: 'Other income' },
  { value: 'feed', label: 'Feed bought' },
  { value: 'supplier', label: 'Paid suppliers' },
  { value: 'salary', label: 'Paid workers' },
  { value: 'expense', label: 'Expenses' },
  { value: 'animal', label: 'Animal care' },
  { value: 'writeoff', label: 'Written off' },
];

const FLOW: Record<Flow, { Icon: LucideIcon; color: string; bg: string; sign: string; amount: string }> = {
  in: { Icon: ArrowDownLeft, color: '#047857', bg: 'bg-emerald-50', sign: '+ ', amount: 'text-emerald-700' },
  out: { Icon: ArrowUpRight, color: '#dc2626', bg: 'bg-red-50', sign: '− ', amount: 'text-red-600' },
  sale: { Icon: ShoppingBag, color: '#0369a1', bg: 'bg-sky-50', sign: '', amount: 'text-slate-900' },
  purchase: { Icon: PackagePlus, color: '#b45309', bg: 'bg-amber-50', sign: '', amount: 'text-slate-900' },
  loss: { Icon: Ban, color: '#475569', bg: 'bg-slate-100', sign: '', amount: 'text-slate-600' },
};

/** The web link of an entry, as a mobile screen (null when mobile has no page for it). */
function mobileHref(href: string): Href | null {
  const m = href.match(/^\/dashboard\/(customers|suppliers|employees|cows)\/([^/?]+)$/);
  if (m) {
    const [, kind, id] = m;
    if (kind === 'customers') return `/customer/${id}`;
    if (kind === 'suppliers') return `/supplier/${id}`;
    if (kind === 'employees') return `/worker/${id}`;
    return `/animal/${id}`;
  }
  const pages: Record<string, Href> = {
    '/dashboard/sales': '/sales',
    '/dashboard/feed': '/more/feed',
    '/dashboard/income': '/more/income',
    '/dashboard/expenses': '/more/expenses',
  };
  return pages[href] ?? null;
}

const PAGE = 100;

export default function HistoryScreen() {
  const thisMonth = farmMonth();
  const [month, setMonth] = useState(thisMonth);
  const [type, setType] = useState<string | null>(null);
  const [by, setBy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ month, limit: String(limit) });
    if (type) params.set('type', type);
    if (by) params.set('by', by);
    if (q) params.set('q', q);
    try {
      setLedger(await mobileApiClient.get<Ledger>(`/api/ledger?${params}`, 'Failed to load history'));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [month, type, by, q, limit]);

  useEffect(() => {
    // State is only set once the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    mobileApiClient.get<TeamMember[]>('/api/team').then(setTeam).catch(() => setTeam([]));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Any filter change starts from the first page again.
  function change(apply: () => void) {
    apply();
    setLimit(PAGE);
  }

  const nameOf = new Map(team.map((u) => [u.id, u.name]));
  const days = new Map<string, LedgerEntry[]>();
  for (const e of ledger?.entries ?? []) {
    const key = e.date.slice(0, 10);
    days.set(key, [...(days.get(key) ?? []), e]);
  }
  const t = ledger?.totals;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="gap-4 p-4 pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => change(() => setMonth(shiftMonth(month, -1)))} className="rounded-lg p-2" accessibilityLabel="Previous month">
            <ChevronLeft size={18} color="#334155" />
          </Pressable>
          <Text className="text-sm font-bold text-slate-900">{monthLabel(month)}</Text>
          <Pressable
            onPress={() => month < thisMonth && change(() => setMonth(shiftMonth(month, 1)))}
            className={`rounded-lg p-2 ${month < thisMonth ? '' : 'opacity-30'}`}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={18} color="#334155" />
          </Pressable>
        </View>
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => change(() => setQ(search.trim()))}
            onBlur={() => search.trim() !== q && change(() => setQ(search.trim()))}
            returnKeyType="search"
            placeholder="Name, feed, note..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-slate-900"
          />
        </View>
        <Chips options={TYPES.map((ty) => ({ id: ty.value, label: ty.label }))} value={type} onChange={(v) => change(() => setType(v))} />
        {team.length > 1 ? (
          <View className="gap-2 border-t border-slate-100 pt-3">
            <Text className="text-xs font-semibold text-slate-500">Added by</Text>
            <Chips options={[{ id: null, label: 'Everyone' }, ...team.map((u) => ({ id: u.id, label: u.name }))]} value={by} onChange={(v) => change(() => setBy(v))} />
          </View>
        ) : null}
      </View>

      {error ? (
        <View className="rounded-xl border border-red-100 bg-red-50 p-3">
          <Text className="text-xs font-medium text-red-700">{error}</Text>
        </View>
      ) : null}

      {t ? (
        <View className="flex-row flex-wrap gap-3">
          <Total label="Money in" value={tk(t.moneyIn)} cls="text-emerald-700" />
          <Total label="Money out" value={tk(t.moneyOut)} cls="text-red-600" />
          <Total label="Sales made" value={tk(t.salesMade)} cls="text-slate-900" />
          <Total label="Bought on credit" value={tk(t.boughtOnCredit)} cls="text-slate-900" />
        </View>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading && !ledger ? (
          <View className="py-12">
            <ActivityIndicator />
          </View>
        ) : !ledger ? null : (
          <>
            <Text className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
              {ledger.total} entr{ledger.total === 1 ? 'y' : 'ies'}
              {ledger.totals.writtenOff > 0 ? ` · ${tk(ledger.totals.writtenOff)} written off` : ''}
            </Text>
            {ledger.total === 0 ? <Text className="px-4 py-12 text-center text-sm text-slate-500">Nothing in this period.</Text> : null}
            {[...days.entries()].map(([day, rows]) => (
              <View key={day}>
                <Text className="bg-slate-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{fmtDate(day)}</Text>
                {rows.map((e, i) => {
                  const f = FLOW[e.flow] ?? FLOW.loss;
                  const target = mobileHref(e.href);
                  const who = e.byId && team.length > 1 ? nameOf.get(e.byId) : undefined;
                  return (
                    <Pressable
                      key={e.id}
                      disabled={!target}
                      onPress={() => target && router.push(target)}
                      className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <View className={`h-9 w-9 items-center justify-center rounded-xl ${f.bg}`}>
                        <f.Icon size={16} color={f.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                          {e.title}
                        </Text>
                        <Text className="text-xs text-slate-500" numberOfLines={2}>
                          {e.detail}
                          {who ? ` · by ${who}` : ''}
                        </Text>
                      </View>
                      <Text className={`text-sm font-bold ${f.amount}`}>
                        {f.sign}
                        {tk(e.amount)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {ledger.total > ledger.entries.length ? (
              <Pressable onPress={() => setLimit(limit + PAGE)} className="items-center border-t border-slate-100 p-4">
                <Text className="text-sm font-semibold text-slate-700">Show more ({ledger.total - ledger.entries.length} left)</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Chips({ options, value, onChange }: { options: { id: string | null; label: string }[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable key={o.id ?? 'all'} onPress={() => onChange(o.id)} className={`rounded-full px-3.5 py-2 ${active ? 'bg-slate-900' : 'border border-slate-200 bg-white'}`}>
            <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Total({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</Text>
      <Text className={`mt-1 text-lg font-extrabold ${cls}`}>{value}</Text>
    </View>
  );
}
