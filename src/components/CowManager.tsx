"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Edit3, BadgeCheck, X, DollarSign } from 'lucide-react';

interface Cow {
  id: string;
  tagNumber: string;
  name: string;
  breed: string | null;
  purchasePrice: number | null;
  status: string;
  createdAt: Date | string;
}

export default function CowManager({ initialCows }: { initialCows: Cow[] }) {
  const router = useRouter();
  const [cows, setCows] = useState<Cow[]>(initialCows);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCow, setEditingCow] = useState<Cow | null>(null);
  const [form, setForm] = useState({
    tagNumber: '',
    name: '',
    breed: '',
    purchasePrice: '',
    status: 'active',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function openCreateModal() {
    setEditingCow(null);
    setForm({ tagNumber: '', name: '', breed: '', purchasePrice: '', status: 'active' });
    setError('');
    setIsModalOpen(true);
  }

  function openEditModal(cow: Cow) {
    setEditingCow(cow);
    setForm({
      tagNumber: cow.tagNumber,
      name: cow.name,
      breed: cow.breed || '',
      purchasePrice: cow.purchasePrice !== null ? cow.purchasePrice.toString() : '',
      status: cow.status,
    });
    setError('');
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = editingCow ? `/api/cows/${editingCow.id}` : '/api/cows';
    const method = editingCow ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save cow details');
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this cow from the herd record?')) return;

    try {
      const res = await fetch(`/api/cows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCows((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      }
    } catch (err) {
      alert('Failed to delete cow record.');
    }
  }

  const filteredCows = initialCows.filter((cow) => {
    const matchesSearch =
      cow.tagNumber.toLowerCase().includes(search.toLowerCase()) ||
      cow.name.toLowerCase().includes(search.toLowerCase()) ||
      (cow.breed && cow.breed.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || cow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Herd Management (Cows)</h1>
          <p className="mt-1 text-slate-500">Track cattle inventory, breeds, health status, and valuations.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          Add Cow
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tag #, name, or breed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'active', 'sold', 'sick'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tag #</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Breed</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Price</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredCows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                  No cattle records found.
                </td>
              </tr>
            ) : (
              filteredCows.map((cow) => (
                <tr key={cow.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                    <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-800 border border-slate-200">
                      {cow.tagNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{cow.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{cow.breed || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                    {cow.purchasePrice !== null ? `$${cow.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-block text-xs font-semibold uppercase px-2.5 py-1 rounded-full ${
                      cow.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      cow.status === 'sold' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {cow.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(cow)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        title="Edit cow"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cow.id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                        title="Delete cow"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingCow ? 'Edit Cattle Record' : 'Register New Cow'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
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
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Tag Number (Unique Identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. COW-101"
                  value={form.tagNumber}
                  onChange={(e) => setForm({ ...form, tagNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Cow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bella"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Breed</label>
                <input
                  type="text"
                  placeholder="e.g. Holstein Friesian, Angus"
                  value={form.breed}
                  onChange={(e) => setForm({ ...form, breed: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Purchase Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1200.00"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Health & Inventory Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  <option value="active">Active (In Herd)</option>
                  <option value="sold">Sold</option>
                  <option value="sick">Sick / Under Treatment</option>
                </select>
              </div>

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
                  {loading ? 'Saving...' : 'Save Cow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
