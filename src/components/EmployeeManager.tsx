"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Edit3, UserCheck, X, Banknote, Calendar, CheckCircle2, AlertCircle, Clock3 } from 'lucide-react';

interface SalaryPayment {
  id: string;
  amount: number;
  periodMonth: number;
  periodYear: number;
  note: string | null;
  paidAt: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  salary: number;
  joinDate: string | Date | null;
  status: string;
  salaryPayments?: SalaryPayment[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const now = new Date();

export default function EmployeeManager({ initialEmployees }: { initialEmployees: Employee[] }) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '', salary: '', joinDate: '', status: 'active' });
  const [salaryForm, setSalaryForm] = useState({
    amount: '',
    periodMonth: (now.getMonth() + 1).toString(),
    periodYear: now.getFullYear().toString(),
    note: '',
  });
  const [error, setError] = useState('');
  const [salaryError, setSalaryError] = useState('');
  const [loading, setLoading] = useState(false);

  function openCreateModal() {
    setEditingEmployee(null);
    setForm({ name: '', role: '', email: '', phone: '', salary: '', joinDate: '', status: 'active' });
    setError('');
    setIsModalOpen(true);
  }

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp);
    setForm({
      name: emp.name,
      role: emp.role,
      email: emp.email || '',
      phone: emp.phone || '',
      salary: (emp.salary ?? 0).toString(),
      joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().slice(0, 10) : '',
      status: emp.status || 'active',
    });
    setError('');
    setIsModalOpen(true);
  }

  function openSalaryModal(emp: Employee) {
    setSalaryEmployee(emp);
    setSalaryForm({
      amount: (emp.salary ?? 0).toString(),
      periodMonth: (now.getMonth() + 1).toString(),
      periodYear: now.getFullYear().toString(),
      note: '',
    });
    setSalaryError('');
    setIsSalaryModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
    const method = editingEmployee ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save employee');
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalarySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!salaryEmployee) return;
    setLoading(true);
    setSalaryError('');

    try {
      const res = await fetch(`/api/employees/${salaryEmployee.id}/salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salaryForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record salary payment');
      }

      setIsSalaryModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setSalaryError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        router.refresh();
      }
    } catch (err) {
      alert('Failed to delete employee.');
    }
  }

  const filteredEmployees = initialEmployees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(search.toLowerCase()));
    const empStatus = emp.status || 'active';
    const matchesStatus = statusFilter === 'all' || empStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMonthlySalary = filteredEmployees
    .filter(e => (e.status || 'active') === 'active')
    .reduce((sum, e) => sum + (e.salary ?? 0), 0);

  const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
    active: { label: 'Active', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    on_leave: { label: 'On Leave', icon: Clock3, className: 'bg-amber-50 text-amber-700 border-amber-200' },
    terminated: { label: 'Terminated', icon: AlertCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employee Management</h1>
          <p className="mt-1 text-slate-500">Manage your farm workforce, salaries, and assignments.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {/* Monthly Salary Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-800">Monthly Labour Cost</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">
            ৳{totalMonthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-indigo-700 mt-1">{filteredEmployees.filter(e => (e.status || 'active') === 'active').length} active employees</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
          <Banknote className="h-6 w-6" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {[
            { val: 'all', label: 'All' },
            { val: 'active', label: 'Active' },
            { val: 'on_leave', label: 'On Leave' },
            { val: 'terminated', label: 'Terminated' },
          ].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition ${
                statusFilter === val
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
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Salary</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                  No employees found.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                const sc = statusConfig[employee.status || 'active'] || statusConfig['active'];
                const StatusIcon = sc.icon;
                return (
                  <tr key={employee.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                          {employee.joinDate && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Joined {new Date(employee.joinDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{employee.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                      ৳{(employee.salary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full border ${sc.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div>{employee.phone || '—'}</div>
                      <div className="text-[11px] text-slate-400">{employee.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openSalaryModal(employee)}
                          className="rounded-lg px-2 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1"
                          title="Record salary payment"
                        >
                          <Banknote className="h-3.5 w-3.5" /> Pay
                        </button>
                        <button
                          onClick={() => openEditModal(employee)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          title="Edit employee"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                          title="Delete employee"
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

      {/* Employee Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karim Hossain"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Farm Supervisor"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Monthly Salary (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 12000"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Join Date</label>
                  <input
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 01711-123456"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. karim@farm.com (optional)"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
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
                  {loading ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Payment Modal */}
      {isSalaryModalOpen && salaryEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Record Salary Payment</h2>
                <p className="text-xs text-slate-500 mt-0.5">{salaryEmployee.name} — {salaryEmployee.role}</p>
              </div>
              <button
                onClick={() => setIsSalaryModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-700">
              Contracted monthly salary: <span className="font-bold">৳{(salaryEmployee.salary ?? 0).toLocaleString()}</span>
            </div>

            {salaryError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-100">
                {salaryError}
              </div>
            )}

            <form onSubmit={handleSalarySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Amount Paid (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={salaryForm.amount}
                  onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Month</label>
                  <select
                    value={salaryForm.periodMonth}
                    onChange={(e) => setSalaryForm({ ...salaryForm, periodMonth: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Year</label>
                  <input
                    type="number"
                    min="2020"
                    max="2099"
                    value={salaryForm.periodYear}
                    onChange={(e) => setSalaryForm({ ...salaryForm, periodYear: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. July 2026 salary"
                  value={salaryForm.note}
                  onChange={(e) => setSalaryForm({ ...salaryForm, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSalaryModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
