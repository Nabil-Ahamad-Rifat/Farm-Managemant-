import { db } from '@/lib/db';
import { withAuth, getIdFromParams } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const cow = await db.cow.findFirst({ where: { id, tenantId } });
  if (!cow) return Response.json({ error: 'Cow not found' }, { status: 404 });

  return Response.json(cow);
});

export const PUT = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const { tagNumber, name, breed, purchasePrice, status } = body;

  const result = await db.cow.updateMany({
    where: { id, tenantId },
    data: {
      tagNumber,
      name,
      breed: breed || null,
      purchasePrice: purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== '' ? parseFloat(purchasePrice) : null,
      status,
    },
  });

  if (result.count === 0) {
    return Response.json({ error: 'Cow not found' }, { status: 404 });
  }

  const updated = await db.cow.findFirst({ where: { id, tenantId } });
  return Response.json(updated);
});

export const DELETE = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  await db.cow.deleteMany({ where: { id, tenantId } });
  return Response.json({ success: true });
});
