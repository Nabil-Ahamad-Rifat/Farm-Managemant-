import { describe, it, expect } from 'vitest';
import {
  daysAgo,
  formatCurrency,
  sumAmounts,
  calculateSaleAmount,
  isLowStock,
  stockPercentage,
  totalStockValue,
  totalBatchCost,
  totalActiveMonthlySalary,
  barHeightPx,
  allocatePayments,
  feedSchedule,
  storedFeedRemaining,
  spreadFeedCost,
  monthKey,
  monthBounds,
  shiftMonth,
  monthlyStatement,
  customerMonths,
  type StatementSale,
  type StatementPayment,
} from './index';

describe('daysAgo', () => {
  it('returns the start of today (UTC) for days=1', () => {
    const result = daysAgo(1);
    const now = new Date();
    expect(result.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(result.getUTCMonth()).toBe(now.getUTCMonth());
    expect(result.getUTCDate()).toBe(now.getUTCDate());
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('goes back further in time for larger day counts', () => {
    expect(daysAgo(7).getTime()).toBeLessThan(daysAgo(1).getTime());
    expect(daysAgo(30).getTime()).toBeLessThan(daysAgo(7).getTime());
  });
});

describe('formatCurrency', () => {
  it('defaults to the ৳ symbol with 2 decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('৳1,234.50');
  });

  it('accepts a custom symbol', () => {
    expect(formatCurrency(10, '$')).toBe('$10.00');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('৳0.00');
  });
});

describe('sumAmounts', () => {
  it('sums the amount field across items', () => {
    expect(sumAmounts([{ amount: 10 }, { amount: 5.5 }, { amount: 0 }])).toBe(15.5);
  });

  it('returns 0 for an empty list', () => {
    expect(sumAmounts([])).toBe(0);
  });
});

describe('calculateSaleAmount', () => {
  it('multiplies quantity by unit price', () => {
    expect(calculateSaleAmount('10', '85.5')).toBe(855);
    expect(calculateSaleAmount(10, 85.5)).toBe(855);
  });

  it('returns null when either input is missing, zero, or non-numeric', () => {
    expect(calculateSaleAmount('', '85.5')).toBeNull();
    expect(calculateSaleAmount('10', '')).toBeNull();
    expect(calculateSaleAmount('0', '85.5')).toBeNull();
    expect(calculateSaleAmount('abc', '85.5')).toBeNull();
    expect(calculateSaleAmount('-5', '10')).toBeNull();
  });
});

describe('isLowStock / stockPercentage', () => {
  it('flags stock below 20% remaining as low', () => {
    expect(isLowStock({ quantity: 100, remainingQuantity: 19 })).toBe(true);
    expect(isLowStock({ quantity: 100, remainingQuantity: 20 })).toBe(false);
    expect(isLowStock({ quantity: 100, remainingQuantity: 50 })).toBe(false);
  });

  it('computes remaining percentage rounded to the nearest integer', () => {
    expect(stockPercentage({ quantity: 200, remainingQuantity: 50 })).toBe(25);
    expect(stockPercentage({ quantity: 3, remainingQuantity: 1 })).toBe(33);
  });
});

describe('totalStockValue / totalBatchCost', () => {
  const batches = [
    { quantity: 100, remainingQuantity: 40, unitPrice: 10 },
    { quantity: 50, remainingQuantity: 50, unitPrice: 20 },
  ];

  it('values remaining stock at unit price', () => {
    expect(totalStockValue(batches)).toBe(40 * 10 + 50 * 20);
  });

  it('values total invested cost at unit price', () => {
    expect(totalBatchCost(batches)).toBe(100 * 10 + 50 * 20);
  });
});

describe('totalActiveMonthlySalary', () => {
  it('sums salary only for active employees, treating missing status as active', () => {
    const employees = [
      { status: 'active', salary: 100 },
      { status: 'terminated', salary: 999 },
      { status: undefined, salary: 50 },
    ];
    expect(totalActiveMonthlySalary(employees)).toBe(150);
  });
});

describe('barHeightPx', () => {
  it('scales proportionally to maxValue', () => {
    expect(barHeightPx(50, 100, 200)).toBe(100);
  });

  it('floors positive-but-tiny values to a visible minimum', () => {
    expect(barHeightPx(0.001, 1000, 200)).toBe(2);
  });

  it('renders zero as zero height', () => {
    expect(barHeightPx(0, 100, 200)).toBe(0);
  });
});

describe('allocatePayments', () => {
  const sales = [
    { id: 'b', amount: 500, date: '2026-09-02' },
    { id: 'a', amount: 1000, date: '2026-09-01' },
  ];

  it('marks everything pending when nothing is paid', () => {
    const r = allocatePayments(sales, []);
    expect(r.perSale.map((s) => s.status)).toEqual(['pending', 'pending']);
    expect(r.totalDue).toBe(1500);
    expect(r.advance).toBe(0);
  });

  it('fills the oldest sale first on a partial payment', () => {
    const r = allocatePayments(sales, [{ amount: 400 }]);
    expect(r.perSale).toEqual([
      { id: 'a', paidAmount: 400, status: 'partial' },
      { id: 'b', paidAmount: 0, status: 'pending' },
    ]);
    expect(r.totalDue).toBe(1100);
  });

  it('pools several payments across sales', () => {
    const r = allocatePayments(sales, [{ amount: 600 }, { amount: 600 }]);
    expect(r.perSale).toEqual([
      { id: 'a', paidAmount: 1000, status: 'paid' },
      { id: 'b', paidAmount: 200, status: 'partial' },
    ]);
    expect(r.totalDue).toBe(300);
  });

  it('settles exactly with no advance', () => {
    const r = allocatePayments(sales, [{ amount: 1500 }]);
    expect(r.perSale.every((s) => s.status === 'paid')).toBe(true);
    expect(r.totalDue).toBe(0);
    expect(r.advance).toBe(0);
  });

  it('keeps an overpayment as advance that covers a later sale', () => {
    const before = allocatePayments(sales, [{ amount: 1900 }]);
    expect(before.advance).toBe(400);
    const after = allocatePayments([...sales, { id: 'c', amount: 300, date: '2026-09-03' }], [{ amount: 1900 }]);
    expect(after.perSale.find((s) => s.id === 'c')).toEqual({ id: 'c', paidAmount: 300, status: 'paid' });
    expect(after.advance).toBe(100);
    expect(after.totalDue).toBe(0);
  });

  it('avoids floating point drift', () => {
    const r = allocatePayments([{ id: 'x', amount: 0.3, date: '2026-09-01' }], [{ amount: 0.1 }, { amount: 0.2 }]);
    expect(r.perSale[0].status).toBe('paid');
    expect(r.totalDue).toBe(0);
  });
});

describe('feedSchedule', () => {
  const batch = {
    quantity: 300,
    unitPrice: 10,
    coverDays: 3,
    purchasedAt: '2026-10-01T12:00:00Z',
    remainingQuantity: 300,
  };

  it('returns null for a legacy batch with no days set', () => {
    expect(feedSchedule({ ...batch, coverDays: null })).toBeNull();
  });

  it('splits quantity and cost evenly per day', () => {
    const s = feedSchedule(batch, '2026-10-01T18:00:00Z')!;
    expect(s.perDayQty).toBe(100);
    expect(s.perDayCost).toBe(1000);
    expect(s.startsOn).toBe('2026-10-01');
    expect(s.endsOn).toBe('2026-10-03');
  });

  it('counts the share for today as used', () => {
    const s = feedSchedule(batch, '2026-10-01T06:00:00Z')!;
    expect(s.daysUsed).toBe(1);
    expect(s.remaining).toBe(200);
    expect(s.daysLeft).toBe(2);
    expect(s.runsOutOn).toBe('2026-10-03');
  });

  it('shows the full stock before the purchase date', () => {
    const s = feedSchedule(batch, '2026-09-30T12:00:00Z')!;
    expect(s.daysUsed).toBe(0);
    expect(s.remaining).toBe(300);
    expect(s.daysLeft).toBe(3);
    expect(s.runsOutOn).toBe('2026-10-03');
  });

  it('is empty once all days have passed', () => {
    const s = feedSchedule(batch, '2026-10-09T12:00:00Z')!;
    expect(s.daysUsed).toBe(3);
    expect(s.remaining).toBe(0);
    expect(s.daysLeft).toBe(0);
    expect(s.runsOutOn).toBe('2026-10-03');
  });

  it('runs out sooner after extra recorded use', () => {
    // 120 kg used by hand on top of the schedule: 180 stored, 80 left after day 1.
    const s = feedSchedule({ ...batch, remainingQuantity: 180 }, '2026-10-01T12:00:00Z')!;
    expect(s.remaining).toBe(80);
    expect(s.daysLeft).toBe(0);
    expect(s.runsOutOn).toBe('2026-10-01');
  });

  it('handles a 1-day batch', () => {
    const s = feedSchedule({ ...batch, coverDays: 1 }, '2026-10-01T12:00:00Z')!;
    expect(s.perDayQty).toBe(300);
    expect(s.remaining).toBe(0);
    expect(s.endsOn).toBe('2026-10-01');
  });
});

describe('storedFeedRemaining', () => {
  const batch = { quantity: 300, unitPrice: 10, coverDays: 3, purchasedAt: '2026-10-01T12:00:00Z' };

  it('adds back the scheduled use so far, capped at the quantity bought', () => {
    expect(storedFeedRemaining(batch, 50, '2026-10-02T12:00:00Z')).toBe(250);
    expect(storedFeedRemaining(batch, 150, '2026-10-02T12:00:00Z')).toBe(300);
  });

  it('round-trips with feedSchedule', () => {
    const now = '2026-10-02T12:00:00Z';
    const stored = storedFeedRemaining(batch, 70, now);
    expect(feedSchedule({ ...batch, remainingQuantity: stored }, now)!.remaining).toBe(70);
  });

  it('stores legacy batches as given', () => {
    expect(storedFeedRemaining({ ...batch, coverDays: null }, 42)).toBe(42);
  });
});

describe('spreadFeedCost', () => {
  const b = { quantity: 300, unitPrice: 10, coverDays: 3, purchasedAt: '2026-10-01T12:00:00Z' };

  it('counts one day of a 3-day batch as a third of the cost', () => {
    expect(spreadFeedCost([b], '2026-10-02T00:00:00Z', '2026-10-02T23:59:59Z')).toBe(1000);
  });

  it('counts only the days that overlap the period', () => {
    expect(spreadFeedCost([b], '2026-10-03T00:00:00Z', '2026-10-10T00:00:00Z')).toBe(1000);
    expect(spreadFeedCost([b], '2026-09-25T00:00:00Z', '2026-10-02T00:00:00Z')).toBe(2000);
  });

  it('counts the whole cost for a period covering the batch', () => {
    expect(spreadFeedCost([b], '2026-09-01T00:00:00Z', '2026-10-31T00:00:00Z')).toBe(3000);
  });

  it('counts nothing for a batch that ended before the period', () => {
    expect(spreadFeedCost([b], '2026-10-04T00:00:00Z', '2026-10-05T00:00:00Z')).toBe(0);
  });

  it('handles a 1-day batch and skips legacy ones', () => {
    const oneDay = { ...b, coverDays: 1 };
    const legacy = { ...b, coverDays: null };
    expect(spreadFeedCost([oneDay, legacy], '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')).toBe(3000);
  });

  it('rounds uneven splits to paisa', () => {
    const uneven = { quantity: 1, unitPrice: 1000, coverDays: 3, purchasedAt: '2026-10-01T12:00:00Z' };
    expect(spreadFeedCost([uneven], '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')).toBe(333.33);
    expect(spreadFeedCost([uneven], '2026-10-01T00:00:00Z', '2026-10-03T00:00:00Z')).toBe(1000);
  });
});

describe('month helpers', () => {
  it('monthKey uses UTC', () => {
    expect(monthKey('2026-10-31T23:30:00Z')).toBe('2026-10');
    expect(monthKey('2026-11-01T00:00:00Z')).toBe('2026-11');
  });

  it('shiftMonth crosses year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('monthBounds covers the whole month', () => {
    const { start, end } = monthBounds('2026-02');
    expect(start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });
});

describe('monthlyStatement', () => {
  const sale = (partyId: string | null, amount: number, date: string, extra: Partial<StatementSale> = {}): StatementSale => ({ partyId, amount, date, saleType: 'milk', quantity: amount / 70, ...extra });
  const pay = (partyId: string, amount: number, date: string): StatementPayment => ({ partyId, amount, date });

  const sales = [
    sale('karim', 1000, '2026-09-10T12:00:00Z', { quantity: 10 }),
    sale('karim', 500, '2026-10-05T12:00:00Z', { quantity: 5 }),
    sale('rahim', 200, '2026-10-06T12:00:00Z', { saleType: 'other', quantity: 1 }),
  ];
  const payments = [
    pay('karim', 400, '2026-09-10T12:00:00Z'),
    pay('karim', 300, '2026-10-20T12:00:00Z'),
    pay('selim', 100, '2026-08-01T12:00:00Z'),
  ];

  it('carries the due from earlier months', () => {
    const st = monthlyStatement(sales, payments, '2026-10');
    const karim = st.lines.find((l) => l.partyId === 'karim');
    expect(karim).toMatchObject({ carriedIn: 600, sold: 500, paid: 300, closing: 800, milkLitres: 5, salesCount: 1, paymentsCount: 1 });
  });

  it('counts the earlier month on its own', () => {
    const karim = monthlyStatement(sales, payments, '2026-09').lines.find((l) => l.partyId === 'karim');
    expect(karim).toMatchObject({ carriedIn: 0, sold: 1000, paid: 400, closing: 600, milkLitres: 10 });
  });

  it('counts milk litres only for milk sales', () => {
    const st = monthlyStatement(sales, payments, '2026-10');
    expect(st.lines.find((l) => l.partyId === 'rahim')!.milkLitres).toBe(0);
    expect(st.totals.milkLitres).toBe(5);
  });

  it('keeps an advance as a negative balance that does not offset other dues', () => {
    const st = monthlyStatement(sales, payments, '2026-10');
    const selim = st.lines.find((l) => l.partyId === 'selim');
    expect(selim).toMatchObject({ carriedIn: -100, closing: -100, sold: 0, paid: 0 });
    expect(st.totals).toMatchObject({ sold: 700, collected: 300, carriedIn: 600, dueAtEnd: 1000, advanceAtEnd: 100 });
  });

  it('drops parties with no activity and a zero balance', () => {
    const st = monthlyStatement([sale('old', 100, '2026-01-01T12:00:00Z')], [pay('old', 100, '2026-01-02T12:00:00Z')], '2026-10');
    expect(st.lines).toHaveLength(0);
  });

  it('a payment in a later month clears the due then', () => {
    const s = [sale('k', 900, '2026-09-30T12:00:00Z')];
    const p = [pay('k', 900, '2026-10-01T12:00:00Z')];
    expect(monthlyStatement(s, p, '2026-09').lines[0].closing).toBe(900);
    expect(monthlyStatement(s, p, '2026-10').lines[0]).toMatchObject({ carriedIn: 900, paid: 900, closing: 0 });
  });

  it('treats legacy customer-less sales marked paid as paid on the sale date', () => {
    const s = [
      sale(null, 300, '2026-10-02T12:00:00Z', { status: 'paid' }),
      sale(null, 200, '2026-10-03T12:00:00Z', { status: 'pending' }),
      sale(null, 50, '2026-09-03T12:00:00Z', { status: 'pending' }),
    ];
    const none = monthlyStatement(s, [], '2026-10').lines.find((l) => l.partyId === null);
    expect(none).toMatchObject({ carriedIn: 50, sold: 500, paid: 300, closing: 250 });
  });

  it('sorts lines with the most owed first', () => {
    const st = monthlyStatement(sales, payments, '2026-10');
    expect(st.lines.map((l) => l.partyId)).toEqual(['karim', 'rahim', 'selim']);
  });
});

describe('customerMonths', () => {
  it('lists months with activity newest first, with a running closing balance', () => {
    const months = customerMonths(
      [
        { partyId: 'k', amount: 1000, date: '2026-08-10T12:00:00Z', saleType: 'milk', quantity: 10 },
        { partyId: 'k', amount: 500, date: '2026-10-05T12:00:00Z', saleType: 'milk', quantity: 5 },
      ],
      [{ partyId: 'k', amount: 400, date: '2026-08-11T12:00:00Z' }],
    );
    expect(months).toEqual([
      { month: '2026-10', milkLitres: 5, sold: 500, paid: 0, closing: 1100 },
      { month: '2026-08', milkLitres: 10, sold: 1000, paid: 400, closing: 600 },
    ]);
  });
});
