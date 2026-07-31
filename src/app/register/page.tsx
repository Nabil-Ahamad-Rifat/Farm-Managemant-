"use client";

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', tenantName: '' });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (response.ok) {
      router.push('/dashboard');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Create your farm account</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Farm name" value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} />
          <button className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit">Create account</button>
        </form>
      </div>
    </main>
  );
}
