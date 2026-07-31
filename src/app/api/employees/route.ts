import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (_req, { tenantId }) => {
  const employees = await db.employee.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(employees);
});

export const POST = withAuth(async (req, { tenantId }) => {
  const body = await req.json();
  const employee = await db.employee.create({
    data: {
      name: body.name,
      role: body.role,
      email: body.email,
      phone: body.phone,
      tenantId,
    },
  });

  return Response.json(employee, { status: 201 });
});
