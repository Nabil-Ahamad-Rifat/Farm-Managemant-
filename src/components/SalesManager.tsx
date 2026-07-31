"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Edit3, DollarSign, X, CheckCircle, Clock, Tag, FileText } from 'lucide-react';

interface Cow {
  id: string;
  name: string;
  tagNumber: string;
}

interface Sale {
  id: string;
  customerName: string;
  amount: number;
  status: string;
  saleType: string;
  quantity: number | null;
  unitPrice: number | null;
  notes: string | null;
  cowId: string | null;
  cow?: Cow | null;
  createdAt: Date | string;
}

const SALE_TYPES = [
  { value: 'general', label: 'General Sale' },
  { value: 'cow_sale', label: 'Cow Sale' },
  { value: 'milk', label: 'Milk' },
  { value: 'products', label: 'Farm Products' },
  { value: 'other', label: 'Other' },
];

const PERIOD_FILTERS = [
  { label: 'Today', days: 1 },
  { label: '4 Days', days: 4 },
  { label: '8 Days', days: 8 },
  { label: '15 Days', days: 15 },
  { label: '30 Days', days: 30 },
  { label: 'All', days: 0 },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function SalesManager({
  initialSales,
  activeCows,
}: {
  initialSales: Sale[];
  activeCows: Cow[];
}) {
  const router = useRouter();
  const [sales] = useState<Sale[]>(initialSales);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodDays, setPeriodDays] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [form, setForm] = useState({
    customerName: '',
    amount: '',
    status: 'paid',
    cowId: '',
    saleType: 'general',
    quantity: '',
    unitPrice: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-calculate amount from quantity × unitPrice
  const calculatedAmount = useMemo(() => {
    if (form.quantity && form.unitPrice) {
      return (parseFloat(form.quantity) * parseFloat(form.unitPrice)).toFixed(2);
    }
    return form.amount;
  }, [form.quantity, form.unitPrice, form.amount]);

  function openCreateModal() {
    setEditingSale(null);
    setForm({ customerName: '', amount: '', status: 'paid', cowId: '', saleType: 'general', quantity: '', unitPrice: '', notes: '' });
    setError('');
    setIsModalOpen(true);
  }

  function openEditModal(sale: Sale) {
    setEditingSale(sale);
    setForm({
      customerName: sale.customerName,
      amount: sale.amount.toString(),
      status: sale.status,
      cowId: sale.cowId || '',
      saleType: sale.saleType || 'general',
      quantity: sale.quantity?.toString() || '',
      unitPrice: sale.unitPrice?.toString() || '',
      notes: sale.notes || '',
    });
    setError('');
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = editingSale ? `/api/sales/${editingSale.id}` : '/api/sales';
    const method = editingSale ? 'PUT' : 'POST';

    const finalAmount = (form.quantity && form.unitPrice)
      ? (parseFloat(form.quantity) * parseFloat(form.unitPrice)).toString()
      : form.amount;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: finalAmount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save sale record');
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
    if (!confirm('Are you sure you want to delete this sale record?')) return;

    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } catch (err) {
      alert('Failed to delete sale record.');
    }
  }

  const filteredSales = initialSales.filter((sale) => {
    const matchesSearch =
      sale.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (sale.cow && (
        sale.cow.name.toLowerCase().includes(search.toLowerCase()) ||
        sale.cow.tagNumber.toLowerCase().includes(search.toLowerCase())
      ));
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;

    let matchesPeriod = true;
    if (periodDays > 0) {
      const since = daysAgo(periodDays);
      matchesPeriod = new Date(sale.createdAt) >= since;
    }

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const totalRevenue = filteredSales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0);
  const pendingRevenue = filteredSales.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0);

  const saleTypeLabel = (type: string) => SALE_TYPES.find(t => t.value === type)?.label || type;
  const saleTypeColors: Record<string, string> = {
    cow_sale: 'bg-blue-50 text-blue-700 border-blue-200',
    milk: 'bg-sky-50 text-sky-700 border-sky-200',
    products: 'bg-violet-50 text-violet-700 border-violet-200',
    general: 'bg-slate-50 text-slate-700 border-slate-200',
    other: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales & Revenue</h1>
          <p className="mt-1 text-slate-500">Record customer sales with details: type, quantity, unit price, and notes.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          Record Sale
        </button>
      </div>

      {/* Revenue Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Collected Revenue</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              ৳{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Revenue</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              ৳{pendingRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/20">
            <Clock className="h-5 w-5" />
          </div>
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

      {/* Search & Status Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or cow tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'paid', 'pending'].map((status) => (
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
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Qty × Price</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                  No sales transactions found.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-sm font-semibold text-slate-900">{sale.customerName}</p>
                    {sale.cow && (
                      <p className="text-[11px] text-slate-400">{sale.cow.name} ({sale.cow.tagNumber})</p>
                    )}
                    {sale.notes && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <FileText className="h-3 w-3" /> {sale.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${saleTypeColors[sale.saleType] || saleTypeColors.general}`}>
                      <Tag className="h-3 w-3" />
                      {saleTypeLabel(sale.saleType)}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                    {sale.quantity && sale.unitPrice
                      ? `${sale.quantity} × ৳${sale.unitPrice}`
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                    ৳{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold uppercase px-2.5 py-1 rounded-full ${
                      sale.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {sale.status === 'paid' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(sale)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        title="Edit sale"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                        title="Delete sale"
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

      {/* Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingSale ? 'Edit Transaction' : 'Record New Sale'}
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
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Customer / Buyer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abdul Karim"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Sale Type</label>
                <select
                  value={form.saleType}
                  onChange={(e) => setForm({ ...form, saleType: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  {SALE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 10 (liters/kg)"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Unit Price (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 85.00"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Total Amount (৳)
                  {form.quantity && form.unitPrice && (
                    <span className="ml-2 text-emerald-600 normal-case font-normal">
                      Auto-calculated: ৳{calculatedAmount}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 850.00"
                  value={form.quantity && form.unitPrice ? calculatedAmount : form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  readOnly={!!(form.quantity && form.unitPrice)}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none ${
                    form.quantity && form.unitPrice ? 'bg-slate-50 border-slate-200 text-slate-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Link Livestock (Optional)</label>
                <select
                  value={form.cowId}
                  onChange={(e) => setForm({ ...form, cowId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  <option value="">None</option>
                  {activeCows.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.tagNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Payment Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Morning milk delivery"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
