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
