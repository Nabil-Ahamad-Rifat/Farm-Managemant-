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

export type SalePaymentStatus = 'paid' | 'partial' | 'pending';

export interface AllocationResult {
  perSale: { id: string; paidAmount: number; status: SalePaymentStatus }[];
  totalSold: number;
  totalPaid: number;
  /** What the customer still owes (0 if they are in credit). */
  totalDue: number;
  /** Money paid beyond everything sold — credit that covers future sales. */
  advance: number;
}

const toPaisa = (taka: number) => Math.round(taka * 100);
const toTaka = (paisa: number) => paisa / 100;

/**
 * Apply a customer's payments to their sales, oldest sale first. Payments are
 * pooled (a lump sum settles several sales), so only their total matters.
 * Pure and deterministic — the server re-runs it from scratch after every
 * change to a customer's sales or payments instead of patching balances.
 * Works in whole paisa so repeated recomputes never drift.
 */
export function allocatePayments(
  sales: { id: string; amount: number; date: Date | string }[],
  payments: { amount: number }[],
): AllocationResult {
  const ordered = [...sales].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  const paidPaisa = payments.reduce((sum, p) => sum + Math.max(0, toPaisa(p.amount)), 0);
  let pool = paidPaisa;
  let soldPaisa = 0;

  const perSale = ordered.map((sale) => {
    const amount = Math.max(0, toPaisa(sale.amount));
    soldPaisa += amount;
    const applied = Math.min(amount, pool);
    pool -= applied;
    const status: SalePaymentStatus = applied >= amount ? 'paid' : applied > 0 ? 'partial' : 'pending';
    return { id: sale.id, paidAmount: toTaka(applied), status };
  });

  return {
    perSale,
    totalSold: toTaka(soldPaisa),
    totalPaid: toTaka(paidPaisa),
    totalDue: toTaka(Math.max(0, soldPaisa - paidPaisa)),
    advance: toTaka(pool),
  };
}

// ---------------------------------------------------------------------------
// Feed purchases that last a set number of days.
//
// A scheduled purchase (coverDays set) is used up evenly: quantity ÷ days per
// day, and its cost counts as total ÷ days on each covered day. Days are UTC
// calendar days, the purchase day being day 1. Legacy batches (no coverDays)
// keep usage-based cost and are not handled here.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** Whole UTC days since the epoch — the calendar day a timestamp falls on. */
export function utcDayIndex(d: Date | string): number {
  const t = new Date(d);
  return Math.floor(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) / DAY_MS);
}

const dayIndexToIso = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ScheduledFeed {
  quantity: number;
  unitPrice: number;
  coverDays?: number | null;
  purchasedAt?: Date | string | null;
  createdAt?: Date | string | null;
}

export interface FeedSchedule {
  coverDays: number;
  perDayQty: number;
  perDayCost: number;
  /** First and last covered day, YYYY-MM-DD. */
  startsOn: string;
  endsOn: string;
  /** Covered days up to and including today (0 before it starts, coverDays once over). */
  daysUsed: number;
  /** Full days of feed left after today, limited by the stock actually left. */
  daysLeft: number;
  /** Stock left now, after the daily use so far and any extra recorded use. */
  remaining: number;
  /** Last day this batch is expected to last, YYYY-MM-DD. */
  runsOutOn: string;
}

const startDayOf = (b: ScheduledFeed) => utcDayIndex(b.purchasedAt ?? b.createdAt ?? new Date());

export function isScheduledFeed(b: ScheduledFeed): b is ScheduledFeed & { coverDays: number } {
  return typeof b.coverDays === 'number' && b.coverDays > 0;
}

function daysUsedAt(b: ScheduledFeed & { coverDays: number }, now: Date | string) {
  return Math.min(b.coverDays, Math.max(0, utcDayIndex(now) - startDayOf(b) + 1));
}

/**
 * Where a scheduled batch stands today. `remainingQuantity` is the value as
 * saved, which only goes down for extra (manual) use — the daily use is
 * worked out here from the date. Null for legacy batches.
 */
