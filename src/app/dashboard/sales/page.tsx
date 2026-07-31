import { db } from '@/lib/db';

async function getSales() {
  return db.sale.findMany({ orderBy: { createdAt: 'desc' } });
}

export default async function SalesPage() {
  const sales = await getSales();

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-900">Sales</h1>
      <p className="mt-2 text-slate-600">Review sales and payment status.</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-3 text-sm text-slate-900">{sale.customerName}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{sale.amount}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{sale.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
