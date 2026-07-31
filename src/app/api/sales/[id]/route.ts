import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (req, { tenantId }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const sale = await db.sale.findFirst({
    where: { id, tenantId },
    include: { cow: true },
  });
  if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

  return Response.json(sale);
});

export const PUT = withAuth(async (req, { tenantId }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const { customerName, amount, status, cowId } = body;

  const result = await db.sale.updateMany({
    where: { id, tenantId },
    data: {
      customerName,
      amount: parseFloat(amount),
      status,
      cowId: cowId || null,
    },
  });

  if (result.count === 0) {
    return Response.json({ error: 'Sale not found' }, { status: 404 });
  }

  const updated = await db.sale.findFirst({ where: { id, tenantId } });
  return Response.json(updated);
});

export const DELETE = withAuth(async (req, { tenantId }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  await db.sale.deleteMany({ where: { id, tenantId } });
  return Response.json({ success: true });
});
