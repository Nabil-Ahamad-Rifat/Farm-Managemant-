import { db } from '@/lib/db';

async function getFeed() {
  return db.feedBatch.findMany({ orderBy: { createdAt: 'desc' } });
}

export default async function FeedPage() {
  const feed = await getFeed();

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-900">Feed</h1>
      <p className="mt-2 text-slate-600">Track feed stock and costs.</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Quantity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Unit Price</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {feed.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-slate-900">{item.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.unitPrice}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.remainingQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
