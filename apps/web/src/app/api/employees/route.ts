import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (_req, { tenantId }) => {
  try {
    const employees = await db.employee.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(employees);
  } catch (err: unknown) {
    console.error('Error listing employees:', err);
    return Response.json({ error: 'Failed to load employees' }, { status: 500 });
  }
});

export const POST = withAuth(async (req, { tenantId }) => {
  try {
    const body = await req.json();
    const { name, role, email, phone, salary, joinDate, status } = body;

    if (!name || !role) {
      return Response.json({ error: 'Name and role are required' }, { status: 400 });
    }

    const salaryVal = Number.isFinite(parseFloat(salary)) ? parseFloat(salary) : 0;

    const employee = await db.employee.create({
      data: {
        name,
        role,
        email: email || null,
        phone: phone || null,
        salary: salaryVal,
        joinDate: joinDate ? new Date(joinDate) : null,
        status: status || 'active',
        tenantId,
      },
    });

    return Response.json(employee, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating employee:', err);
    return Response.json({ error: 'Failed to create employee' }, { status: 500 });
  }
});
