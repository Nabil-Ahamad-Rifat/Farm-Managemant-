import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { randomUUID } from 'crypto';

export const GET = withAuth(async (_req, { tenantId }) => {
  try {
    const employees = await db.employee.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(employees);
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const POST = withAuth(async (req, { tenantId }) => {
  try {
    const body = await req.json();
    const { name, role, email, phone, salary, joinDate, status } = body;

    if (!name || !role) {
      return Response.json({ error: 'Name and role are required' }, { status: 400 });
    }

    const id = randomUUID();
    const salaryVal = parseFloat(salary) || 0;
    const statusVal = status || 'active';
    const joinDateVal = joinDate ? new Date(joinDate).toISOString() : null;
    const emailVal = email || null;
    const phoneVal = phone || null;
    const now = new Date().toISOString();

    // Use raw SQL to bypass Turbopack DMMF caching — guarantees all fields persist
    await db.$executeRaw`
      INSERT INTO "Employee" ("id","name","role","email","phone","salary","joinDate","status","tenantId","createdAt","updatedAt")
      VALUES (${id},${name},${role},${emailVal},${phoneVal},${salaryVal},${joinDateVal ? new Date(joinDateVal) : null},${statusVal},${tenantId},${new Date(now)},${new Date(now)})
    `;

    const employee = await db.employee.findFirst({ where: { id } });
    return Response.json(employee, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating employee:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
