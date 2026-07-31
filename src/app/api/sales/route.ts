import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (_req, { tenantId }) => {
  const sales = await db.sale.findMany({
    where: { tenantId },
    include: { cow: true },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(sales);
});

export const POST = withAuth(async (req, { tenantId }) => {
  const body = await req.json();
  const { customerName, amount, status, cowId } = body;

  if (!customerName || amount === undefined) {
    return Response.json({ error: 'Customer name and amount are required' }, { status: 400 });
  }

  const sale = await db.sale.create({
    data: {
      customerName,
      amount: parseFloat(amount),
      status: status || 'paid',
      cowId: cowId || null,
      tenantId,
    },
  });

  if (cowId) {
    await db.cow.updateMany({
      where: { id: cowId, tenantId },
      data: { status: 'sold' },
    });
  }

  return Response.json(sale, { status: 201 });
});
