import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-3xl rounded-2xl border border-white/10 bg-white/10 p-10 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Farm Management SaaS</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Manage your farm operations without the chaos.</h1>
        <p className="mt-6 text-lg text-slate-300">Track employees, cows, feed, sales, and performance from a single dashboard.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/dashboard" className="rounded-lg bg-white px-5 py-3 font-medium text-slate-950">Open Dashboard</Link>
          <Link href="/register" className="rounded-lg border border-white/20 px-5 py-3 font-medium text-white">Create Account</Link>
        </div>
      </div>
    </main>
  );
}