export function feedSchedule(
  b: ScheduledFeed & { remainingQuantity: number },
  now: Date | string = new Date(),
): FeedSchedule | null {
  if (!isScheduledFeed(b)) return null;
  const start = startDayOf(b);
  const end = start + b.coverDays - 1;
  const today = utcDayIndex(now);
  const perDayQty = b.quantity / b.coverDays;
  const daysUsed = daysUsedAt(b, now);
  const remaining = Math.max(0, round2(b.remainingQuantity - perDayQty * daysUsed));
  // Tiny epsilon so 200 kg at 100 kg/day is 2 days, not 1.9999.
  const daysByStock = perDayQty > 0 ? Math.floor(remaining / perDayQty + 1e-9) : 0;
  const daysLeft = Math.min(b.coverDays - daysUsed, daysByStock);
  const lastDay = daysUsed === 0 ? start + Math.min(b.coverDays, daysByStock) - 1 : today + daysLeft;

  return {
    coverDays: b.coverDays,
    perDayQty: round2(perDayQty),
    perDayCost: round2((b.quantity * b.unitPrice) / b.coverDays),
    startsOn: dayIndexToIso(start),
    endsOn: dayIndexToIso(end),
    daysUsed,
    daysLeft,
    remaining,
    runsOutOn: dayIndexToIso(Math.min(end, Math.max(start, lastDay))),
  };
}

/**
 * The value to save as remainingQuantity when a user sets the stock left
 * *now* to `currentRemaining` — the inverse of feedSchedule's `remaining`.
 * Legacy batches store it as is.
 */
export function storedFeedRemaining(
  b: ScheduledFeed,
  currentRemaining: number,
  now: Date | string = new Date(),
): number {
  if (!isScheduledFeed(b)) return currentRemaining;
  return round2(Math.min(b.quantity, currentRemaining + (b.quantity / b.coverDays) * daysUsedAt(b, now)));
}

// ---------------------------------------------------------------------------
// Monthly statements (customers / dues).
//
// Months are UTC calendar months; sales and payments are stored at noon UTC
// of their day, so a day never slips into the neighbouring month. Each
// party's balance is carried from month to month:
//   month end = carried in + sold this month − paid this month
// Negative means the party paid in advance. Legacy sales with no customer
// (partyId null) are one party; one marked paid counts as paid on its date.
// ---------------------------------------------------------------------------

/** "YYYY-MM" (UTC) of a date. */
export function monthKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 7);
}

/** "YYYY-MM" moved by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(Date.UTC(y, m - 1 + delta, 1)));
}

/** First and last instant of a "YYYY-MM" month, UTC. */
export function monthBounds(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1) - 1) };
}

export interface StatementSale {
  /** Customer id, or null for a legacy sale with no customer. */
  partyId: string | null;
  amount: number;
  date: Date | string;
  saleType: string;
  quantity?: number | null;
  /** Only read for legacy (partyId null) sales: "paid" means paid on the sale date. */
  status?: string | null;
}

export interface StatementPayment {
  partyId: string;
  amount: number;
  date: Date | string;
}

export interface MonthLine {
  partyId: string | null;
  milkLitres: number;
  sold: number;
  paid: number;
  /** Balance at the start of the month; negative is advance. */
  carriedIn: number;
  /** Balance at the end of the month; negative is advance. */
  closing: number;
  salesCount: number;
  paymentsCount: number;
}

export interface MonthStatement {
  month: string;
  lines: MonthLine[];
  totals: {
    milkLitres: number;
    sold: number;
    collected: number;
    /** Dues carried in (advances not netted off). */
    carriedIn: number;
    /** What is owed at month end: sum of positive closing balances. */
    dueAtEnd: number;
    advanceAtEnd: number;
  };
}

export interface MonthSummary {
  month: string;
  milkLitres: number;
  sold: number;
  paid: number;
  closing: number;
}

type Entry = { partyId: string | null; date: Date | string; amount: number; kind: 'sale' | 'payment'; litres: number };

/** Sales and payments as one list; legacy paid sales also become a payment on the same day. */
function toEntries(sales: StatementSale[], payments: StatementPayment[]): Entry[] {
  const entries: Entry[] = [];
  for (const s of sales) {
    const litres = s.saleType === 'milk' ? s.quantity ?? 0 : 0;
    entries.push({ partyId: s.partyId, date: s.date, amount: s.amount, kind: 'sale', litres });
    if (s.partyId === null && s.status === 'paid') {
      entries.push({ partyId: null, date: s.date, amount: s.amount, kind: 'payment', litres: 0 });
    }
  }
  for (const p of payments) entries.push({ partyId: p.partyId, date: p.date, amount: p.amount, kind: 'payment', litres: 0 });
  return entries;
}

