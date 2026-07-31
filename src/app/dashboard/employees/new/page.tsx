"use client";

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '' });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (response.ok) {
      router.push('/dashboard/employees');
      router.refresh();
    }
  }

  return (
    <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Add Employee</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit">Save</button>
      </form>
    </div>
  );
}
