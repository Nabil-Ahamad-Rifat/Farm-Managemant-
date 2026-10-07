import { describe, it, expect } from 'vitest';
import {
  loginSchema, registerSchema, forgotPasswordSchema, customerSchema, paymentSchema, saleSchema, supplierSchema, feedPurchaseSchema, farmSettingsSchema, animalSchema, animalEventSchema,
} from './index';

describe('loginSchema', () => {
  it('accepts a valid email/password and normalizes the email', () => {
    const result = loginSchema.parse({ email: '  Owner@Farm.com  ', password: 'secret' });
    expect(result.email).toBe('owner@farm.com');
    expect(result.password).toBe('secret');
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'owner@farm.com', password: '' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts a valid registration without a tenant name', () => {
    const result = registerSchema.safeParse({ name: 'Karim', email: 'karim@farm.com', password: 'longenough' });
    expect(result.success).toBe(true);
  });

  it('accepts an optional tenant name', () => {
    const result = registerSchema.safeParse({
      name: 'Karim',
      email: 'karim@farm.com',
      password: 'longenough',
      tenantName: "Karim's Farm",
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(registerSchema.safeParse({ name: 'Karim', email: 'karim@farm.com', password: 'short' }).success).toBe(false);
  });

  it('rejects a missing name', () => {
    expect(registerSchema.safeParse({ name: '', email: 'karim@farm.com', password: 'longenough' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts and normalizes a valid email', () => {
    const result = forgotPasswordSchema.parse({ email: '  Karim@Farm.com ' });
    expect(result.email).toBe('karim@farm.com');
  });

  it('rejects an invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('customerSchema', () => {
  it('defaults the type to new and drops blank optional fields', () => {
    const c = customerSchema.parse({ name: '  Karim ', phone: '' });
    expect(c).toEqual({ name: 'Karim', type: 'new' });
  });

  it('rejects a missing name and an unknown type', () => {
    expect(customerSchema.safeParse({ name: ' ' }).success).toBe(false);
    expect(customerSchema.safeParse({ name: 'A', type: 'vip' }).success).toBe(false);
  });
});

describe('paymentSchema', () => {
  it('coerces string amounts from form inputs', () => {
    expect(paymentSchema.parse({ amount: '500', paidAt: '2026-09-30' })).toEqual({
      amount: 500,
      method: 'cash',
      paidAt: '2026-09-30',
    });
  });

  it('rejects zero, negative and malformed dates', () => {
    expect(paymentSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(paymentSchema.safeParse({ amount: -5 }).success).toBe(false);
    expect(paymentSchema.safeParse({ amount: 5, paidAt: '30/09/2026' }).success).toBe(false);
  });
});

describe('saleSchema', () => {
  it('accepts the legacy mobile payload (customerName + status)', () => {
    const s = saleSchema.parse({ customerName: 'Rahim', amount: '850', status: 'paid', saleType: 'milk', cowId: '' });
    expect(s).toMatchObject({ customerName: 'Rahim', amount: 850, status: 'paid', saleType: 'milk' });
    expect(s.cowId).toBeUndefined();
  });

  it('requires a customer', () => {
    expect(saleSchema.safeParse({ amount: 100 }).success).toBe(false);
  });

  it('rejects paying more than the sale amount up front', () => {
    expect(saleSchema.safeParse({ customerId: 'x', amount: 100, paidNow: 150 }).success).toBe(false);
    expect(saleSchema.safeParse({ customerId: 'x', amount: 100, paidNow: 40 }).success).toBe(true);
  });
});

describe('supplierSchema', () => {
  it('accepts a name and turns blank optional fields into undefined', () => {
    const r = supplierSchema.parse({ name: '  Rahim Feed Store ', phone: '', address: 'Bazaar' });
    expect(r).toEqual({ name: 'Rahim Feed Store', address: 'Bazaar' });
  });

  it('rejects a missing name', () => {
    expect(supplierSchema.safeParse({ name: ' ' }).success).toBe(false);
  });
});

describe('feedPurchaseSchema', () => {
  it('accepts the old mobile payload with strings', () => {
    const r = feedPurchaseSchema.parse({ name: 'Bushi', quantity: '500', unitPrice: '35', remainingQuantity: '' });
    expect(r).toMatchObject({ name: 'Bushi', quantity: 500, unitPrice: 35 });
    expect(r.remainingQuantity).toBeUndefined();
    expect(r.coverDays).toBeUndefined();
  });

  it('accepts a scheduled baki purchase with a supplier', () => {
    const r = feedPurchaseSchema.parse({
      name: 'Bushi', quantity: 300, unitPrice: 10, coverDays: '3', purchasedAt: '2026-10-01', paidNow: 0, supplierName: 'Rahim',
    });
    expect(r.coverDays).toBe(3);
    expect(r.paidNow).toBe(0);
  });

  it('requires a supplier when not fully paid', () => {
    const r = feedPurchaseSchema.safeParse({ name: 'Bushi', quantity: 300, unitPrice: 10, paidNow: 1000 });
    expect(r.success).toBe(false);
  });

  it('does not need a supplier when fully paid', () => {
    expect(feedPurchaseSchema.safeParse({ name: 'Bushi', quantity: 300, unitPrice: 10, paidNow: 3000 }).success).toBe(true);
  });

  it('rejects paying more than the total', () => {
    expect(feedPurchaseSchema.safeParse({ name: 'Bushi', quantity: 300, unitPrice: 10, paidNow: 3001, supplierName: 'R' }).success).toBe(false);
  });

  it('rejects zero quantity, fractional days and remaining above quantity', () => {
    expect(feedPurchaseSchema.safeParse({ name: 'Bushi', quantity: 0, unitPrice: 10 }).success).toBe(false);
    expect(feedPurchaseSchema.safeParse({ name: 'Bushi', quantity: 10, unitPrice: 10, coverDays: 2.5 }).success).toBe(false);
    expect(feedPurchaseSchema.safeParse({ name: 'Bushi', quantity: 10, unitPrice: 10, remainingQuantity: 11 }).success).toBe(false);
  });
});

describe('farmSettingsSchema', () => {
  it('accepts a price given as a string', () => {
    expect(farmSettingsSchema.parse({ defaultMilkPrice: '75' })).toEqual({ defaultMilkPrice: 75 });
  });

  it('rejects zero or a missing price', () => {
    expect(farmSettingsSchema.safeParse({ defaultMilkPrice: 0 }).success).toBe(false);
    expect(farmSettingsSchema.safeParse({}).success).toBe(false);
  });
});

describe('animalSchema', () => {
  const photo = { data: 'A'.repeat(200), mimeType: 'image/jpeg', width: 800, height: 600 };

  it('accepts a minimal animal and fills defaults', () => {
    const a = animalSchema.parse({ tagNumber: ' C-001 ', name: '', photo });
    expect(a).toMatchObject({ tagNumber: 'C-001', gender: 'female', status: 'active' });
    expect(a.name).toBeUndefined();
  });

  it('requires a Cow ID', () => {
    expect(animalSchema.safeParse({ tagNumber: '  ' }).success).toBe(false);
  });

  it('rejects bad dates, genders and photo data', () => {
    expect(animalSchema.safeParse({ tagNumber: 'C-1', birthDate: '06/10/2026' }).success).toBe(false);
    expect(animalSchema.safeParse({ tagNumber: 'C-1', gender: 'other' }).success).toBe(false);
    expect(animalSchema.safeParse({ tagNumber: 'C-1', photo: { data: 'not base64 !!'.repeat(20) } }).success).toBe(false);
  });
});

describe('animalEventSchema', () => {
  it('accepts a vaccine with a next due date', () => {
    const e = animalEventSchema.parse({ type: 'vaccine', date: '2026-10-01', title: 'FMD', nextDueDate: '2027-04-01', cost: '150' });
    expect(e).toMatchObject({ type: 'vaccine', title: 'FMD', cost: 150 });
  });

  it('needs the details each type depends on', () => {
    expect(animalEventSchema.safeParse({ type: 'vaccine', date: '2026-10-01' }).success).toBe(false);
    expect(animalEventSchema.safeParse({ type: 'pregnancy_check', date: '2026-10-01' }).success).toBe(false);
    expect(animalEventSchema.safeParse({ type: 'weight', date: '2026-10-01' }).success).toBe(false);
    expect(animalEventSchema.safeParse({ type: 'insemination', date: '2026-10-01' }).success).toBe(true);
  });

  it('rejects a next due date before the record date', () => {
    expect(animalEventSchema.safeParse({ type: 'vaccine', date: '2026-10-01', title: 'FMD', nextDueDate: '2026-09-01' }).success).toBe(false);
  });

  it('only allows adding a calf with a calving', () => {
    const calf = { tagNumber: 'C-010', gender: 'male', photo: { data: 'A'.repeat(200) } };
    expect(animalEventSchema.safeParse({ type: 'calving', date: '2026-10-01', createCalf: calf }).success).toBe(true);
    expect(animalEventSchema.safeParse({ type: 'treatment', date: '2026-10-01', createCalf: calf }).success).toBe(false);
  });
});
