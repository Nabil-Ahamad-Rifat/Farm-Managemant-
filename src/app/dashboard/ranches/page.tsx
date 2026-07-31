"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Sprout } from 'lucide-react';

export default function RanchesPage() {
  const router = useRouter();
  const [ranchName, setRanchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateRanch(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/ranches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranchName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to create ranch');
      }

      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create ranch');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <Sprout className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create a New Ranch</h1>
          <p className="text-sm text-slate-500">Start a fresh ranch workspace and switch your account to it.</p>
        </div>
      </div>

      <form onSubmit={handleCreateRanch} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Ranch Name</label>
          <input
            value={ranchName}
            onChange={(e) => setRanchName(e.target.value)}
            placeholder="e.g. Sunrise Meadow Ranch"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-emerald-500"
            required
          />
        </div>

        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {loading ? 'Creating Ranch...' : 'Create Ranch'}
        </button>
      </form>
    </div>
  );
}
