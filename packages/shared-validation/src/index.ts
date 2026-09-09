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
