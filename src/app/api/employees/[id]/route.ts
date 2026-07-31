import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (req, { tenantId }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const employee = await db.employee.findFirst({ where: { id, tenantId } });
  if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

  return Response.json(employee);
});

export const PUT = withAuth(async (req, { tenantId }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const result = await db.employee.updateMany({
    where: { id, tenantId },
    data: {
      name: body.name,
      role: body.role,
      email: body.email,
      phone: body.phone,
    },
  });

  if (result.count === 0) {
    return Response.json({ error: 'Employee not found' }, { status: 404 });
  }

  const updated = await db.employee.findFirst({ where: { id, tenantId } });
  return Response.json(updated);
});

export const DELETE = withAuth(async (req, { tenantId }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  await db.employee.deleteMany({ where: { id, tenantId } });
  return Response.json({ success: true });
});
