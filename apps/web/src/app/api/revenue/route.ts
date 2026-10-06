import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { collectedBetween, totalReceivable } from '@/lib/receivables';
import { totalPayable } from '@/lib/payables';
import { feedCostBetween } from '@/lib/feed-cost';

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

    const [totalSales, salesCount, activeEmployees, totalFeedCost, otherExpAgg, otherIncAgg] = await Promise.all([
      // Revenue: money actually collected in the period (payments + legacy paid sales)
      collectedBetween(tenantId, since, until),
      db.sale.count({ where: { tenantId, createdAt: { gte: since, lte: until } } }),
      // Active employees — used for prorated salary cost
      db.employee.findMany({
        where: { tenantId, status: 'active' },
        select: { salary: true },
      }),
      // Feed: purchases spread evenly over their days, plus usage of older batches
      feedCostBetween(tenantId, since, until),
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


    // Prorated labour cost: sum of (monthly salary / 30 * days)
    const totalMonthlySalary = activeEmployees.reduce((sum, e) => sum + (e.salary ?? 0), 0);
    const totalSalaryCost = parseFloat(((totalMonthlySalary / 30) * days).toFixed(2));

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

      const [salesRevenue, activeEmployees, feedCost, otherExpAgg, otherIncAgg] = await Promise.all([
        collectedBetween(tenantId, dStart, dEnd),
        db.employee.findMany({
          where: { tenantId, status: 'active' },
          select: { salary: true },
        }),
        feedCostBetween(tenantId, dStart, dEnd),
        db.otherExpense.aggregate({
          where: { tenantId, expenseDate: { gte: dStart, lte: dEnd } },
          _sum: { amount: true },
        }),
        db.otherIncome.aggregate({
          where: { tenantId, incomeDate: { gte: dStart, lte: dEnd } },
          _sum: { amount: true },
        }),
      ]);

      const otherIncome = otherIncAgg._sum.amount ?? 0;
      const revenue = salesRevenue + otherIncome;

      const totalMonthlySalary = activeEmployees.reduce((s, e) => s + (e.salary ?? 0), 0);
      const labourCost = parseFloat(((totalMonthlySalary / 30) * 1).toFixed(2));
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

  const [allPeriodStats, dailyBreakdown, totalDue, payable] = await Promise.all([
    Promise.all(periods.map(getStatsForPeriod)),
    getDailyBreakdown(periodDays),
    totalReceivable(tenantId),
    totalPayable(tenantId),
  ]);

  return Response.json({
    periods: allPeriodStats,
    dailyBreakdown,
    totalDue,
    totalPayable: payable,
  });
});
