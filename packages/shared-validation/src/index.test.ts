import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, forgotPasswordSchema } from './index';

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
