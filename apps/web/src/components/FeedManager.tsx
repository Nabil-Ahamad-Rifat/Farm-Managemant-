"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Trash2, Edit3, Wheat, AlertTriangle, X, BarChart2, Droplets, CalendarClock, Store, ShoppingBag, Wallet, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { FeedBatch } from '@farm/shared-types';
import { webApiClient } from '@farm/api-client';
import { feedMonthSummary, isLowStock, monthKey, shiftMonth, stockPercentage, totalStockValue } from '@farm/business-logic';
import FeedPurchaseModal, { PRESET_FEED_NAMES } from '@/components/feed/FeedPurchaseModal';
import type { PickerCustomer } from '@/components/sales/CustomerPicker';
import { PaymentStatusPill, SummaryCard, tk, fmtDate, monthLabel } from '@/components/sales/shared';
import { feedPayStatus } from '@/components/feed/shared';

export default function FeedManager({
  initialFeed,
  suppliers,
  feedCostToday,
  totalPayable,
  month,
}: {
  initialFeed: FeedBatch[];
  suppliers: PickerCustomer[];
  /** Today's feed cost: per-day share of purchases with days set, plus purchases without days bought today. */
  feedCostToday: number;
  totalPayable: number;
  /** "YYYY-MM" shown in the feed account. */
  month: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'month' | 'stock'>('month');
  const [purchaseModal, setPurchaseModal] = useState<{ batch: FeedBatch | null } | null>(null);
  const [usageFeed, setUsageFeed] = useState<FeedBatch | null>(null);
  const [usageForm, setUsageForm] = useState({ quantity: '', note: '' });
  const [usageError, setUsageError] = useState('');
  const [loading, setLoading] = useState(false);

  function openUsageModal(feed: FeedBatch) {
    setUsageFeed(feed);
    setUsageForm({ quantity: '', note: '' });
    setUsageError('');
  }

  async function handleUsageSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usageFeed) return;
    setLoading(true);
    setUsageError('');

    try {
      await webApiClient.post('/api/feed/usage', { feedBatchId: usageFeed.id, ...usageForm }, 'Failed to record usage');
      setUsageFeed(null);
      router.refresh();
    } catch (err) {
      setUsageError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: FeedBatch) {
    const owedNote = item.supplier ? ` Payments to ${item.supplier.name} stay and count towards their other purchases.` : '';
    if (!confirm(`Delete the ${item.name} purchase of ${item.quantity} kg?${owedNote}`)) return;

    try {
      await webApiClient.delete(`/api/feed/${item.id}`);
      router.refresh();
    } catch {
      alert('Failed to delete feed batch.');
    }
  }

  const summary = feedMonthSummary(initialFeed, month);
  const current = monthKey(new Date());
  const q = search.toLowerCase();
  // "This month" lists that month's purchases; "In stock" lists everything with stock left, from any month.
  const shown = view === 'stock' ? initialFeed.filter((b) => b.remainingQuantity > 0) : summary.purchases;
  const filteredFeed = shown.filter(
    (item) => item.name.toLowerCase().includes(q) || (item.supplier?.name ?? '').toLowerCase().includes(q),
  );
  const runningLow = initialFeed.filter((b) => b.schedule && b.schedule.remaining > 0 && b.schedule.daysLeft <= 1);
  const monthHref = (m: string) => `/dashboard/feed?month=${m}`;
  const navBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Feed Inventory</h1>
          <p className="mt-1 text-slate-500">What you bought each month, from whom, what it cost and what is still owed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Choose month" className="flex items-center gap-2">
            <Link href={monthHref(shiftMonth(month, -1))} className={navBtn} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <p className="min-w-36 text-center text-base font-bold text-slate-900" aria-live="polite">{monthLabel(month)}</p>
            {month < current ? (
              <Link href={monthHref(shiftMonth(month, 1))} className={navBtn} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className={`${navBtn} cursor-not-allowed opacity-40`} aria-hidden="true">
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </nav>
          <button
            onClick={() => setPurchaseModal({ batch: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Buy feed
          </button>
        </div>
      </div>

      {/* This month's feed account */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Feed bought"
          value={`${summary.totals.kg.toLocaleString('en-IN')} kg`}
          Icon={Wheat}
          tone="slate"
          hint={`${summary.totals.count} purchase${summary.totals.count === 1 ? '' : 's'} in ${monthLabel(month)}`}
        />
        <SummaryCard label="Total spent" value={tk(summary.totals.spent)} Icon={ShoppingBag} tone="slate" hint="All feed bought this month" />
        <SummaryCard label="Paid" value={tk(summary.totals.paid)} Icon={Wallet} tone="emerald" />
        <SummaryCard label="Still owed" value={tk(summary.totals.owed)} Icon={Store} tone="red" hint="For this month's feed" />
      </div>

      {summary.byFeed.length > 0 && (
        <section aria-label="Subtotal per feed" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Feed', 'Purchases', 'Quantity', 'Avg price', 'Spent'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.byFeed.map((f) => (
                <tr key={f.name}>
                  <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-slate-900">{f.name}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{f.count}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{f.kg.toLocaleString('en-IN')} kg</td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{tk(Math.round((f.spent / f.kg) * 100) / 100)}/kg</td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm font-bold text-slate-900">{tk(f.spent)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr className="text-sm font-bold text-slate-900">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3">{summary.totals.count}</td>
                <td className="px-5 py-3">{summary.totals.kg.toLocaleString('en-IN')} kg</td>
                <td />
                <td className="px-5 py-3">{tk(summary.totals.spent)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>
          <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
          Feed cost today: <strong className="text-slate-700">{tk(feedCostToday)}</strong>
        </span>
        <span>
          <BarChart2 className="mr-1 inline h-3.5 w-3.5" />
          Stock value now: <strong className="text-slate-700">{tk(Math.round(totalStockValue(initialFeed)))}</strong>
        </span>
        <Link href="/dashboard/suppliers" className="hover:underline">
          <Store className="mr-1 inline h-3.5 w-3.5" />
          You owe suppliers in total: <strong className="text-red-600">{tk(totalPayable)}</strong> →
        </Link>
      </p>

      {runningLow.length > 0 && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">Running out soon:</span>{' '}
            {runningLow.map((b) => `${b.name} (${b.schedule!.remaining.toLocaleString()} kg left)`).join(', ')}. Time to buy more.
          </p>
        </div>
      )}

      {/* Quick filter + search */}
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium text-slate-500">Quick filter:</span>
        {PRESET_FEED_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => setSearch(search === name ? '' : name)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              search === name ? 'border-amber-600 bg-amber-600 text-white' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex gap-2" role="tablist" aria-label="Which feed to list">
        {[
          { value: 'month', label: `Bought in ${monthLabel(month)}` },
          { value: 'stock', label: 'All in stock now' },
        ].map((v) => (
          <button
            key={v.value}
            role="tab"
            aria-selected={view === v.value}
            onClick={() => setView(v.value as 'month' | 'stock')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              view === v.value ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          aria-label="Search feed"
          placeholder="Search feed or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none"
        />
      </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Feed', 'Supplier', 'Bought', 'Total', 'Per day', 'Days left', 'Stock left'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredFeed.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-slate-500">
                  {initialFeed.length === 0
                    ? 'No feed bought yet. Use “Buy feed” to record your first purchase.'
                    : shown.length === 0
                      ? view === 'month'
                        ? `No feed bought in ${monthLabel(month)}.`
                        : 'No feed in stock.'
                      : 'No feed matches.'}
                </td>
              </tr>
            ) : (
              filteredFeed.map((item) => <FeedRow key={item.id} item={item} onUse={openUsageModal} onEdit={(b) => setPurchaseModal({ batch: b })} onDelete={handleDelete} />)
            )}
          </tbody>
        </table>
      </div>

      {purchaseModal && (
        <FeedPurchaseModal
          suppliers={suppliers}
          batch={purchaseModal.batch}
          onClose={() => setPurchaseModal(null)}
          onSaved={() => {
            setPurchaseModal(null);
            router.refresh();
          }}
        />
      )}

      {/* Feed Usage Modal */}
      {usageFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Record feed usage">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{usageFeed.schedule ? 'Record extra use' : 'Record Feed Usage'}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{usageFeed.name}</p>
              </div>
              <button onClick={() => setUsageFeed(null)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
              Available stock: <span className="font-bold">{usageFeed.remainingQuantity.toLocaleString()} kg</span>
              {usageFeed.schedule && (
                <p className="mt-1">
                  {usageFeed.schedule.perDayQty.toLocaleString()} kg/day is taken off automatically. Record only extra use here — it lowers
                  stock, not cost.
                </p>
              )}
            </div>

            {usageError && (
              <div role="alert" className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">
                {usageError}
              </div>
            )}

            <form onSubmit={handleUsageSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="usage-qty" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Quantity Used (kg)</label>
                <input
                  id="usage-qty"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={usageFeed.remainingQuantity}
                  required
                  placeholder="e.g. 50"
                  value={usageForm.quantity}
                  onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="usage-note" className="mb-1 block text-xs font-semibold uppercase text-slate-600">Note (Optional)</label>
                <input
                  id="usage-note"
                  type="text"
                  placeholder={usageFeed.schedule ? 'e.g. Spilled, given to calves' : 'e.g. Morning feeding'}
                  value={usageForm.note}
                  onChange={(e) => setUsageForm({ ...usageForm, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              {usageForm.quantity && !usageFeed.schedule && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                  Feed cost: <span className="font-bold">{tk(parseFloat(usageForm.quantity) * usageFeed.unitPrice)}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setUsageFeed(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                  {loading ? 'Recording...' : 'Record Usage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedRow({
  item,
  onUse,
  onEdit,
  onDelete,
}: {
  item: FeedBatch;
  onUse: (b: FeedBatch) => void;
  onEdit: (b: FeedBatch) => void;
  onDelete: (b: FeedBatch) => void;
}) {
  const s = item.schedule;
  const total = item.quantity * item.unitPrice;
  const status = feedPayStatus(item);
  const due = item.supplierId ? Math.max(0, total - (item.paidAmount ?? 0)) : 0;
  const low = s ? s.remaining > 0 && s.daysLeft <= 1 : isLowStock(item);
  const finished = s ? s.remaining <= 0 : item.remainingQuantity <= 0;
  const pct = s ? Math.round((s.daysLeft / s.coverDays) * 100) : stockPercentage(item);

  return (
    <tr className={`transition hover:bg-slate-50/50 ${finished ? 'opacity-60' : ''}`}>
      <td className="whitespace-nowrap px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Wheat className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="text-[11px] text-slate-400">{fmtDate(item.purchasedAt ?? item.createdAt)}</p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        {item.supplier ? (
          <Link href={`/dashboard/suppliers/${item.supplier.id}`} className="font-medium text-slate-700 hover:text-slate-900 hover:underline">
            {item.supplier.name}
          </Link>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
        <span className="font-medium text-slate-900">{item.quantity.toLocaleString()} kg</span>
        <span className="block text-[11px] text-slate-400">at {tk(item.unitPrice)}/kg</span>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <p className="mb-1 font-bold text-slate-900">{tk(total)}</p>
        <PaymentStatusPill status={status} />
        {due > 0 && <span className="ml-1 text-[11px] font-semibold text-red-600">{tk(due)} due</span>}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        {s ? (
          <>
            <p className="font-semibold text-slate-900">{tk(s.perDayCost)}</p>
            <p className="text-[11px] text-slate-500">{s.perDayQty.toLocaleString()} kg/day</p>
          </>
        ) : (
          <span className="text-xs text-slate-400">Days not set</span>
        )}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <div className="w-28">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${low ? 'bg-red-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.max(0, Math.min(pct, 100))}%` }}
            />
          </div>
          {s ? (
            <p className={`mt-1 text-[11px] font-semibold ${low ? 'text-red-600' : finished ? 'text-slate-400' : 'text-slate-600'}`}>
              {finished
                ? `Finished ${fmtDate(s.runsOutOn)}`
                : s.daysLeft === 0
                  ? 'Last day today'
                  : `${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} left · to ${fmtDate(s.runsOutOn).replace(/ \d{4}$/, '')}`}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-400">{pct}% remaining</p>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">
        <div className="flex items-center gap-2">
          <span>{item.remainingQuantity.toLocaleString()} kg</span>
          {low && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <AlertTriangle className="h-3 w-3" /> {s ? 'Running low' : 'Low Stock'}
            </span>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onUse(item)}
            disabled={finished}
            className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-40"
            title={s ? 'Record extra use' : 'Record feed usage'}
          >
            <Droplets className="h-3.5 w-3.5" /> Use
          </button>
          <button onClick={() => onEdit(item)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label={`Edit ${item.name}`}>
            <Edit3 className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(item)} className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${item.name}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
