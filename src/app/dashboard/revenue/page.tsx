import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import RevenuePortal from '@/components/RevenuePortal';

export default async function RevenuePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return <RevenuePortal />;
}
