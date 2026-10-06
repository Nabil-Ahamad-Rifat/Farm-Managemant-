import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getMonthlyReport, parseMonth } from '@/lib/monthly-report';
import MonthlyReport from '@/components/MonthlyReport';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const month = parseMonth((await searchParams).month);
  const report = await getMonthlyReport(session.tenantId, month);
  return <MonthlyReport month={report.month} totals={report.totals} lines={report.lines} />;
}
