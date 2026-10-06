import Link from 'next/link';
import { Home, Users, BadgeCheck, Wheat, DollarSign, Sprout, TrendingUp, PackageOpen, Coins, Settings, HandCoins, Store, CalendarRange } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import LogoutButton from '@/components/LogoutButton';

const links = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/cows', label: 'Cows (Herd)', icon: BadgeCheck },
  { href: '/dashboard/feed', label: 'Feed Inventory', icon: Wheat },
  { href: '/dashboard/suppliers', label: 'Suppliers & Payables', icon: Store },
  { href: '/dashboard/sales', label: 'Sales', icon: DollarSign },
  { href: '/dashboard/customers', label: 'Customers & Dues', icon: HandCoins },
  { href: '/dashboard/reports', label: 'Monthly Report', icon: CalendarRange },
  { href: '/dashboard/income', label: 'Other Income', icon: Coins },
  { href: '/dashboard/revenue', label: 'Revenue Portal', icon: TrendingUp },
  { href: '/dashboard/expenses', label: 'Other Expenses', icon: PackageOpen },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let tenantName = 'Farm Manager';
  let userName = 'User';
  let userEmail = '';

  if (session) {
    userName = session.name;
    userEmail = session.email;
    const tenant = await db.tenant.findUnique({ where: { id: session.tenantId } });
    if (tenant) {
      tenantName = tenant.name;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="flex min-h-screen">
        <aside className="w-64 flex flex-col justify-between border-r border-slate-200/80 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight text-slate-900">{tenantName}</h2>
                <span className="inline-block text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">Active Tenant</span>
              </div>
            </div>

            <nav className="mt-8 space-y-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-slate-900">{userName}</p>
                <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
