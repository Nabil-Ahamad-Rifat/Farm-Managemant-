import { db } from '@/lib/db';
import { withAuth, getIdFromParams } from '@/lib/middleware/withAuth';

// PUT /api/income/[id] - update an income record
export const PUT = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();
    const { description, amount, category, incomeDate } = body;

    const existing = await db.otherIncome.findFirst({ where: { id, tenantId } });
    if (!existing) return Response.json({ error: 'Income record not found' }, { status: 404 });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const updated = await db.otherIncome.update({
      where: { id },
      data: {
        description: description || existing.description,
        amount: parsedAmount,
        category: category || existing.category,
        incomeDate: incomeDate ? new Date(incomeDate + 'T12:00:00Z') : existing.incomeDate,
      },
    });

    return Response.json(updated);
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});

// DELETE /api/income/[id] - delete an income record
export const DELETE = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const id = await getIdFromParams(routeContext, req);
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const existing = await db.otherIncome.findFirst({ where: { id, tenantId } });
    if (!existing) return Response.json({ error: 'Income record not found' }, { status: 404 });

    await db.otherIncome.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
