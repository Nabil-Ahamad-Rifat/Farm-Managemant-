import { db } from '@/lib/db';
import { withAuth, getIdFromParams } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const employee = await db.employee.findFirst({
      where: { id, tenantId },
    });
    if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

    return Response.json(employee);
  } catch (err: unknown) {
    console.error('Error fetching employee:', err);
    return Response.json({ error: 'Failed to load employee' }, { status: 500 });
  }
});

export const PUT = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();
    const { name, role, email, phone, salary, joinDate, status } = body;

    const salaryVal = salary !== undefined && Number.isFinite(parseFloat(salary)) ? parseFloat(salary) : 0;

    const result = await db.employee.updateMany({
      where: { id, tenantId },
      data: {
        name: name || '',
        role: role || '',
        email: email || null,
        phone: phone || null,
        salary: salaryVal,
        joinDate: joinDate ? new Date(joinDate) : null,
        status: status || 'active',
      },
    });

    if (result.count === 0) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updated = await db.employee.findFirst({ where: { id, tenantId } });
    return Response.json(updated);
  } catch (err: unknown) {
    console.error('Error updating employee:', err);
    return Response.json({ error: 'Failed to update employee' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    await db.employee.deleteMany({ where: { id, tenantId } });
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting employee:', err);
    return Response.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
});
