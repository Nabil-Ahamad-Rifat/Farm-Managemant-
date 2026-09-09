import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { parseNullableFloat } from '@/lib/parse';

export const GET = withAuth(async (_req, { tenantId }) => {
  const expenses = await db.otherExpense.findMany({
    where: { tenantId },
    orderBy: { expenseDate: 'desc' },
  });
  return Response.json(expenses);
});

export const POST = withAuth(async (req, { tenantId }) => {
  const body = await req.json();
  const { description, amount, category, expenseDate } = body;

  const parsedAmount = parseNullableFloat(amount);
  if (!description || parsedAmount === null || parsedAmount <= 0) {
    return Response.json({ error: 'Description and a valid positive amount are required' }, { status: 400 });
  }

  const expense = await db.otherExpense.create({
    data: {
      description,
      amount: parsedAmount,
      category: category || 'other',
      expenseDate: expenseDate ? new Date(expenseDate + 'T12:00:00Z') : new Date(),
      tenantId,
    },
  });

  return Response.json(expense, { status: 201 });
});
