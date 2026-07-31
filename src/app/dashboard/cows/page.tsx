import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import CowManager from '@/components/CowManager';

export default async function CowsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const cows = await db.cow.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return <CowManager initialCows={cows} />;
}
