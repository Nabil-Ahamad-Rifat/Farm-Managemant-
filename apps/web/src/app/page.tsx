import Link from 'next/link';
import { Sprout, Users, BadgeCheck, Wheat, DollarSign, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Farm Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition">
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 mb-6">
          <ShieldCheck className="h-4 w-4" /> Multi-Tenant Farm Operations Platform
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Streamline your farm operations <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            without the chaos.
          </span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Monitor your workforce, cattle herd inventory, feed consumption, and sales revenue from one intuitive workspace.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
          >
            Launch Dashboard <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition"
          >
            Create Farm Account
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 mb-4">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Workforce Management</h3>
            <p className="mt-2 text-xs text-slate-400">Track employees, assign farm roles, contact info, and operational duties.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-4">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Livestock & Herd</h3>
            <p className="mt-2 text-xs text-slate-400">Record cattle tags, breeds, purchase valuations, and active/sold/sick statuses.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-4">
              <Wheat className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Feed Inventory</h3>
            <p className="mt-2 text-xs text-slate-400">Manage grain stock, unit pricing, remaining quantities, and low stock alerts.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4">
              <DollarSign className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Sales & Revenue</h3>
            <p className="mt-2 text-xs text-slate-400">Log customer orders, link individual livestock sales, and track paid/pending status.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
