import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import ExpenseManager from '@/components/ExpenseManager';

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const expenses = await db.otherExpense.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { expenseDate: 'desc' },
  });

  return <ExpenseManager initialExpenses={expenses} />;
}
