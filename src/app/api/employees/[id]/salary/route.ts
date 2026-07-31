import { db } from '@/lib/db';
import { withAuth, getIdFromParams } from '@/lib/middleware/withAuth';

// GET /api/employees/[id]/salary - list payments for employee
export const GET = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const employeeId = await getIdFromParams(routeContext, req);
    if (!employeeId) return Response.json({ error: 'Missing employee id' }, { status: 400 });

    const employee = await db.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

    const payments = await db.salaryPayment.findMany({
      where: { employeeId },
      orderBy: { paidAt: 'desc' },
    });

    return Response.json(payments);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});

// POST /api/employees/[id]/salary - record a salary payment
export const POST = withAuth(async (req, { tenantId }, routeContext) => {
  try {
    const employeeId = await getIdFromParams(routeContext, req);
    if (!employeeId) return Response.json({ error: 'Missing employee id' }, { status: 400 });

    const employee = await db.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

    const body = await req.json();
    const { amount, periodMonth, periodYear, note, paidAt } = body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Response.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    const payment = await db.salaryPayment.create({
      data: {
        employeeId,
        amount: parsedAmount,
        periodMonth: parseInt(periodMonth) || (new Date().getMonth() + 1),
        periodYear: parseInt(periodYear) || new Date().getFullYear(),
        note: note || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    });

    return Response.json(payment, { status: 201 });
  } catch (err: any) {
    console.error('Error creating salary payment:', err);
    return Response.json({ error: err.message || 'Failed to record salary payment' }, { status: 500 });
  }
});
