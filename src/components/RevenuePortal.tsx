"use client";

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Wheat, PackageOpen, RefreshCw } from 'lucide-react';

interface PeriodStat {
  days: number;
  totalSales: number;
  salesCount: number;
  totalSalaryCost: number;
  totalFeedCost: number;
  totalOtherCost: number;
  totalCost: number;
  netProfit: number;
}

interface DailyBreakdown {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface RevenueData {
  periods: PeriodStat[];
  dailyBreakdown: DailyBreakdown[];
}

const PERIOD_LABELS: Record<number, string> = {
  1: 'Today',
  4: '4 Days',
  8: '8 Days',
  15: '15 Days',
  30: '30 Days',
};

function fmt(n: number) {
  return '৳' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MiniBar({ data }: { data: DailyBreakdown[] }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.cost)), 1);

  return (
    <div className="mt-4">
      <div className="flex items-end gap-1 h-20">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}\nRevenue: ${fmt(d.revenue)}\nCost: ${fmt(d.cost)}\nProfit: ${fmt(d.profit)}`}>
            <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '72px' }}>
              <div
                className="w-full rounded-t bg-red-300/80 transition-all"
                style={{ height: `${Math.max((d.cost / maxVal) * 72, d.cost > 0 ? 2 : 0)}px` }}
              />
              <div
                className="w-full rounded-t bg-emerald-400/80 transition-all"
                style={{ height: `${Math.max((d.revenue / maxVal) * 72, d.revenue > 0 ? 2 : 0)}px` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 rotate-45 mt-1">
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-emerald-400/80" /> Revenue</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-red-300/80" /> Cost</span>
      </div>
    </div>
  );
}

export default function RevenuePortal() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [activePeriod, setActivePeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/revenue?period=${activePeriod}`);
      if (!res.ok) throw new Error('Failed to fetch revenue data');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activePeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentPeriod = data?.periods.find(p => p.days === activePeriod);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Revenue Portal</h1>
          <p className="mt-1 text-slate-500">Total Earn − Total Cost (Salary + Feed + Other) = Net Profit</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {[1, 4, 8, 15, 30].map(days => (
          <button
            key={days}
            onClick={() => setActivePeriod(days)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activePeriod === days
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {PERIOD_LABELS[days]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Loading revenue data...</div>
      ) : currentPeriod ? (
        <>
          {/* Net Profit Hero Card */}
          <div className={`rounded-2xl p-6 text-white ${currentPeriod.netProfit >= 0
            ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg shadow-emerald-600/20'
            : 'bg-gradient-to-br from-red-600 to-red-700 shadow-lg shadow-red-600/20'
          }`}>
            <p className="text-sm font-semibold opacity-80">
              Net Profit — {PERIOD_LABELS[activePeriod]}
            </p>
            <p className="mt-2 text-4xl font-extrabold tracking-tight">
              {fmt(currentPeriod.netProfit)}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm opacity-90">
              {currentPeriod.netProfit >= 0
                ? <TrendingUp className="h-4 w-4" />
                : <TrendingDown className="h-4 w-4" />
              }
              <span>
                {currentPeriod.netProfit >= 0 ? 'Profitable' : 'Running at loss'} in this period
              </span>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total Earn</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-extrabold text-slate-900">{fmt(currentPeriod.totalSales)}</p>
              <p className="text-[11px] text-slate-400 mt-1">{currentPeriod.salesCount} paid sales</p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Labour Cost</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-extrabold text-slate-900">{fmt(currentPeriod.totalSalaryCost)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Salary payments made</p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Feed Cost</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Wheat className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-extrabold text-slate-900">{fmt(currentPeriod.totalFeedCost)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Feed consumed cost</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Other Costs</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <PackageOpen className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-extrabold text-slate-900">{fmt(currentPeriod.totalOtherCost)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Vet, equipment, misc</p>
            </div>
          </div>

          {/* Profit Formula */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Profit Calculation — {PERIOD_LABELS[activePeriod]}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
                <p className="text-[11px] font-semibold text-emerald-700 uppercase">Revenue</p>
                <p className="text-lg font-extrabold text-slate-900">{fmt(currentPeriod.totalSales)}</p>
              </div>
              <span className="text-2xl text-slate-400 font-light">−</span>
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center">
                <p className="text-[11px] font-semibold text-red-700 uppercase">Total Cost</p>
                <p className="text-lg font-extrabold text-slate-900">{fmt(currentPeriod.totalCost)}</p>
              </div>
              <span className="text-2xl text-slate-400 font-light">=</span>
              <div className={`rounded-xl px-4 py-3 text-center border ${currentPeriod.netProfit >= 0
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-red-600 border-red-600 text-white'
              }`}>
                <p className="text-[11px] font-semibold uppercase opacity-80">Net Profit</p>
                <p className="text-lg font-extrabold">{fmt(currentPeriod.netProfit)}</p>
              </div>
            </div>

            {/* Cost breakdown breakdown */}
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">Cost Breakdown</p>
              <div className="space-y-2">
                {[
                  { label: 'Labour (Salaries)', value: currentPeriod.totalSalaryCost, color: 'bg-indigo-400' },
                  { label: 'Feed', value: currentPeriod.totalFeedCost, color: 'bg-amber-400' },
                  { label: 'Other Expenses', value: currentPeriod.totalOtherCost, color: 'bg-slate-400' },
                ].map(({ label, value, color }) => {
                  const pct = currentPeriod.totalCost > 0 ? (value / currentPeriod.totalCost) * 100 : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>{label}</span>
                        <span className="font-semibold">{fmt(value)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Daily Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Daily Trend — Last {activePeriod} Day{activePeriod > 1 ? 's' : ''}
            </h2>
            <MiniBar data={data?.dailyBreakdown || []} />
          </div>

          {/* Period Comparison Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Period Summary Table</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
                    <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Revenue</th>
                    <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Cost</th>
                    <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data?.periods.map(p => (
                    <tr key={p.days} className={`hover:bg-slate-50/50 transition ${activePeriod === p.days ? 'bg-slate-50' : ''}`}>
                      <td className="py-3 pr-4 font-medium text-slate-700">{PERIOD_LABELS[p.days]}</td>
                      <td className="py-3 pr-4 text-right text-emerald-600 font-semibold">{fmt(p.totalSales)}</td>
                      <td className="py-3 pr-4 text-right text-red-500 font-semibold">{fmt(p.totalCost)}</td>
                      <td className={`py-3 text-right font-bold ${p.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {fmt(p.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
