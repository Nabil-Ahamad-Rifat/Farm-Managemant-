import { db } from '@/lib/db';
import { withAuth, getIdFromParams } from '@/lib/middleware/withAuth';
import { parseNullableFloat } from '@/lib/parse';

export const GET = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const expense = await db.otherExpense.findFirst({ where: { id, tenantId } });
  if (!expense) return Response.json({ error: 'Expense not found' }, { status: 404 });

  return Response.json(expense);
});

export const PUT = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();

  let amount: number | undefined;
  if (body.amount !== undefined) {
    const parsedAmount = parseNullableFloat(body.amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    amount = parsedAmount;
  }

  const result = await db.otherExpense.updateMany({
    where: { id, tenantId },
    data: {
      description: body.description,
      amount,
      category: body.category || undefined,
      expenseDate: body.expenseDate ? new Date(body.expenseDate + 'T12:00:00Z') : undefined,
    },
  });

  if (result.count === 0) return Response.json({ error: 'Expense not found' }, { status: 404 });

  const updated = await db.otherExpense.findFirst({ where: { id, tenantId } });
  return Response.json(updated);
});

export const DELETE = withAuth(async (req, { tenantId }, routeContext) => {
  const id = await getIdFromParams(routeContext, req);
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  await db.otherExpense.deleteMany({ where: { id, tenantId } });
  return Response.json({ success: true });
});
