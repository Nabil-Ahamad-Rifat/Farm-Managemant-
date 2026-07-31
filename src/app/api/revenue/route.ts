import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const GET = withAuth(async (req, { tenantId }) => {
  const url = new URL(req.url);
  const periodDays = parseInt(url.searchParams.get('period') || '30');

  // Compute per-period stats for each window
  const periods = [1, 4, 8, 15, 30];

  async function getStatsForPeriod(days: number) {
    const since = daysAgo(days);

    const [salesAgg, salaryPayments, feedBatches, otherExpenses] = await Promise.all([
      // Total sales revenue in period
      db.sale.aggregate({
        where: { tenantId, createdAt: { gte: since }, status: 'paid' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Salary costs paid in period
      (db as any).salaryPayment
        ? (db as any).salaryPayment.findMany({
            where: {
              employee: { tenantId },
              paidAt: { gte: since },
            },
            select: { amount: true },
          })
        : Promise.resolve([]),
      // Feed usages
      (db as any).feedUsage
        ? (db as any).feedUsage.findMany({
            where: {
              feedBatch: { tenantId },
              usedAt: { gte: since },
            },
            include: { feedBatch: { select: { unitPrice: true } } },
          })
        : Promise.resolve([]),
      // Other expenses in period
      (db as any).otherExpense
        ? (db as any).otherExpense.aggregate({
            where: { tenantId, expenseDate: { gte: since } },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
    ]);

    const totalSales = salesAgg._sum.amount ?? 0;
    const salesCount = salesAgg._count.id;
    const totalSalaryCost = (salaryPayments as any[]).reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalFeedCost = (feedBatches as any[]).reduce((sum: number, u: any) => sum + u.quantity * u.feedBatch.unitPrice, 0);
    const totalOtherCost = otherExpenses._sum.amount ?? 0;
    const totalCost = totalSalaryCost + totalFeedCost + totalOtherCost;
    const netProfit = totalSales - totalCost;

    return {
      days,
      totalSales,
      salesCount,
      totalSalaryCost,
      totalFeedCost,
      totalOtherCost,
      totalCost,
      netProfit,
    };
  }

  // Daily breakdown for chart (last `periodDays` days)
  async function getDailyBreakdown(days: number) {
    const breakdown = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [salesAgg, salaryAgg, feedUsages, otherAgg] = await Promise.all([
        db.sale.aggregate({
          where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd }, status: 'paid' },
          _sum: { amount: true },
        }),
        (db as any).salaryPayment
          ? (db as any).salaryPayment.findMany({
              where: { employee: { tenantId }, paidAt: { gte: dayStart, lte: dayEnd } },
              select: { amount: true },
            })
          : Promise.resolve([]),
        (db as any).feedUsage
          ? (db as any).feedUsage.findMany({
              where: { feedBatch: { tenantId }, usedAt: { gte: dayStart, lte: dayEnd } },
              include: { feedBatch: { select: { unitPrice: true } } },
            })
          : Promise.resolve([]),
        (db as any).otherExpense
          ? (db as any).otherExpense.aggregate({
              where: { tenantId, expenseDate: { gte: dayStart, lte: dayEnd } },
              _sum: { amount: true },
            })
          : Promise.resolve({ _sum: { amount: 0 } }),
      ]);

      const revenue = salesAgg._sum.amount ?? 0;
      const cost =
        (salaryAgg as any[]).reduce((s: number, p: any) => s + p.amount, 0) +
        (feedUsages as any[]).reduce((s: number, u: any) => s + u.quantity * u.feedBatch.unitPrice, 0) +
        (otherAgg._sum.amount ?? 0);

      breakdown.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue,
        cost,
        profit: revenue - cost,
      });
    }
    return breakdown;
  }

  const [allPeriodStats, dailyBreakdown] = await Promise.all([
    Promise.all(periods.map(getStatsForPeriod)),
    getDailyBreakdown(periodDays),
  ]);

  return Response.json({
    periods: allPeriodStats,
    dailyBreakdown,
  });
});
