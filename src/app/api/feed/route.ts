import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { parseNullableFloat } from '@/lib/parse';

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

  const parsedQty = parseNullableFloat(quantity);
  const parsedPrice = parseNullableFloat(unitPrice);

  if (!name || parsedQty === null || parsedPrice === null) {
    return Response.json({ error: 'Name, valid quantity, and valid unit price are required' }, { status: 400 });
  }

  const parsedRemaining = remainingQuantity !== undefined && remainingQuantity !== ''
    ? (parseNullableFloat(remainingQuantity) ?? parsedQty)
    : parsedQty;

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
