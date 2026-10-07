"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Wallet, Scale, ArrowRight, CalendarRange, ListChecks } from 'lucide-react';
import { farmMonth } from '@farm/business-logic';
import type { FinanceReport } from '@/lib/finance';
import { fmtDate, monthLabel, tk } from '@/components/sales/shared';

// Chart colours (validated for colour-blind separation): income blue, costs orange.
const INCOME = '#2a78d6';
const COSTS = '#eb6834';

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'lastmonth', label: 'Last month' },
] as const;

const signed = (n: number) => (n < 0 ? '− ' + tk(-n) : tk(n));

/** Short label of a chart bucket: "7 Oct" for a day, "Oct 26" for a month. */
const bucketLabel = (key: string) =>
  key.length === 7
    ? new Date(key + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    : new Date(key + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function RevenuePortal({ report }: { report: FinanceReport }) {
  const router = useRouter();
  const { range, summary, chart, months, dues } = report;
  const p = summary.profit;
  const c = summary.cash;
  const [custom, setCustom] = useState({ from: range.from, to: range.to });
  const [showCustom, setShowCustom] = useState(range.preset === 'custom');

  const go = (q: string) => router.push(`/dashboard/revenue?${q}`);
  const historyHref = (type: string) => `/dashboard/history?type=${type}&from=${range.from}&to=${range.to}`;
  const periodText =
    range.month && (range.preset === 'month' || range.preset === 'lastmonth' || range.preset === 'pick')
      ? monthLabel(range.month) + (range.preset === 'month' ? ' (so far)' : '')
      : range.from === range.to
        ? fmtDate(range.from)
        : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition sm:py-2 sm:text-xs ${
      active ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Revenue Portal</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">Profit, cash and dues for any period. Every number links to the entries behind it.</p>
      </div>

      {/* Period */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
          {PRESETS.map((pr) => (
            <button key={pr.value} onClick={() => go(`range=${pr.value}`)} aria-pressed={range.preset === pr.value} className={chip(range.preset === pr.value)}>
              {pr.label}
            </button>
          ))}
          <button onClick={() => setShowCustom((v) => !v)} aria-pressed={range.preset === 'custom' || range.preset === 'pick'} className={chip(range.preset === 'custom' || range.preset === 'pick')}>
            <CalendarRange className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            Choose dates
          </button>
        </div>
        {showCustom && (
          <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-[auto_1fr] sm:items-end">
            <div>
              <label htmlFor="rev-month" className="mb-1 block text-xs font-semibold uppercase text-slate-600">A month</label>
              <input
                id="rev-month"
                type="month"
                max={farmMonth()}
                defaultValue={range.month ?? ''}
                onChange={(e) => e.target.value && go(`month=${e.target.value}`)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base sm:text-sm"
              />
            </div>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                go(`from=${custom.from}&to=${custom.to}`);
              }}
            >
              <div className="min-w-[140px] flex-1">
                <label htmlFor="rev-from" className="mb-1 block text-xs font-semibold uppercase text-slate-600">From</label>
                <input id="rev-from" type="date" required value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base sm:text-sm" />
              </div>
              <div className="min-w-[140px] flex-1">
                <label htmlFor="rev-to" className="mb-1 block text-xs font-semibold uppercase text-slate-600">To</label>
                <input id="rev-to" type="date" required min={custom.from} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base sm:text-sm" />
              </div>
              <button type="submit" className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">Show</button>
            </form>
          </div>
        )}
        <p className="text-sm font-semibold text-slate-700">
          {periodText} <span className="font-normal text-slate-500">· {range.days} day{range.days === 1 ? '' : 's'}</span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profit */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="profit-h">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="profit-h" className="text-xs font-bold uppercase tracking-wider text-slate-500">Profit</h2>
              <p className={`mt-1 text-3xl font-extrabold ${p.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{signed(p.profit)}</p>
              <p className="mt-1 text-xs text-slate-500">What the farm earned minus what it cost, whether paid yet or not.</p>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white ${p.profit < 0 ? 'bg-red-600' : 'bg-emerald-600'}`}>
              {p.profit < 0 ? <TrendingDown className="h-5 w-5" aria-label="Loss" /> : <TrendingUp className="h-5 w-5" aria-label="Profit" />}
            </div>
          </div>
          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
            <Row label={`Sales made (${p.salesCount})`} value={tk(p.salesMade)} href={historyHref('sale')} />
            <Row label="Other income" value={tk(p.otherIncome)} href={historyHref('income')} />
            <Row label="Feed bought" value={'− ' + tk(p.feed)} href={historyHref('feed')} hint="Feed with days set is spread over those days" />
            <Row label="Workers' pay earned" value={'− ' + tk(p.labour)} href="/dashboard/employees" hint="Salary ÷ 30 per day worked, plus daily labour" />
            {p.writtenOff > 0 && <Row label="Advances written off" value={'− ' + tk(p.writtenOff)} href={historyHref('writeoff')} />}
            <Row label="Other expenses" value={'− ' + tk(p.otherExpenses)} href={historyHref('expense')} />
            <Row label="Profit" value={signed(p.profit)} strong />
          </dl>
        </section>

        {/* Cash */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="cash-h">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="cash-h" className="text-xs font-bold uppercase tracking-wider text-slate-500">Cash flow</h2>
              <p className={`mt-1 text-3xl font-extrabold ${c.net < 0 ? 'text-red-600' : 'text-slate-900'}`}>{signed(c.net)}</p>
              <p className="mt-1 text-xs text-slate-500">Money that actually came in minus money that went out.</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
            <Row label="Received from customers" value={tk(c.fromCustomers)} href={historyHref('payment')} />
            <Row label="Other income" value={tk(c.otherIncome)} href={historyHref('income')} />
            <Row label="Money in" value={tk(c.moneyIn)} strong />
            <Row label="Paid to suppliers" value={'− ' + tk(c.toSuppliers)} href={historyHref('supplier')} />
            {c.feedPaidOnSpot > 0 && <Row label="Feed paid on the spot" value={'− ' + tk(c.feedPaidOnSpot)} href={historyHref('feed')} />}
            <Row label="Paid to workers" value={'− ' + tk(c.toWorkers)} href={historyHref('salary')} />
            <Row label="Other expenses" value={'− ' + tk(c.otherExpenses)} href={historyHref('expense')} />
            <Row label="Money out" value={'− ' + tk(c.moneyOut)} strong />
          </dl>
        </section>
      </div>

      {/* Dues */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="dues-h">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h2 id="dues-h" className="text-base font-bold text-slate-900">Dues right now</h2>
        </div>
        <p className="text-xs text-slate-500">Why profit and cash differ: sales not yet paid for, and bills not yet paid.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Due label="Customers owe you" value={dues.customersOwe} href="/dashboard/customers" />
          <Due label="You owe suppliers" value={dues.youOweSuppliers} href="/dashboard/suppliers" />
          <Due label="You owe workers" value={dues.youOweWorkers} href="/dashboard/employees" />
          <Due label="Advances to workers" value={dues.workerAdvances} href="/dashboard/employees" />
        </div>
      </section>

      <IncomeCostChart chart={chart} />

      {/* Months */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="months-h">
        <div className="flex items-center justify-between gap-3 p-5 sm:p-6">
          <div>
            <h2 id="months-h" className="text-base font-bold text-slate-900">Month by month</h2>
            <p className="text-xs text-slate-500">Tap a month to see it in full.</p>
          </div>
          <Link href="/dashboard/history" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <ListChecks className="h-4 w-4" /> All entries
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Month</th>
                <th className="px-3 py-3 text-right">Income</th>
                <th className="px-3 py-3 text-right">Costs</th>
                <th className="px-3 py-3 text-right">Profit</th>
                <th className="px-3 py-3 text-right">Money in</th>
                <th className="px-5 py-3 text-right">Money out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((m) => (
                <tr key={m.month} className={`cursor-pointer hover:bg-slate-50 ${range.month === m.month ? 'bg-sky-50/60' : ''}`} onClick={() => go(`month=${m.month}`)}>
                  <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-900">
                    <Link href={`/dashboard/revenue?month=${m.month}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{monthLabel(m.month)}</Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{tk(m.income)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{tk(m.costs)}</td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${m.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{signed(m.profit)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{tk(m.moneyIn)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-slate-700">{tk(m.moneyOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, href, hint, strong }: { label: string; value: string; href?: string; hint?: string; strong?: boolean }) {
  const body = (
    <>
      <dt className={`min-w-0 ${strong ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
        {label}
        {hint && <span className="block text-[11px] font-normal text-slate-400">{hint}</span>}
      </dt>
      <dd className={`flex shrink-0 items-center gap-1 ${strong ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-900'}`}>
        {value}
        {href && <ArrowRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />}
      </dd>
    </>
  );
  return href ? (
    <Link href={href} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50">{body}</Link>
  ) : (
    <div className="flex items-center justify-between gap-3 py-2.5">{body}</div>
  );
}

function Due({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-slate-200 hover:bg-slate-50">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-900">{tk(value)}</p>
    </Link>
  );
}

/** Income vs costs per day (or per month for long ranges), with a tooltip per pair. */
function IncomeCostChart({ chart }: { chart: FinanceReport['chart'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...chart.flatMap((b) => [b.income, b.costs]));
  const H = 160;
  const h = (v: number) => (v > 0 ? Math.max(2, (v / max) * H) : 0);
  const active = hover !== null ? chart[hover] : null;
  const ticks = chart.length <= 1 ? [0] : [0, Math.floor((chart.length - 1) / 2), chart.length - 1];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="chart-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="chart-h" className="text-base font-bold text-slate-900">Income and costs</h2>
          <p className="text-xs text-slate-500">{chart[0]?.key.length === 7 ? 'Per month' : 'Per day'} · profit view</p>
        </div>
        <div className="flex gap-4 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} /> Income</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COSTS }} /> Costs</span>
        </div>
      </div>

      <div className="mt-3 h-12 text-sm" aria-live="polite">
        {active ? (
          <div className="inline-flex flex-wrap gap-x-4 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="font-semibold text-slate-900">{active.key.length === 7 ? monthLabel(active.key) : fmtDate(active.key)}</span>
            <span className="text-slate-600">Income <b className="text-slate-900">{tk(active.income)}</b></span>
            <span className="text-slate-600">Costs <b className="text-slate-900">{tk(active.costs)}</b></span>
            <span className="text-slate-600">Profit <b className={active.profit < 0 ? 'text-red-600' : 'text-emerald-700'}>{signed(active.profit)}</b></span>
          </div>
        ) : (
          <p className="pt-2 text-xs text-slate-400">Point at or tap a bar to see its numbers. Highest: {tk(max)}</p>
        )}
      </div>

      <div className="relative border-b border-slate-200" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-100" aria-hidden="true" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-100" aria-hidden="true" />
        <div className="relative flex h-full items-end gap-[2px]">
          {chart.map((b, i) => (
            <button
              key={b.key}
              type="button"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              aria-label={`${b.key}: income ${tk(b.income)}, costs ${tk(b.costs)}`}
              className={`flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-t px-[1px] ${hover === i ? 'bg-slate-100' : ''}`}
            >
              <span className="w-full max-w-[14px] rounded-t-[4px]" style={{ height: h(b.income), background: INCOME }} />
              <span className="w-full max-w-[14px] rounded-t-[4px]" style={{ height: h(b.costs), background: COSTS }} />
            </button>
          ))}
        </div>
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] text-slate-400">
        {ticks.map((t, i) => (
          <span
            key={t}
            className="absolute whitespace-nowrap"
            style={i === 0 ? { left: 0 } : i === ticks.length - 1 ? { right: 0 } : { left: `${((t + 0.5) / chart.length) * 100}%`, transform: 'translateX(-50%)' }}
          >
            {bucketLabel(chart[t].key)}
          </span>
        ))}
      </div>
    </section>
  );
}
