"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Edit3, Wheat, AlertTriangle, X, BarChart2, Droplets } from 'lucide-react';

interface FeedBatch {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  remainingQuantity: number;
  createdAt: Date | string;
}

const PRESET_FEED_NAMES = ['Bushi', 'Butta', 'Gom', 'Chaw', 'Khud', 'Soyabin', 'Khoil', 'Dhan', 'Kaher', 'Atta'];

export default function FeedManager({ initialFeed }: { initialFeed: FeedBatch[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<FeedBatch | null>(null);
  const [usageFeed, setUsageFeed] = useState<FeedBatch | null>(null);
  const [form, setForm] = useState({
    name: '',
    quantity: '',
    unitPrice: '',
    remainingQuantity: '',
  });
  const [usageForm, setUsageForm] = useState({ quantity: '', note: '' });
  const [error, setError] = useState('');
  const [usageError, setUsageError] = useState('');
  const [loading, setLoading] = useState(false);

  function openCreateModal() {
    setEditingFeed(null);
    setForm({ name: '', quantity: '', unitPrice: '', remainingQuantity: '' });
    setError('');
    setIsModalOpen(true);
  }

  function openEditModal(feed: FeedBatch) {
    setEditingFeed(feed);
    setForm({
      name: feed.name,
      quantity: feed.quantity.toString(),
      unitPrice: feed.unitPrice.toString(),
      remainingQuantity: feed.remainingQuantity.toString(),
    });
    setError('');
    setIsModalOpen(true);
  }

  function openUsageModal(feed: FeedBatch) {
    setUsageFeed(feed);
    setUsageForm({ quantity: '', note: '' });
    setUsageError('');
    setIsUsageModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = editingFeed ? `/api/feed/${editingFeed.id}` : '/api/feed';
    const method = editingFeed ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save feed batch');
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUsageSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usageFeed) return;
    setLoading(true);
    setUsageError('');

    try {
      const res = await fetch('/api/feed/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedBatchId: usageFeed.id, ...usageForm }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record usage');
      }

      setIsUsageModalOpen(false);
      router.refresh();
    } catch (err) {
      setUsageError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this feed batch record?')) return;

    try {
      const res = await fetch(`/api/feed/${id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } catch {
      alert('Failed to delete feed batch.');
    }
  }

  const filteredFeed = initialFeed.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalFeedValue = filteredFeed.reduce((sum, f) => sum + f.remainingQuantity * f.unitPrice, 0);
  const totalFeedCost = initialFeed.reduce((sum, f) => sum + f.quantity * f.unitPrice, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Feed Inventory</h1>
          <p className="mt-1 text-slate-500">Track feed batches (Bushi, Butta, Gom, Chaw, Khud), stock levels, and costs.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          Add Feed Batch
        </button>
      </div>

      {/* Feed Cost Summary Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Total Feed Investment</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              ৳{totalFeedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-700 mt-1">{initialFeed.length} batches purchased</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/20">
            <Wheat className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl border border-green-100 bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-green-800">Current Stock Value</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              ৳{totalFeedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-green-700 mt-1">Remaining inventory</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md shadow-green-600/20">
            <BarChart2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Quick Preset Tags */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center font-medium">Quick filter:</span>
        {PRESET_FEED_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => setSearch(search === name ? '' : name)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
              search === name
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search feed batches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Feed Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Initial Qty (kg)</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Unit Price (৳/kg)</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Remaining (kg)</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Stock Value</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredFeed.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                  No feed batches recorded.
                </td>
              </tr>
            ) : (
              filteredFeed.map((item) => {
                const isLowStock = item.remainingQuantity < item.quantity * 0.2;
                const stockPct = Math.round((item.remainingQuantity / item.quantity) * 100);
                const totalValue = item.remainingQuantity * item.unitPrice;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                          <Wheat className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                          <div className="mt-1 w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isLowStock ? 'bg-red-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(stockPct, 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">{stockPct}% remaining</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{item.quantity.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">৳{item.unitPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{item.remainingQuantity.toLocaleString()}</span>
                        {isLowStock && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                      ৳{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openUsageModal(item)}
                          className="rounded-lg px-2 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1"
                          title="Record feed usage"
                        >
                          <Droplets className="h-3.5 w-3.5" /> Use
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          title="Edit feed batch"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                          title="Delete feed batch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Feed Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingFeed ? 'Edit Feed Batch' : 'Add New Feed Batch'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Feed / Grain Name</label>
                <input
                  type="text"
                  required
                  list="feed-presets"
                  placeholder="e.g. Bushi, Butta, Gom, Chaw, Khud..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
                <datalist id="feed-presets">
                  {PRESET_FEED_NAMES.map(n => <option key={n} value={n} />)}
                </datalist>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESET_FEED_NAMES.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm({ ...form, name: n })}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition ${
                        form.name === n
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Total Quantity (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 500"
                  value={form.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({
                      ...form,
                      quantity: val,
                      remainingQuantity: editingFeed ? form.remainingQuantity : val,
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Unit Price (৳ per kg)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 35.00"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Remaining Quantity (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Defaults to initial quantity"
                  value={form.remainingQuantity}
                  onChange={(e) => setForm({ ...form, remainingQuantity: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              {form.quantity && form.unitPrice && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                  Total batch cost: <span className="font-bold">৳{(parseFloat(form.quantity) * parseFloat(form.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Feed Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feed Usage Modal */}
      {isUsageModalOpen && usageFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Record Feed Usage</h2>
                <p className="text-xs text-slate-500 mt-0.5">{usageFeed.name}</p>
              </div>
              <button onClick={() => setIsUsageModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
              Available stock: <span className="font-bold">{usageFeed.remainingQuantity.toLocaleString()} kg</span>
            </div>

            {usageError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-100">
                {usageError}
              </div>
            )}

            <form onSubmit={handleUsageSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Quantity Used (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={usageFeed.remainingQuantity}
                  required
                  placeholder="e.g. 50"
                  value={usageForm.quantity}
                  onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Morning feeding"
                  value={usageForm.note}
                  onChange={(e) => setUsageForm({ ...usageForm, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              {usageForm.quantity && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
                  Feed cost: <span className="font-bold">৳{(parseFloat(usageForm.quantity) * usageFeed.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsUsageModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                  {loading ? 'Recording...' : 'Record Usage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
