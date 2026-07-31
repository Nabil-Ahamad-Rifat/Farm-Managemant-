import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { Users, BadgeCheck, Wheat, DollarSign, ArrowRight, TrendingUp, PackageOpen, Banknote } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { tenantId } = session;

  // Date helpers
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    allEmployees,
    cowCount,
    activeCowsCount,
    feedBatches,
    salesData,
    recentSales,
    recentCows,
    monthlySalaryData,
    monthlyExpenses,
    dailySalesData,
  ] = await Promise.all([
    db.employee.findMany({ where: { tenantId } }),
    db.cow.count({ where: { tenantId } }),
    db.cow.count({ where: { tenantId, status: 'active' } }),
    db.feedBatch.findMany({ where: { tenantId } }),
    db.sale.aggregate({
      where: { tenantId, status: 'paid' },
      _sum: { amount: true },
      _count: { id: true },
    }),
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
    (db as any).salaryPayment
      ? (db as any).salaryPayment.findMany({
          where: { employee: { tenantId }, paidAt: { gte: startOfMonth } },
          select: { amount: true },
        })
      : Promise.resolve([]),
    // Monthly other expenses
    (db as any).otherExpense
      ? (db as any).otherExpense.aggregate({
          where: { tenantId, expenseDate: { gte: startOfMonth } },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    // Daily sales for 30-day mini chart
    db.sale.findMany({
      where: { tenantId, status: 'paid', createdAt: { gte: thirtyDaysAgo } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const employeeCount = allEmployees.length;
  const activeEmployeeCount = allEmployees.filter(e => (e as any).status !== 'terminated').length;

  const totalRemainingFeed = feedBatches.reduce((acc, f) => acc + f.remainingQuantity, 0);
  const totalFeedValue = feedBatches.reduce((acc, f) => acc + f.remainingQuantity * f.unitPrice, 0);
  const totalSalesRevenue = salesData._sum.amount ?? 0;
  const totalSalesCount = salesData._count.id;
  const monthlySalaryCost = (monthlySalaryData as any[]).reduce((sum: number, p: any) => sum + p.amount, 0);
  const monthlyOtherCost = monthlyExpenses._sum.amount ?? 0;
  const monthlyFeedCost = feedBatches.reduce((acc, f) => acc + (f.quantity - f.remainingQuantity) * f.unitPrice, 0);

  // Build 30-day chart data
  const chartDays: { date: string; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayRevenue = dailySalesData
      .filter(s => new Date(s.createdAt).toISOString().slice(0, 10) === dateStr)
      .reduce((sum, s) => sum + s.amount, 0);
    chartDays.push({ date: dateStr, revenue: dayRevenue });
  }
  const maxRevenue = Math.max(...chartDays.map(d => d.revenue), 1);

  const cards = [
    {
      label: 'Total Herd (Cows)',
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
      value: `৳${totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtext: `${totalSalesCount} completed sales`,
      href: '/dashboard/sales',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Farm Overview</h1>
        <p className="mt-1 text-slate-500">Live operational metrics and management summaries for your farm.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.subtext}</p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 transition group-hover:translate-x-0.5">
                Manage section <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
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
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Feed Cost (Used)</p>
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
            <p className="text-xs text-slate-500">Daily sales revenue over the last 30 days</p>
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
                    <p className="text-sm font-bold text-slate-900">৳{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      sale.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {sale.status}
                    </span>
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
                <div key={cow.id} className="flex items-center justify-between py-3">
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
