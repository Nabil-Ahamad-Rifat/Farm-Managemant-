import { db } from '@/lib/db';
import { entryDay } from '@/lib/days';
import { withAuth } from '@/lib/middleware/withAuth';
import { withIdempotency } from '@/lib/idempotency';

// GET /api/income - list all other income records for the tenant
export const GET = withAuth(async (_req, { tenantId }) => {
  try {
    const incomes = await db.otherIncome.findMany({
      where: { tenantId },
      orderBy: { incomeDate: 'desc' },
    });
    return Response.json(incomes);
  } catch (err: unknown) {
    console.error('Error handling income request:', err);
    return Response.json({ error: 'Failed to process income record' }, { status: 500 });
  }
});

// POST /api/income - create a new other income record
export const POST = withAuth(async (req, { tenantId, userId }) => withIdempotency(req, tenantId, 'income:create', async () => {
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

    const day = entryDay(incomeDate);
    if ('error' in day) return Response.json({ error: day.error }, { status: 400 });

    const income = await db.otherIncome.create({
      data: { createdById: userId,
        description,
        amount: parsedAmount,
        category: category || 'other',
        incomeDate: day.date,
        tenantId,
      },
    });

    return Response.json(income, { status: 201 });
  } catch (err: unknown) {
    console.error('Error handling income request:', err);
    return Response.json({ error: 'Failed to process income record' }, { status: 500 });
  }
}));
