import { db } from '@/lib/db';
import { withAuth, getIdFromParams } from '@/lib/middleware/withAuth';

function parseNullableFloat(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

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
    return Response.json({ error: (err as Error).message }, { status: 500 });
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

    // If old cow was unlinked, revert its status
    if (existingSale.cowId && existingSale.cowId !== cowId) {
      await db.cow.updateMany({
        where: { id: existingSale.cowId, tenantId },
        data: { status: 'active' },
      });
    }

    const cowIdVal = cowId || null;
    const saleTypeVal = saleType || existingSale.saleType || 'general';
    const statusVal = status || 'paid';
    const quantityVal = parseNullableFloat(quantity);
    const unitPriceVal = parseNullableFloat(unitPrice);
    const notesVal = notes || null;
    const customerNameVal = customerName || '';
    const now = new Date();
    const saleDateTime = saleDate ? new Date(saleDate + 'T12:00:00Z') : existingSale.createdAt;

    // Raw SQL update — bypasses Turbopack DMMF caching that rejects cowId/saleType
    await db.$executeRaw`
      UPDATE "Sale"
      SET "customerName"=${customerNameVal},"amount"=${parsedAmount},"status"=${statusVal},
          "cowId"=${cowIdVal},"saleType"=${saleTypeVal},"quantity"=${quantityVal},
          "unitPrice"=${unitPriceVal},"notes"=${notesVal},"createdAt"=${saleDateTime},"updatedAt"=${now}
      WHERE "id"=${id} AND "tenantId"=${tenantId}
    `;

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
    return Response.json({ error: (err as Error).message }, { status: 500 });
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
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
