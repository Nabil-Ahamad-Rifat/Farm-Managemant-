import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { collectedBetween, legacySaleFilter, listCustomersWithBalances } from '@/lib/receivables';
import { listFeed, listSuppliersWithBalances } from '@/lib/payables';
import { feedCostBetween } from '@/lib/feed-cost';
import { getDueSoon } from '@/lib/animals';
import DueSoonPanel from '@/components/animals/DueSoonPanel';
import { PaymentStatusPill, CustomerTypeBadge, tk } from '@/components/sales/shared';
import CollectButton from '@/components/sales/CollectButton';
import { Users, BadgeCheck, Wheat, DollarSign, ArrowRight, TrendingUp, PackageOpen, Banknote, HandCoins, Phone, Store, AlertTriangle } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { tenantId } = session;

  // Date helpers
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Feed days are UTC calendar days (see feedSchedule), so its month is too.
  const startOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    allEmployees,
    cowCount,
    activeCowsCount,
    feedBatches,
    totalCollected,
    totalSalesCount,
    recentSales,
    recentCows,
    monthlySalaryData,
    monthlyExpenses,
    monthlyOtherIncome,
    dailyPayments,
    dailyLegacySales,
    dailyOtherIncomeData,
    customers,
    suppliers,
    monthlyFeedCost,
    animalsDue,
  ] = await Promise.all([
    db.employee.findMany({ where: { tenantId } }),
    db.cow.count({ where: { tenantId } }),
    db.cow.count({ where: { tenantId, status: 'active' } }),
    // Stock left now: scheduled batches already have their daily use taken off
    listFeed(tenantId),
    // All money actually received from sales, ever
    collectedBetween(tenantId, new Date(0), now),
    db.sale.count({ where: { tenantId } }),
    db.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.cow.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Monthly salary payments
    db.salaryPayment
      ? db.salaryPayment.findMany({
          where: { employee: { tenantId }, paidAt: { gte: startOfMonth } },
          select: { amount: true },
        })
      : Promise.resolve([]),
    // Monthly other expenses
    db.otherExpense
      ? db.otherExpense.aggregate({
          where: { tenantId, expenseDate: { gte: startOfMonth } },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    // Monthly other income
    db.otherIncome
      ? db.otherIncome.aggregate({
          where: { tenantId, incomeDate: { gte: startOfMonth } },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    // Money received per day for the 30-day mini chart: customer payments...
    db.payment.findMany({
      where: { tenantId, paidAt: { gte: thirtyDaysAgo } },
      select: { amount: true, paidAt: true },
    }),
    // ...plus legacy (customer-less) sales marked paid
    db.sale.findMany({
      where: { tenantId, status: 'paid', createdAt: { gte: thirtyDaysAgo }, ...legacySaleFilter },
      select: { amount: true, createdAt: true },
    }),
    // Daily other income for 30-day mini chart
    db.otherIncome.findMany({
      where: { tenantId, incomeDate: { gte: thirtyDaysAgo } },
      select: { amount: true, incomeDate: true },
      orderBy: { incomeDate: 'asc' },
    }),
    listCustomersWithBalances(tenantId),
    listSuppliersWithBalances(tenantId),
    // Purchases spread over their days, plus usage of older batches, this month so far
    feedCostBetween(tenantId, startOfMonthUTC, now),
    // Vaccines, calvings and pregnancy checks coming up
    getDueSoon(tenantId, now),
  ]);

  const employeeCount = allEmployees.length;
  const activeEmployeeCount = allEmployees.filter(e => e.status !== 'terminated').length;

  const totalRemainingFeed = feedBatches.reduce((acc, f) => acc + f.remainingQuantity, 0);
  const totalFeedValue = feedBatches.reduce((acc, f) => acc + f.remainingQuantity * f.unitPrice, 0);
  const totalOtherIncome = monthlyOtherIncome._sum.amount ?? 0;
  const totalRevenue = totalCollected + totalOtherIncome;
  const owing = customers.filter((c) => c.totalDue > 0);
  const totalDue = owing.reduce((sum, c) => sum + c.totalDue, 0);
  const monthlySalaryCost = monthlySalaryData.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
  const monthlyOtherCost = monthlyExpenses._sum.amount ?? 0;
  const owedSuppliers = suppliers.filter((s) => s.totalDue > 0);
  const totalPayable = owedSuppliers.reduce((sum, s) => sum + s.totalDue, 0);
  const feedRunningOut = feedBatches.filter((b) => b.schedule && b.schedule.remaining > 0 && b.schedule.daysLeft <= 1);

  // Build 30-day chart data
  const chartDays: { date: string; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const daySalesRevenue =
      dailyPayments
        .filter(p => new Date(p.paidAt).toISOString().slice(0, 10) === dateStr)
        .reduce((sum, p) => sum + p.amount, 0) +
      dailyLegacySales
        .filter(s => new Date(s.createdAt).toISOString().slice(0, 10) === dateStr)
        .reduce((sum, s) => sum + s.amount, 0);
    const dayOtherIncomeRevenue = dailyOtherIncomeData
      .filter(s => new Date(s.incomeDate).toISOString().slice(0, 10) === dateStr)
      .reduce((sum, s) => sum + s.amount, 0);
    chartDays.push({ date: dateStr, revenue: daySalesRevenue + dayOtherIncomeRevenue });
  }
  const maxRevenue = Math.max(...chartDays.map(d => d.revenue), 1);

  const cards = [
    {
      label: 'Animals',
      value: cowCount.toString(),
      subtext: `${activeCowsCount} active in herd`,
      href: '/dashboard/cows',
      icon: BadgeCheck,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      label: 'Active Employees',
      value: activeEmployeeCount.toString(),
      subtext: `${employeeCount} total staff`,
      href: '/dashboard/employees',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      label: 'Feed Stock',
      value: `${totalRemainingFeed.toLocaleString()} kg`,
      subtext: `৳${totalFeedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} stock value`,
      href: '/dashboard/feed',
      icon: Wheat,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      label: 'Total Revenue',
      value: `৳${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtext: `Received from ${totalSalesCount} sale${totalSalesCount === 1 ? "" : "s"} + other income`,
      href: '/dashboard/revenue',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Farm Overview</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">Live operational metrics and management summaries for your farm.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-slate-300 sm:p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">{card.label}</span>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border sm:h-9 sm:w-9 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{card.value}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.subtext}</p>
              </div>
              <div className="mt-4 hidden items-center gap-1 sm:flex text-xs font-semibold text-emerald-600 transition group-hover:translate-x-0.5">
                Manage section <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {feedRunningOut.length > 0 && (
        <Link
          href="/dashboard/feed"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 transition hover:bg-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">Feed running out:</span>{' '}
            {feedRunningOut.map((b) => `${b.name} (${b.schedule!.remaining.toLocaleString()} kg left)`).join(', ')}. Buy more soon →
          </span>
        </Link>
      )}

      {animalsDue.length > 0 && <DueSoonPanel items={animalsDue} />}

      <div className="grid gap-6 xl:grid-cols-2">
      {/* Who owes me */}
      <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Who owes me</h2>
              <p className="text-xs text-slate-500">
                {owing.length === 0 ? 'Nobody owes you right now.' : `${owing.length} customer${owing.length === 1 ? '' : 's'} with unpaid sales`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">Total due</p>
              <p className="text-2xl font-extrabold text-slate-900">{tk(totalDue)}</p>
            </div>
            <Link href="/dashboard/customers" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
              All customers <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {owing.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100">
            {owing.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-slate-50">
                <Link href={`/dashboard/customers/${c.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
                      <CustomerTypeBadge type={c.type} />
                    </div>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      {c.phone ? <><Phone className="h-3 w-3" /> {c.phone} · </> : null}
                      Bought {tk(c.totalSold)} · paid {tk(c.totalPaid)}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-bold text-red-600">{tk(c.totalDue)}</p>
                </Link>
                <CollectButton party={{ id: c.id, name: c.name, totalDue: c.totalDue }} />
              </li>
            ))}
          </ul>
        )}
        {owing.length > 6 && (
          <Link href="/dashboard/customers" className="mt-2 block text-center text-xs font-semibold text-slate-500 hover:text-slate-900">
            + {owing.length - 6} more
          </Link>
        )}
      </div>

      {/* Who I owe */}
      <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Who I owe</h2>
              <p className="text-xs text-slate-500">
                {owedSuppliers.length === 0
                  ? 'You owe no suppliers right now.'
                  : `${owedSuppliers.length} supplier${owedSuppliers.length === 1 ? '' : 's'} with unpaid feed`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total owed</p>
              <p className="text-2xl font-extrabold text-slate-900">{tk(totalPayable)}</p>
            </div>
            <Link href="/dashboard/suppliers" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
              All suppliers <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {owedSuppliers.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100">
            {owedSuppliers.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-slate-50">
                <Link href={`/dashboard/suppliers/${s.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      {s.phone ? <><Phone className="h-3 w-3" /> {s.phone} · </> : null}
                      Bought {tk(s.totalBought)} · paid {tk(s.totalPaid)}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-bold text-red-600">{tk(s.totalDue)}</p>
                </Link>
                <CollectButton mode="pay" party={{ id: s.id, name: s.name, totalDue: s.totalDue }} />
              </li>
            ))}
          </ul>
        )}
        {owedSuppliers.length > 6 && (
          <Link href="/dashboard/suppliers" className="mt-2 block text-center text-xs font-semibold text-slate-500 hover:text-slate-900">
            + {owedSuppliers.length - 6} more
          </Link>
        )}
      </div>
      </div>

      {/* Monthly Cost Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Monthly Labour</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900">৳{monthlySalaryCost.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
          <Link href="/dashboard/employees" className="text-[11px] text-indigo-600 hover:underline">View employees →</Link>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Feed Cost (This Month)</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Wheat className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900">৳{monthlyFeedCost.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
          <Link href="/dashboard/feed" className="text-[11px] text-amber-600 hover:underline">View feed →</Link>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700">Other Expenses</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <PackageOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900">৳{monthlyOtherCost.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
          <Link href="/dashboard/expenses" className="text-[11px] text-red-600 hover:underline">View expenses →</Link>
        </div>
      </div>

      {/* 30-day Revenue Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">30-Day Revenue Trend</h2>
            <p className="text-xs text-slate-500">Money received per day over the last 30 days</p>
          </div>
          <Link href="/dashboard/revenue" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition">
            <TrendingUp className="h-3.5 w-3.5" /> Revenue Portal
          </Link>
        </div>
        <div className="flex items-end gap-1 h-24">
          {chartDays.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-emerald-400/70 hover:bg-emerald-500 transition-colors cursor-default"
              style={{ height: `${Math.max((d.revenue / maxRevenue) * 88, d.revenue > 0 ? 4 : 1)}px` }}
              title={`${d.date}: ৳${d.revenue.toLocaleString()}`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          <span>{chartDays[0]?.date.slice(5)}</span>
          <span>{chartDays[chartDays.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Bottom two panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Sales</h2>
              <p className="text-xs text-slate-500">Latest revenue transactions recorded</p>
            </div>
            <Link href="/dashboard/sales" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">View all</Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No sales transactions recorded yet.</p>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{sale.customerName}</p>
                    <p className="text-xs text-slate-500">{new Date(sale.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-sm font-bold text-slate-900">{tk(sale.amount)}</p>
                    <PaymentStatusPill status={sale.customerId ? sale.status : sale.status === 'paid' ? 'paid' : 'pending'} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Added Herd */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recently Added Livestock</h2>
              <p className="text-xs text-slate-500">Latest cows registered in herd</p>
            </div>
            <Link href="/dashboard/cows" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">View all</Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {recentCows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No cows registered in herd yet.</p>
            ) : (
              recentCows.map((cow) => (
                <Link key={cow.id} href={`/dashboard/cows/${cow.id}`} className="flex items-center justify-between rounded-lg px-2 py-3 transition hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{cow.name} <span className="text-xs font-normal text-slate-500">({cow.tagNumber})</span></p>
                    <p className="text-xs text-slate-500">{cow.breed || 'Breed unspecified'}</p>
                  </div>
                  <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    cow.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    cow.status === 'sold' ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {cow.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
