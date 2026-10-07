"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit3, X, Coins, TrendingUp, CalendarDays, Search } from 'lucide-react';
import type { OtherIncome } from '@farm/shared-types';
import { webApiClient } from '@farm/api-client';
import { LIST_PERIODS, inListPeriod, farmToday, type ListPeriod, sumAmounts, formatCurrency as fmt } from '@farm/business-logic';

const CATEGORIES = [
  { value: 'subsidy', label: 'Government Subsidy' },
  { value: 'grant', label: 'Grant / Aid' },
  { value: 'insurance', label: 'Insurance Payout' },
  { value: 'donation', label: 'Donation' },
  { value: 'rental', label: 'Land / Equipment Rental' },
  { value: 'refund', label: 'Refund' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  subsidy: 'bg-blue-50 text-blue-700 border-blue-200',
  grant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  insurance: 'bg-violet-50 text-violet-700 border-violet-200',
  donation: 'bg-rose-50 text-rose-700 border-rose-200',
  rental: 'bg-amber-50 text-amber-700 border-amber-200',
  refund: 'bg-orange-50 text-orange-700 border-orange-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function OtherIncomeManager({ initialIncomes }: { initialIncomes: OtherIncome[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [period, setPeriod] = useState<ListPeriod>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<OtherIncome | null>(null);
  const todayStr = farmToday();
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other',
    incomeDate: todayStr,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function openCreateModal() {
    setEditingIncome(null);
    setForm({ description: '', amount: '', category: 'other', incomeDate: todayStr });
    setError('');
    setIsModalOpen(true);
  }

  function openEditModal(income: OtherIncome) {
    setEditingIncome(income);
    setForm({
      description: income.description,
      amount: income.amount.toString(),
      category: income.category,
      incomeDate: new Date(income.incomeDate).toISOString().slice(0, 10),
    });
    setError('');
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingIncome) {
        await webApiClient.put(`/api/income/${editingIncome.id}`, form, 'Failed to save income record');
      } else {
        await webApiClient.post('/api/income', form, 'Failed to save income record');
      }
      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this income record?')) return;
    try {
      await webApiClient.delete(`/api/income/${id}`);
      router.refresh();
    } catch {
      alert('Failed to delete income record.');
    }
  }

  const filteredIncomes = initialIncomes.filter(inc => {
    const matchesSearch = inc.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || inc.category === categoryFilter;
    const matchesPeriod = inListPeriod(inc.incomeDate, period);
    return matchesSearch && matchesCategory && matchesPeriod;
  });

  const totalAmount = sumAmounts(filteredIncomes);
  const categoryLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Other Income</h1>
          <p className="mt-1 text-slate-500">Track subsidies, grants, insurance payouts, donations, and miscellaneous income.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 transition"
        >
          <Plus className="h-4 w-4" />
          Add Income
        </button>
      </div>

      {/* Total Banner */}
      <div className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-800">Total Other Income</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{fmt(totalAmount)}</p>
          <p className="text-xs text-teal-700 mt-1">{filteredIncomes.length} record{filteredIncomes.length !== 1 ? 's' : ''} in selected period</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
          <TrendingUp className="h-7 w-7" />
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex flex-wrap gap-2">
        {LIST_PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            aria-pressed={period === value}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              period === value
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition ${
            categoryFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition ${
              categoryFilter === c.value
                ? 'bg-teal-700 text-white border-teal-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search income records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredIncomes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  No income records found.
                </td>
              </tr>
            ) : (
              filteredIncomes.map(income => (
                <tr key={income.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 flex-shrink-0">
                        <Coins className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{income.description}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${CATEGORY_COLORS[income.category] || CATEGORY_COLORS.other}`}>
                      {categoryLabel(income.category)}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-teal-700">
                    {fmt(income.amount)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(income.incomeDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(income)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        title="Edit income"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                        title="Delete income"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-100 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingIncome ? 'Edit Income Record' : 'Add Other Income'}
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
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Government livestock subsidy"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Amount (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 5000.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  <CalendarDays className="inline h-3.5 w-3.5 mr-1" />Income Date
                </label>
                <input
                  type="date"
                  value={form.incomeDate}
                  max={todayStr}
                  onChange={(e) => setForm({ ...form, incomeDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
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
                  className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