/** One month's statement for every party that bought, paid, or carried a balance into it. */
export function monthlyStatement(sales: StatementSale[], payments: StatementPayment[], month: string): MonthStatement {
  type Acc = { carried: number; sold: number; paid: number; litres: number; salesCount: number; paymentsCount: number };
  const byParty = new Map<string | null, Acc>();
  const acc = (id: string | null) => {
    let a = byParty.get(id);
    if (!a) byParty.set(id, (a = { carried: 0, sold: 0, paid: 0, litres: 0, salesCount: 0, paymentsCount: 0 }));
    return a;
  };

  for (const e of toEntries(sales, payments)) {
    const key = monthKey(e.date);
    if (key > month) continue;
    const a = acc(e.partyId);
    const paisa = toPaisa(e.amount);
    if (key < month) {
      a.carried += e.kind === 'sale' ? paisa : -paisa;
    } else if (e.kind === 'sale') {
      a.sold += paisa;
      a.litres += e.litres;
      a.salesCount += 1;
    } else {
      a.paid += paisa;
      a.paymentsCount += 1;
    }
  }

  const lines: MonthLine[] = [];
  for (const [partyId, a] of byParty) {
    if (a.salesCount === 0 && a.paymentsCount === 0 && a.carried === 0) continue;
    lines.push({
      partyId,
      milkLitres: round2(a.litres),
      sold: toTaka(a.sold),
      paid: toTaka(a.paid),
      carriedIn: toTaka(a.carried),
      closing: toTaka(a.carried + a.sold - a.paid),
      salesCount: a.salesCount,
      paymentsCount: a.paymentsCount,
    });
  }
  lines.sort((x, y) => y.closing - x.closing);

  const sum = (f: (l: MonthLine) => number) => round2(lines.reduce((s, l) => s + f(l), 0));
  return {
    month,
    lines,
    totals: {
      milkLitres: sum((l) => l.milkLitres),
      sold: sum((l) => l.sold),
      collected: sum((l) => l.paid),
      carriedIn: sum((l) => Math.max(0, l.carriedIn)),
      dueAtEnd: sum((l) => Math.max(0, l.closing)),
      advanceAtEnd: sum((l) => Math.max(0, -l.closing)),
    },
  };
}

/** One party's months that had a sale or payment, newest first, each with its running month-end balance. */
export function customerMonths(sales: StatementSale[], payments: StatementPayment[]): MonthSummary[] {
  const months = new Map<string, { litres: number; sold: number; paid: number }>();
  for (const e of toEntries(sales, payments)) {
    const key = monthKey(e.date);
    const m = months.get(key) ?? { litres: 0, sold: 0, paid: 0 };
    if (e.kind === 'sale') {
      m.sold += toPaisa(e.amount);
      m.litres += e.litres;
    } else {
      m.paid += toPaisa(e.amount);
    }
    months.set(key, m);
  }

  let balance = 0;
  const ascending = [...months.keys()].sort().map((month) => {
    const m = months.get(month)!;
    balance += m.sold - m.paid;
    return { month, milkLitres: round2(m.litres), sold: toTaka(m.sold), paid: toTaka(m.paid), closing: toTaka(balance) };
  });
  return ascending.reverse();
}

/**
 * Feed cost of scheduled batches that falls in [from, to] (whole UTC days,
 * both ends included): each batch adds total ÷ days for every covered day in
 * the range. Legacy batches are skipped — their cost comes from usage records.
 */
export function spreadFeedCost(batches: ScheduledFeed[], from: Date | string, to: Date | string): number {
  const first = utcDayIndex(from);
  const last = utcDayIndex(to);
  let total = 0;
  for (const b of batches) {
    if (!isScheduledFeed(b)) continue;
    const start = startDayOf(b);
    const end = start + b.coverDays - 1;
    const overlap = Math.min(end, last) - Math.max(start, first) + 1;
    if (overlap > 0) total += ((b.quantity * b.unitPrice) / b.coverDays) * overlap;
  }
  return round2(total);
}
