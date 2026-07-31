import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import SalesManager from '@/components/SalesManager';

export default async function SalesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const [sales, activeCows] = await Promise.all([
    db.sale.findMany({
      where: { tenantId: session.tenantId },
      include: { cow: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.cow.findMany({
      where: { tenantId: session.tenantId, status: 'active' },
      orderBy: { name: 'asc' },
    }),
  ]);

  return <SalesManager initialSales={sales} activeCows={activeCows} />;
}
