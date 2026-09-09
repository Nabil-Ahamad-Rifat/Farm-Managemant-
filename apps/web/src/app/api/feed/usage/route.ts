import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { parseNullableFloat } from '@/lib/parse';
import { withIdempotency } from '@/lib/idempotency';

// GET /api/feed/usage - list all feed usages
export const GET = withAuth(async (_req, { tenantId }) => {
  const usages = await db.feedUsage.findMany({
    where: { feedBatch: { tenantId } },
    include: { feedBatch: { select: { name: true, unitPrice: true } } },
    orderBy: { usedAt: 'desc' },
  });
  return Response.json(usages);
});

// POST /api/feed/usage - record feed usage
export const POST = withAuth(async (req, { tenantId }) => withIdempotency(req, tenantId, 'feed-usage:create', async () => {
  const body = await req.json();
  const { feedBatchId, quantity, note, usedAt } = body;

  if (!feedBatchId || quantity === undefined) {
    return Response.json({ error: 'feedBatchId and quantity are required' }, { status: 400 });
  }

  // Verify feedBatch belongs to tenant
  const batch = await db.feedBatch.findFirst({ where: { id: feedBatchId, tenantId } });
  if (!batch) return Response.json({ error: 'Feed batch not found' }, { status: 404 });

  const qtyNum = parseNullableFloat(quantity);
  if (qtyNum === null || qtyNum <= 0) {
    return Response.json({ error: 'A valid usage quantity greater than zero is required' }, { status: 400 });
  }
  if (qtyNum > batch.remainingQuantity) {
    return Response.json({ error: `Insufficient stock. Only ${batch.remainingQuantity} kg remaining.` }, { status: 400 });
  }

  const [usage] = await db.$transaction([
    db.feedUsage.create({
      data: {
        feedBatchId,
        quantity: qtyNum,
        note: note || null,
        usedAt: usedAt ? new Date(usedAt) : new Date(),
      },
    }),
    db.feedBatch.update({
      where: { id: feedBatchId },
      data: { remainingQuantity: batch.remainingQuantity - qtyNum },
    }),
  ]);

  return Response.json(usage, { status: 201 });
}));
