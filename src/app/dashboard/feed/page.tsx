import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import FeedManager from '@/components/FeedManager';

export default async function FeedPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const feed = await db.feedBatch.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return <FeedManager initialFeed={feed} />;
}
