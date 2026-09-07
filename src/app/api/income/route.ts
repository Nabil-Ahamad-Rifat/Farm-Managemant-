import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

// GET /api/income - list all other income records for the tenant
export const GET = withAuth(async (_req, { tenantId }) => {
  try {
    const incomes = await db.otherIncome.findMany({
      where: { tenantId },
      orderBy: { incomeDate: 'desc' },
    });
    return Response.json(incomes);
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});

// POST /api/income - create a new other income record
export const POST = withAuth(async (req, { tenantId }) => {
  try {
    const body = await req.json();
    const { description, amount, category, incomeDate } = body;

    if (!description || amount === undefined || amount === null || amount === '') {
      return Response.json({ error: 'Description and amount are required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const income = await db.otherIncome.create({
      data: {
        description,
        amount: parsedAmount,
        category: category || 'other',
        incomeDate: incomeDate ? new Date(incomeDate + 'T12:00:00Z') : new Date(),
        tenantId,
      },
    });

    return Response.json(income, { status: 201 });
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
