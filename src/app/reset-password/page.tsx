"use client";

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sprout, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-8 text-center">
        <p className="text-red-400 text-sm">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-emerald-400 hover:underline text-sm font-semibold">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <>
      {success ? (
        <div className="mt-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">Password updated!</h1>
          <p className="mt-2 text-sm text-slate-400">Redirecting you to sign in...</p>
        </div>
      ) : (
        <>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Set a new password</h1>
          <p className="mt-1 text-sm text-slate-400">Choose a strong password for your farm account.</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Confirm Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                required
                placeholder="Repeat your new password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className={`w-full rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${
                  form.confirmPassword && form.confirmPassword !== form.newPassword
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
                    : 'border-white/10 focus:border-emerald-500 focus:ring-emerald-500'
                }`}
              />
              {form.confirmPassword && form.confirmPassword !== form.newPassword && (
                <p className="mt-1 text-[11px] text-red-400">Passwords don&apos;t match</p>
              )}
            </div>

            {/* Password strength indicator */}
            {form.newPassword && (
              <div>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        form.newPassword.length >= i * 3
                          ? form.newPassword.length < 8
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {form.newPassword.length < 8
                    ? `${8 - form.newPassword.length} more character${8 - form.newPassword.length !== 1 ? 's' : ''} needed`
                    : '✓ Strong enough'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || form.newPassword !== form.confirmPassword || form.newPassword.length < 8}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:opacity-50 mt-2"
            >
              {loading ? 'Updating...' : 'Update Password'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">Farm Manager</span>
        </div>
        <Suspense fallback={<div className="mt-8 text-slate-400 text-sm">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
