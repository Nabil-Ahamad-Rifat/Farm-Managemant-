import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import DashboardShell from '@/components/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let tenantName = 'Farm Manager';
  let userName = 'User';
  let userEmail = '';

  if (session) {
    userName = session.name;
    userEmail = session.email;
    const tenant = await db.tenant.findUnique({ where: { id: session.tenantId } });
    if (tenant) {
      tenantName = tenant.name;
    }
  }

  return (
    <DashboardShell tenantName={tenantName} userName={userName} userEmail={userEmail}>
      {children}
    </DashboardShell>
  );
}
