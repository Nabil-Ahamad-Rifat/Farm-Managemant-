"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Edit3, X, PackageOpen } from 'lucide-react';

interface OtherExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string | Date;
  createdAt: string | Date;
}

const CATEGORIES = [
  { value: 'vet', label: 'Veterinary' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'transport', label: 'Transport' },
  { value: 'electricity', label: 'Electricity/Utilities' },
  { value: 'repair', label: 'Repair & Maintenance' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  vet: 'bg-blue-50 text-blue-700 border-blue-200',
  equipment: 'bg-slate-50 text-slate-700 border-slate-200',
  medicine: 'bg-purple-50 text-purple-700 border-purple-200',
  transport: 'bg-orange-50 text-orange-700 border-orange-200',
  electricity: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  repair: 'bg-red-50 text-red-700 border-red-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

const PERIOD_FILTERS = [
  { label: 'Today', days: 1 },
  { label: '4 Days', days: 4 },
  { label: '8 Days', days: 8 },
  { label: '15 Days', days: 15 },
  { label: '30 Days', days: 30 },
  { label: 'All', days: 0 },
];

export default function ExpenseManager({ initialExpenses }: { initialExpenses: OtherExpense[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [periodDays, setPeriodDays] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OtherExpense | null>(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other',
    expenseDate: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function openCreateModal() {
    setEditingExpense(null);
    setForm({ description: '', amount: '', category: 'other', expenseDate: new Date().toISOString().slice(0, 10) });
    setError('');
    setIsModalOpen(true);
  }

  function openEditModal(exp: OtherExpense) {
    setEditingExpense(exp);
    setForm({
      description: exp.description,
      amount: exp.amount.toString(),
      category: exp.category,
      expenseDate: new Date(exp.expenseDate).toISOString().slice(0, 10),
    });
    setError('');
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
    const method = editingExpense ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save expense');
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
    if (!confirm('Delete this expense?')) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      router.refresh();
    } catch {
      alert('Failed to delete expense.');
    }
  }

  function daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const filteredExpenses = initialExpenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesPeriod = periodDays === 0 || new Date(exp.expenseDate) >= daysAgo(periodDays);
    return matchesSearch && matchesCategory && matchesPeriod;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Other Expenses</h1>
          <p className="mt-1 text-slate-500">Track vet fees, equipment, medicines, transport, and miscellaneous costs.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Total Banner */}
      <div className="rounded-2xl border border-red-100 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-red-800">Total Other Costs</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">
            ৳{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-red-700 mt-1">{filteredExpenses.length} expense records</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/20">
          <PackageOpen className="h-6 w-6" />
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_FILTERS.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => setPeriodDays(days)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              periodDays === days
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ value: 'all', label: 'All' }, ...CATEGORIES].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategoryFilter(value)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition ${
                categoryFilter === value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-500">No expenses recorded.</td>
              </tr>
            ) : (
              filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{exp.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.other}`}>
                      {categoryLabel(exp.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                    ৳{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(exp.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(exp)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-100">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vet visit for cow #5"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Amount (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 500"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
