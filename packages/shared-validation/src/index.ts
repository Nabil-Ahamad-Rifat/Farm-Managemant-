// Zod validation schemas shared between apps/web (API route validation) and
// apps/mobile (client-side form validation, including while offline, before
// a request ever reaches the network).
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(200),
  tenantName: z.string().trim().max(100).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

// Blank strings from HTML inputs become undefined so optional fields stay optional.
const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalText = (max: number) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
const money = z.coerce.number().finite().nonnegative().max(1_000_000_000);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const CUSTOMER_TYPES = ['regular', 'new'] as const;
export const PAYMENT_METHODS = ['cash', 'bkash', 'nagad', 'bank', 'other'] as const;
export const SALE_PRODUCT_TYPES = ['milk', 'cow_sale', 'other', 'general', 'products'] as const;

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: optionalText(30),
  address: optionalText(200),
  notes: optionalText(500),
  type: z.enum(CUSTOMER_TYPES).default('new'),
});

export const paymentSchema = z.object({
  amount: money.refine((n) => n > 0, 'Amount must be more than 0'),
  method: z.enum(PAYMENT_METHODS).default('cash'),
  note: optionalText(300),
  paidAt: z.preprocess(blankToUndefined, isoDay.optional()),
});

/**
 * A sale from the web or mobile app. Either `customerId` or `customerName`
 * identifies the buyer (mobile only sends the name). `paidNow` is what was
 * collected at the time of sale; older clients send `status` instead.
 */
export const saleSchema = z
  .object({
    customerId: z.preprocess(blankToUndefined, z.string().trim().max(50).optional()),
    customerName: optionalText(100),
    customerType: z.enum(CUSTOMER_TYPES).optional(),
    amount: money,
    saleType: z.preprocess(blankToUndefined, z.enum(SALE_PRODUCT_TYPES).default('other')),
    quantity: z.preprocess(blankToUndefined, money.optional()),
    unitPrice: z.preprocess(blankToUndefined, money.optional()),
    notes: optionalText(500),
    cowId: z.preprocess(blankToUndefined, z.string().trim().max(50).optional()),
    saleDate: z.preprocess(blankToUndefined, isoDay.optional()),
    paidNow: z.preprocess(blankToUndefined, money.optional()),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    status: z.preprocess(blankToUndefined, z.enum(['paid', 'pending', 'partial']).optional()),
  })
  .refine((s) => s.customerId || s.customerName, { message: 'Customer is required', path: ['customerName'] })
  .refine((s) => s.paidNow === undefined || s.paidNow <= s.amount, {
    message: 'Paid now cannot be more than the sale amount',
    path: ['paidNow'],
  });

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: optionalText(30),
  address: optionalText(200),
  notes: optionalText(500),
});

/**
 * A feed purchase from the web or mobile app. Older mobile builds send only
 * name/quantity/unitPrice/remainingQuantity: that is a fully paid batch with
 * no schedule. `paidNow` below the total (partly paid or baki) needs a
 * supplier, given as `supplierId` or a `supplierName` to find or create.
 */
export const feedPurchaseSchema = z
  .object({
    name: z.string().trim().min(1, 'Feed name is required').max(100),
    quantity: money.refine((n) => n > 0, 'Quantity must be more than 0'),
    unitPrice: money,
    remainingQuantity: z.preprocess(blankToUndefined, money.optional()),
    supplierId: z.preprocess(blankToUndefined, z.string().trim().max(50).optional()),
    supplierName: optionalText(100),
    coverDays: z.preprocess(
      (v) => (v === null ? undefined : blankToUndefined(v)),
      z.coerce.number().int('Days must be a whole number').min(1, 'At least 1 day').max(366).optional(),
    ),
    purchasedAt: z.preprocess(blankToUndefined, isoDay.optional()),
    paidNow: z.preprocess(blankToUndefined, money.optional()),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  })
  .refine((f) => f.remainingQuantity === undefined || f.remainingQuantity <= f.quantity, {
    message: 'Remaining cannot be more than the quantity bought',
    path: ['remainingQuantity'],
  })
  .refine((f) => f.paidNow === undefined || f.paidNow <= Math.round(f.quantity * f.unitPrice * 100) / 100, {
    message: 'Paid now cannot be more than the total',
    path: ['paidNow'],
  })
  .refine(
    (f) =>
      f.paidNow === undefined ||
      f.paidNow >= Math.round(f.quantity * f.unitPrice * 100) / 100 ||
      f.supplierId ||
      f.supplierName,
    { message: 'Choose the supplier you owe for a partly paid or baki purchase', path: ['supplierName'] },
  );

/** Farm-wide preferences edited on the Settings page. */
export const farmSettingsSchema = z.object({
  defaultMilkPrice: money.refine((n) => n > 0, 'Price must be more than 0'),
});
