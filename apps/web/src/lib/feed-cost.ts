import { spreadFeedCost } from '@farm/business-logic';
import { db } from '@/lib/db';

/**
 * Feed cost for profit in [from, to]:
 * - scheduled purchases count total ÷ days on each covered day;
 * - older batches (no days set) count usage records × price, as before.
 * Usage records on scheduled batches only move stock, so they add no cost here.
 */
export async function feedCostBetween(tenantId: string, from: Date, to: Date) {
  const [scheduled, usages] = await Promise.all([
    db.feedBatch.findMany({
      where: { tenantId, coverDays: { gt: 0 } },
      select: { quantity: true, unitPrice: true, coverDays: true, purchasedAt: true, createdAt: true },
    }),
    db.feedUsage.findMany({
      where: { feedBatch: { tenantId }, usedAt: { gte: from, lte: to } },
      select: { quantity: true, feedBatch: { select: { unitPrice: true, coverDays: true } } },
    }),
  ]);

  const legacyCost = usages
    .filter((u) => !(u.feedBatch.coverDays && u.feedBatch.coverDays > 0))
    .reduce((sum, u) => sum + u.quantity * u.feedBatch.unitPrice, 0);

  return Math.round((spreadFeedCost(scheduled, from, to) + legacyCost) * 100) / 100;
}
