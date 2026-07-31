"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Edit3, UserCheck, X } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
}

export default function EmployeeManager({ initialEmployees }: { initialEmployees: Employee[] }) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function openCreateModal() {
    setEditingEmployee(null);
    setForm({ name: '', role: '', email: '', phone: '' });
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
    });
    setError('');
    setIsModalOpen(true);
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

  const filteredEmployees = initialEmployees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.role.toLowerCase().includes(search.toLowerCase()) ||
    (emp.email && emp.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employees</h1>
          <p className="mt-1 text-slate-500">Manage your farm workforce and staff assignments.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search employees by name or role..."
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
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  No employees found.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{employee.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{employee.email || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{employee.phone || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
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
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
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
                  placeholder="e.g. Farm Supervisor, Herdsman"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@farm.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 555-0192"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                  {loading ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
