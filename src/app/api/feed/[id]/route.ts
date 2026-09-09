import { db } from '@/lib/db';
import { withAuth, getIdFromParams } from '@/lib/middleware/withAuth';
import { parseNullableFloat } from '@/lib/parse';

export const GET = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const feed = await db.feedBatch.findFirst({ where: { id, tenantId } });
  if (!feed) return Response.json({ error: 'Feed batch not found' }, { status: 404 });

  return Response.json(feed);
});

export const PUT = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const { name, quantity, unitPrice, remainingQuantity } = body;

  const parsedQty = parseNullableFloat(quantity);
  const parsedPrice = parseNullableFloat(unitPrice);
  const parsedRemaining = parseNullableFloat(remainingQuantity);

  if (!name || parsedQty === null || parsedPrice === null || parsedRemaining === null) {
    return Response.json({ error: 'Name, valid quantity, unit price, and remaining quantity are required' }, { status: 400 });
  }

  const result = await db.feedBatch.updateMany({
    where: { id, tenantId },
    data: {
      name,
      quantity: parsedQty,
      unitPrice: parsedPrice,
      remainingQuantity: parsedRemaining,
    },
  });

  if (result.count === 0) {
    return Response.json({ error: 'Feed batch not found' }, { status: 404 });
  }

  const updated = await db.feedBatch.findFirst({ where: { id, tenantId } });
  return Response.json(updated);
});

export const DELETE = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  await db.feedBatch.deleteMany({ where: { id, tenantId } });
  return Response.json({ success: true });
});
