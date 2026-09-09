import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { parseNullableFloat } from '@/lib/parse';
import { withIdempotency } from '@/lib/idempotency';

export const GET = withAuth(async (_req, { tenantId }) => {
  try {
    const sales = await db.sale.findMany({
      where: { tenantId },
      include: { cow: true },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(sales);
  } catch (err: unknown) {
    console.error('Error listing sales:', err);
    return Response.json({ error: 'Failed to load sales' }, { status: 500 });
  }
});

export const POST = withAuth(async (req, { tenantId }) => withIdempotency(req, tenantId, 'sales:create', async () => {
  try {
    const body = await req.json();
    const { customerName, amount, status, cowId, saleType, quantity, unitPrice, notes, saleDate } = body;

    const parsedAmount = parseNullableFloat(amount);

    if (!customerName || parsedAmount === null) {
      return Response.json({ error: 'Customer name and valid sale amount are required' }, { status: 400 });
    }

    // If linking to a cow, make sure it belongs to this tenant before writing anything.
    if (cowId) {
      const cow = await db.cow.findFirst({ where: { id: cowId, tenantId } });
      if (!cow) return Response.json({ error: 'Cow not found' }, { status: 404 });
    }

    const saleDateTime = saleDate ? new Date(saleDate + 'T12:00:00Z') : new Date();

    const sale = await db.sale.create({
      data: {
        customerName,
        amount: parsedAmount,
        status: status || 'paid',
        cowId: cowId || null,
        saleType: saleType || 'general',
        quantity: parseNullableFloat(quantity),
        unitPrice: parseNullableFloat(unitPrice),
        notes: notes || null,
        tenantId,
        createdAt: saleDateTime,
      },
    });

    if (cowId) {
      await db.cow.updateMany({
        where: { id: cowId, tenantId },
        data: { status: 'sold' },
      });
    }

    return Response.json(sale, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating sale:', err);
    return Response.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}));
