import Link from 'next/link';
import { ChevronLeft, ChevronRight, Milk, ShoppingBag, Wallet, History, AlertCircle } from 'lucide-react';
import { monthKey, shiftMonth, type MonthStatement } from '@farm/business-logic';
import type { ReportLine } from '@/lib/monthly-report';
import CollectButton from '@/components/sales/CollectButton';
import { SummaryCard, CustomerTypeBadge, tk, monthLabel } from '@/components/sales/shared';

const litres = (n: number) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;

/** A balance: due in red, advance in green, or "Clear". */
function Balance({ value, strong }: { value: number; strong?: boolean }) {
  if (value > 0) return <span className={`${strong ? 'font-bold' : 'font-semibold'} text-red-600`}>{tk(value)}</span>;
  if (value < 0) return <span className="font-semibold text-emerald-700">Advance {tk(-value)}</span>;
  return <span className="font-semibold text-slate-400">Clear</span>;
}

export default function MonthlyReport({
  month,
  totals,
  lines,
}: {
  month: string;
  totals: MonthStatement['totals'];
  lines: ReportLine[];
}) {
  const current = monthKey(new Date());
  const navBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50';
  const owing = lines.filter((l) => l.closing > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Monthly Report</h1>
          <p className="mt-1 text-slate-500">Milk sold, money received and what is still due, month by month.</p>
        </div>
        <nav aria-label="Choose month" className="flex items-center gap-2">
          <Link href={`/dashboard/reports?month=${shiftMonth(month, -1)}`} className={navBtn} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <p className="min-w-40 text-center text-lg font-bold text-slate-900" aria-live="polite">{monthLabel(month)}</p>
          {month < current ? (
            <Link href={`/dashboard/reports?month=${shiftMonth(month, 1)}`} className={navBtn} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className={`${navBtn} cursor-not-allowed opacity-40`} aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
          {month !== current && (
            <Link href="/dashboard/reports" className="ml-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              This month
            </Link>
          )}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Milk sold" value={litres(totals.milkLitres)} Icon={Milk} tone="slate" />
        <SummaryCard label="Total sales" value={tk(totals.sold)} Icon={ShoppingBag} tone="slate" hint="All products" />
        <SummaryCard label="Money received" value={tk(totals.collected)} Icon={Wallet} tone="emerald" />
        <SummaryCard label="Due from before" value={tk(totals.carriedIn)} Icon={History} tone="slate" hint="Carried into this month" />
        <SummaryCard
          label="Due at month end"
          value={tk(totals.dueAtEnd)}
          Icon={AlertCircle}
          tone="red"
          hint={owing ? `${owing} customer${owing === 1 ? '' : 's'} still owe` : 'Nothing owed'}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Customer', 'Milk', 'Sold', 'Paid', 'Due from before', 'Due at month end'].map((h) => (
                <th key={h} className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
              <th className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-slate-500">No sales, payments or dues in {monthLabel(month)}.</td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.partyId ?? 'none'} className={l.closing > 0 ? 'bg-red-50/40' : ''}>
                  <td className="whitespace-nowrap px-5 py-4">
                    {l.customer ? (
                      <Link href={`/dashboard/customers/${l.customer.id}#m-${month}`} className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 hover:underline">{l.customer.name}</span>
                        <CustomerTypeBadge type={l.customer.type} />
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">No customer (older sales)</span>
                    )}
                    <p className="text-[11px] text-slate-400">
                      {l.salesCount} sale{l.salesCount === 1 ? '' : 's'} · {l.paymentsCount} payment{l.paymentsCount === 1 ? '' : 's'}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">{l.milkLitres ? litres(l.milkLitres) : '—'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-900">{tk(l.sold)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-emerald-700">{tk(l.paid)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm"><Balance value={l.carriedIn} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm"><Balance value={l.closing} strong /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    {l.customer && l.closing > 0 && month === current && (
                      <CollectButton party={{ id: l.customer.id, name: l.customer.name, totalDue: l.closing }} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot className="bg-slate-50">
              <tr className="text-sm font-bold text-slate-900">
                <td className="px-5 py-3.5">Total</td>
                <td className="whitespace-nowrap px-5 py-3.5">{litres(totals.milkLitres)}</td>
                <td className="whitespace-nowrap px-5 py-3.5">{tk(totals.sold)}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-emerald-700">{tk(totals.collected)}</td>
                <td className="whitespace-nowrap px-5 py-3.5">{tk(totals.carriedIn)}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-red-600">{tk(totals.dueAtEnd)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Due at month end = due from before + sold − paid. &ldquo;Paid&rdquo; is money received during the month, whichever sale it was for.
      </p>
    </div>
  );
}
