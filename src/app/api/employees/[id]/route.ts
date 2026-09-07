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
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const PUT = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();
    const { name, role, email, phone, salary, joinDate, status } = body;

    const salaryVal = salary !== undefined ? parseFloat(salary) || 0 : 0;
    const statusVal = status || 'active';
    const joinDateVal = joinDate ? new Date(joinDate) : null;
    const emailVal = email || null;
    const phoneVal = phone || null;
    const nameVal = name || '';
    const roleVal = role || '';
    const now = new Date();

    // Raw SQL update to bypass Turbopack DMMF caching — guarantees all fields persist
    const result = await db.$executeRaw`
      UPDATE "Employee"
      SET "name"=${nameVal},"role"=${roleVal},"email"=${emailVal},"phone"=${phoneVal},
          "salary"=${salaryVal},"joinDate"=${joinDateVal},"status"=${statusVal},"updatedAt"=${now}
      WHERE "id"=${id} AND "tenantId"=${tenantId}
    `;

    if (result === 0) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updated = await db.employee.findFirst({ where: { id, tenantId } });
    return Response.json(updated);
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    await db.employee.deleteMany({ where: { id, tenantId } });
    return Response.json({ success: true });
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});

