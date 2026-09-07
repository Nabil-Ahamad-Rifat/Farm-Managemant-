import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { randomUUID } from 'crypto';

function parseNullableFloat(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? null : parsed;
}

export const GET = withAuth(async (_req, { tenantId }) => {
  try {
    const sales = await db.sale.findMany({
      where: { tenantId },
      include: { cow: true },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(sales);
  } catch (err: unknown) {
    console.error('Error creating sale:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const POST = withAuth(async (req, { tenantId }) => {
  try {
    const body = await req.json();
    const { customerName, amount, status, cowId, saleType, quantity, unitPrice, notes, saleDate } = body;

    const parsedAmount = parseNullableFloat(amount);

    if (!customerName || parsedAmount === null) {
      return Response.json({ error: 'Customer name and valid sale amount are required' }, { status: 400 });
    }

    const id = randomUUID();
    const statusVal = status || 'paid';
    const cowIdVal = cowId || null;
    const saleTypeVal = saleType || 'general';
    const quantityVal = parseNullableFloat(quantity);
    const unitPriceVal = parseNullableFloat(unitPrice);
    const notesVal = notes || null;
    // Use provided saleDate as createdAt at UTC noon; fall back to now
    const saleDateTime = saleDate ? new Date(saleDate + 'T12:00:00Z') : new Date();
    const now = new Date();

    // Raw SQL insert — bypasses Turbopack DMMF caching that rejects saleType/cowId
    await db.$executeRaw`
      INSERT INTO "Sale" ("id","customerName","amount","status","cowId","saleType","quantity","unitPrice","notes","tenantId","createdAt","updatedAt")
      VALUES (${id},${customerName},${parsedAmount},${statusVal},${cowIdVal},${saleTypeVal},${quantityVal},${unitPriceVal},${notesVal},${tenantId},${saleDateTime},${now})
    `;

    if (cowId) {
      await db.cow.updateMany({
        where: { id: cowId, tenantId },
        data: { status: 'sold' },
      });
    }

    const sale = await db.sale.findFirst({ where: { id } });
    return Response.json(sale, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating sale:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});

