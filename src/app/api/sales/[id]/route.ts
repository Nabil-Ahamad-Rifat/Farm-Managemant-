import { db } from '@/lib/db';
import { withAuth, getIdFromParams } from '@/lib/middleware/withAuth';
import { parseNullableFloat } from '@/lib/parse';

export const GET = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const sale = await db.sale.findFirst({
      where: { id, tenantId },
      include: { cow: true },
    });
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    return Response.json(sale);
  } catch (err: unknown) {
    console.error('Error fetching sale:', err);
    return Response.json({ error: 'Failed to load sale' }, { status: 500 });
  }
});

export const PUT = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();
    const { customerName, amount, status, cowId, saleType, quantity, unitPrice, notes, saleDate } = body;

    const parsedAmount = parseNullableFloat(amount);
    if (parsedAmount === null) {
      return Response.json({ error: 'Valid sale amount is required' }, { status: 400 });
    }

    const existingSale = await db.sale.findFirst({ where: { id, tenantId } });
    if (!existingSale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    // If linking to a (new) cow, make sure it belongs to this tenant.
    if (cowId && cowId !== existingSale.cowId) {
      const cow = await db.cow.findFirst({ where: { id: cowId, tenantId } });
      if (!cow) return Response.json({ error: 'Cow not found' }, { status: 404 });
    }

    // If old cow was unlinked, revert its status
    if (existingSale.cowId && existingSale.cowId !== cowId) {
      await db.cow.updateMany({
        where: { id: existingSale.cowId, tenantId },
        data: { status: 'active' },
      });
    }

    const saleDateTime = saleDate ? new Date(saleDate + 'T12:00:00Z') : existingSale.createdAt;

    const result = await db.sale.updateMany({
      where: { id, tenantId },
      data: {
        customerName: customerName || '',
        amount: parsedAmount,
        status: status || 'paid',
        cowId: cowId || null,
        saleType: saleType || existingSale.saleType || 'general',
        quantity: parseNullableFloat(quantity),
        unitPrice: parseNullableFloat(unitPrice),
        notes: notes || null,
        createdAt: saleDateTime,
      },
    });

    if (result.count === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Link new cow if provided
    if (cowId) {
      await db.cow.updateMany({
        where: { id: cowId, tenantId },
        data: { status: 'sold' },
      });
    }

    const updated = await db.sale.findFirst({ where: { id, tenantId } });
    return Response.json(updated);
  } catch (err: unknown) {
    console.error('Error updating sale:', err);
    return Response.json({ error: 'Failed to update sale' }, { status: 500 });
  }
});


export const DELETE = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const sale = await db.sale.findFirst({ where: { id, tenantId } });
    if (sale?.cowId) {
      await db.cow.updateMany({
        where: { id: sale.cowId, tenantId },
        data: { status: 'active' },
      });
    }

    await db.sale.deleteMany({ where: { id, tenantId } });
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting sale:', err);
    return Response.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
});
