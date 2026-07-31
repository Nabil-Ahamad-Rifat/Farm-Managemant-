import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (_req, { tenantId }) => {
  const feeds = await db.feedBatch.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(feeds);
});

export const POST = withAuth(async (req, { tenantId }) => {
  const body = await req.json();
  const { name, quantity, unitPrice, remainingQuantity } = body;

  if (!name || quantity === undefined || unitPrice === undefined) {
    return Response.json({ error: 'Name, quantity, and unit price are required' }, { status: 400 });
  }

  const parsedQty = parseFloat(quantity);
  const parsedPrice = parseFloat(unitPrice);
  const parsedRemaining = remainingQuantity !== undefined && remainingQuantity !== '' ? parseFloat(remainingQuantity) : parsedQty;

  const feed = await db.feedBatch.create({
    data: {
      name,
      quantity: parsedQty,
      unitPrice: parsedPrice,
      remainingQuantity: parsedRemaining,
      tenantId,
    },
  });

  return Response.json(feed, { status: 201 });
});
