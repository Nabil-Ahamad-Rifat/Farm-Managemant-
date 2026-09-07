import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

function dayStartUTC(daysBack: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function todayEndUTC(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export const GET = withAuth(async (req, { tenantId }) => {
  const url = new URL(req.url);
  const periodDays = parseInt(url.searchParams.get('period') || '1');

  // Supported periods
  const periods = [1, 3, 5, 7, 15, 30];

  async function getStatsForPeriod(days: number) {
    // "since" = start of (days-1) days ago through end of today
    // e.g. days=1 → today only; days=7 → last 7 days
    const since = dayStartUTC(days - 1);
    const until = todayEndUTC();

    const [salesAgg, activeEmployees, feedUsages, otherExpAgg, otherIncAgg] = await Promise.all([
      // Revenue: sum of paid sales in period
      db.sale.aggregate({
        where: { tenantId, createdAt: { gte: since, lte: until }, status: 'paid' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Active employees — used for prorated salary cost
      db.employee.findMany({
        where: { tenantId, status: 'active' },
        select: { salary: true },
      }),
      // Feed usages in period (cost = quantity × unitPrice)
      db.feedUsage.findMany({
        where: {
          feedBatch: { tenantId },
          usedAt: { gte: since, lte: until },
        },
        include: { feedBatch: { select: { unitPrice: true } } },
      }),
      // Other expenses in period
      db.otherExpense.aggregate({
        where: { tenantId, expenseDate: { gte: since, lte: until } },
        _sum: { amount: true },
      }),
      // Other income in period
      db.otherIncome.aggregate({
        where: { tenantId, incomeDate: { gte: since, lte: until } },
        _sum: { amount: true },
      }),
    ]);

    const totalSales = salesAgg._sum.amount ?? 0;
    const salesCount = salesAgg._count.id;

    // Prorated labour cost: sum of (monthly salary / 30 * days)
    const totalMonthlySalary = activeEmployees.reduce((sum, e) => sum + (e.salary ?? 0), 0);
    const totalSalaryCost = parseFloat(((totalMonthlySalary / 30) * days).toFixed(2));

    // Feed cost = sum of quantity × unitPrice for each usage record
    const totalFeedCost = feedUsages.reduce(
      (sum, u) => sum + u.quantity * u.feedBatch.unitPrice,
      0
    );

    const totalOtherCost = otherExpAgg._sum.amount ?? 0;
    const totalOtherIncome = otherIncAgg._sum.amount ?? 0;

    const totalRevenue = totalSales + totalOtherIncome;
    const totalCost = totalSalaryCost + totalFeedCost + totalOtherCost;
    const netProfit = totalRevenue - totalCost;

    return {
      days,
      totalSales,
      totalOtherIncome,
      totalRevenue,
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
      const dStart = new Date();
      dStart.setUTCDate(dStart.getUTCDate() - i);
      dStart.setUTCHours(0, 0, 0, 0);
      const dEnd = new Date(dStart);
      dEnd.setUTCHours(23, 59, 59, 999);

      const [salesAgg, activeEmployees, feedUsages, otherExpAgg, otherIncAgg] = await Promise.all([
        db.sale.aggregate({
          where: { tenantId, createdAt: { gte: dStart, lte: dEnd }, status: 'paid' },
          _sum: { amount: true },
        }),
        db.employee.findMany({
          where: { tenantId, status: 'active' },
          select: { salary: true },
        }),
        db.feedUsage.findMany({
          where: {
            feedBatch: { tenantId },
            usedAt: { gte: dStart, lte: dEnd },
          },
          include: { feedBatch: { select: { unitPrice: true } } },
        }),
        db.otherExpense.aggregate({
          where: { tenantId, expenseDate: { gte: dStart, lte: dEnd } },
          _sum: { amount: true },
        }),
        db.otherIncome.aggregate({
          where: { tenantId, incomeDate: { gte: dStart, lte: dEnd } },
          _sum: { amount: true },
        }),
      ]);

      const salesRevenue = salesAgg._sum.amount ?? 0;
      const otherIncome = otherIncAgg._sum.amount ?? 0;
      const revenue = salesRevenue + otherIncome;

      const totalMonthlySalary = activeEmployees.reduce((s, e) => s + (e.salary ?? 0), 0);
      const labourCost = parseFloat(((totalMonthlySalary / 30) * 1).toFixed(2));
      const feedCost = feedUsages.reduce((s, u) => s + u.quantity * u.feedBatch.unitPrice, 0);
      const otherCost = otherExpAgg._sum.amount ?? 0;
      const cost = labourCost + feedCost + otherCost;

      breakdown.push({
        date: dStart.toISOString().slice(0, 10),
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
