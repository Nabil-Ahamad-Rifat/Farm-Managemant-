import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { Users, BadgeCheck, Wheat, DollarSign, ArrowRight, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { tenantId } = session;

  const [employeeCount, cowCount, activeCowsCount, feedBatches, salesData, recentSales, recentCows] = await Promise.all([
    db.employee.count({ where: { tenantId } }),
    db.cow.count({ where: { tenantId } }),
    db.cow.count({ where: { tenantId, status: 'active' } }),
    db.feedBatch.findMany({ where: { tenantId } }),
    db.sale.aggregate({
      where: { tenantId },
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
  ]);

  const totalRemainingFeed = feedBatches.reduce((acc, f) => acc + f.remainingQuantity, 0);
  const totalSalesRevenue = salesData._sum.amount ?? 0;
  const totalSalesCount = salesData._count.id;

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
      label: 'Total Employees',
      value: employeeCount.toString(),
      subtext: 'Assigned farm team',
      href: '/dashboard/employees',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      label: 'Feed Stock',
      value: `${totalRemainingFeed.toLocaleString()} kg`,
      subtext: `${feedBatches.length} active feed batches`,
      href: '/dashboard/feed',
      icon: Wheat,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      label: 'Total Revenue',
      value: `$${totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sales Activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Sales</h2>
              <p className="text-xs text-slate-500">Latest revenue transactions recorded</p>
            </div>
            <Link href="/dashboard/sales" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              View all
            </Link>
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
                    <p className="text-sm font-bold text-slate-900">${sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
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
            <Link href="/dashboard/cows" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              View all
            </Link>
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
