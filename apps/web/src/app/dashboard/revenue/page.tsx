import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getFinanceReport, resolveRange } from '@/lib/finance';
import RevenuePortal from '@/components/RevenuePortal';

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function RevenuePage({ searchParams }: { searchParams: Search }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const sp = await searchParams;
  const range = resolveRange({ range: one(sp.range), month: one(sp.month), from: one(sp.from), to: one(sp.to) });
  const report = await getFinanceReport(session.tenantId, range);

  return <RevenuePortal report={report} />;
}
