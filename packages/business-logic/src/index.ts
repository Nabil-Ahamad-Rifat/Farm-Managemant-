// Pure, platform-independent business logic shared between apps/web and
// apps/mobile — no DOM/React Native APIs, no network calls.
//
// Extracted from apps/web/src/components/*Manager.tsx, where several of
// these were duplicated verbatim across files (daysAgo in ExpenseManager/
// OtherIncomeManager/SalesManager; the currency formatter in
// OtherIncomeManager/RevenuePortal).

/** Start of a UTC day `days` days ago — days=1 means "today", days=7 means "the last 7 days including today". */
export function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function formatCurrency(amount: number, symbol: string = '৳'): string {
  return symbol + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function sumAmounts(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/** qty × unitPrice, or null if either isn't a valid positive number (mirrors SalesManager's auto-calculated sale amount). */
export function calculateSaleAmount(quantity: unknown, unitPrice: unknown): number | null {
  const qty = parseFloat(String(quantity));
  const price = parseFloat(String(unitPrice));
  if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
    return qty * price;
  }
  return null;
}

export function isLowStock(feed: { quantity: number; remainingQuantity: number }): boolean {
  return feed.remainingQuantity < feed.quantity * 0.2;
}

export function stockPercentage(feed: { quantity: number; remainingQuantity: number }): number {
  return Math.round((feed.remainingQuantity / feed.quantity) * 100);
}

/** Sum of remainingQuantity × unitPrice — current value of unused stock. */
export function totalStockValue(feedBatches: { remainingQuantity: number; unitPrice: number }[]): number {
  return feedBatches.reduce((sum, f) => sum + f.remainingQuantity * f.unitPrice, 0);
}

/** Sum of quantity × unitPrice — total amount originally invested in these batches. */
export function totalBatchCost(feedBatches: { quantity: number; unitPrice: number }[]): number {
  return feedBatches.reduce((sum, f) => sum + f.quantity * f.unitPrice, 0);
}

export function totalActiveMonthlySalary(employees: { status?: string | null; salary: number }[]): number {
  return employees
    .filter((e) => (e.status || 'active') === 'active')
    .reduce((sum, e) => sum + (e.salary ?? 0), 0);
}

/** Proportional bar height in px for a simple two-series bar chart, with a small floor so positive values stay visible. */
export function barHeightPx(value: number, maxValue: number, maxPx: number): number {
  return Math.max((value / maxValue) * maxPx, value > 0 ? 2 : 0);
}
