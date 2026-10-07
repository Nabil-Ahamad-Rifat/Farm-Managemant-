"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Users, PawPrint, Wheat, DollarSign, Sprout, TrendingUp, PackageOpen, Coins, Settings, HandCoins, Store, CalendarRange, History, Menu, X,
  type LucideIcon,
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

type NavLink = { href: string; label: string; icon: LucideIcon };

const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Farm',
    links: [
      { href: '/dashboard', label: 'Overview', icon: Home },
      { href: '/dashboard/cows', label: 'Animals', icon: PawPrint },
      { href: '/dashboard/feed', label: 'Feed', icon: Wheat },
      { href: '/dashboard/employees', label: 'Workers', icon: Users },
    ],
  },
  {
    title: 'Selling',
    links: [
      { href: '/dashboard/sales', label: 'Sales', icon: DollarSign },
      { href: '/dashboard/customers', label: 'Customers & Dues', icon: HandCoins },
      { href: '/dashboard/income', label: 'Other Income', icon: Coins },
    ],
  },
  {
    title: 'Spending',
    links: [
      { href: '/dashboard/suppliers', label: 'Suppliers & Payables', icon: Store },
      { href: '/dashboard/expenses', label: 'Other Expenses', icon: PackageOpen },
    ],
  },
  {
    title: 'Reports',
    links: [
      { href: '/dashboard/history', label: 'History', icon: History },
      { href: '/dashboard/reports', label: 'Monthly Report', icon: CalendarRange },
      { href: '/dashboard/revenue', label: 'Revenue Portal', icon: TrendingUp },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
];

/** The phone bottom bar: the four things used every day, plus the full menu. */
const TABS: NavLink[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/cows', label: 'Animals', icon: PawPrint },
  { href: '/dashboard/sales', label: 'Sales', icon: DollarSign },
  { href: '/dashboard/customers', label: 'Dues', icon: HandCoins },
];

const isActive = (pathname: string, href: string) =>
  href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(href + '/');

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-5" aria-label="Main">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.title}</p>
          <div className="space-y-0.5">
            {g.links.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${active ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function FarmBadge({ tenantName }: { tenantName: string }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
        <Sprout className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="truncate text-base font-bold leading-tight text-slate-900">{tenantName}</p>
    </Link>
  );
}

function UserBox({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
          <p className="truncate text-xs text-slate-500">{userEmail}</p>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}

/**
 * App frame: a fixed sidebar on large screens; on phones and tablets a top bar,
 * a bottom tab bar for daily tasks and a slide-out menu with everything else.
 */
export default function DashboardShell({
  tenantName,
  userName,
  userEmail,
  children,
}: {
  tenantName: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the menu with Escape, and stop the page behind it from scrolling.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Large screens: sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between overflow-y-auto border-r border-slate-200/80 bg-white p-5 lg:flex">
        <div className="space-y-7">
          <FarmBadge tenantName={tenantName} />
          <NavList pathname={pathname} />
        </div>
        <UserBox userName={userName} userEmail={userEmail} />
      </aside>

      {/* Phones and tablets: top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:hidden">
        <FarmBadge tenantName={tenantName} />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Slide-out menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-xs flex-col justify-between overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-slate-900">Menu</p>
                <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <NavList pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="pt-6">
              <UserBox userName={userName} userEmail={userEmail} />
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 pb-28 pt-5 sm:px-6 lg:ml-64 lg:p-8">{children}</main>

      {/* Phones and tablets: bottom tabs */}
      <nav
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? 'text-emerald-700' : 'text-slate-500'}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-500"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}
