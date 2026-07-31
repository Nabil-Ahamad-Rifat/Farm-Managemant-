import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ArrowLeft, UserCheck, Banknote, Calendar, Phone, Mail } from 'lucide-react';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const employee = await db.employee.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      salaryPayments: {
        orderBy: { paidAt: 'desc' },
      },
    },
  });

  if (!employee) {
    redirect('/dashboard/employees');
  }

  const totalSalaryPaid = employee.salaryPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/dashboard/employees" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-xl">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{employee.name}</h1>
            <p className="text-sm font-medium text-slate-500">{employee.role}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              {employee.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {employee.phone}</span>}
              {employee.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {employee.email}</span>}
              {employee.joinDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {new Date(employee.joinDate).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-block text-xs font-semibold uppercase px-3 py-1 rounded-full ${
            employee.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {employee.status}
          </span>
          <p className="text-xs text-slate-400 mt-2">Contracted Monthly Salary</p>
          <p className="text-xl font-extrabold text-slate-900">৳{employee.salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Salary History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Salary Disbursement History</h2>
            <p className="text-xs text-slate-500">Total paid: ৳{totalSalaryPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Banknote className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                <th className="pb-3">Period</th>
                <th className="pb-3">Amount Paid</th>
                <th className="pb-3">Payment Date</th>
                <th className="pb-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employee.salaryPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-slate-400">No salary payments recorded yet.</td>
                </tr>
              ) : (
                employee.salaryPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-semibold text-slate-900">{p.periodMonth}/{p.periodYear}</td>
                    <td className="py-3 font-bold text-emerald-600">৳{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-slate-500">{new Date(p.paidAt).toLocaleDateString()}</td>
                    <td className="py-3 text-slate-500">{p.note || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
