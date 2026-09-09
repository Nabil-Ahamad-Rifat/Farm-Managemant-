import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import EmployeeManager from '@/components/EmployeeManager';

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const employees = await db.employee.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return <EmployeeManager initialEmployees={employees} />;
}
