import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

const EXPIRY_MINUTES = 30;

export async function generateResetToken(email: string): Promise<string> {
  // Invalidate any existing tokens for this email
  // (We mark them used since SQLite doesn't support deleteMany with filters easily)
  await db.passwordResetToken.updateMany({
    where: { email, used: false },
    data: { used: true },
  });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  await db.passwordResetToken.create({
    data: { token, email, expiresAt },
  });

  return token;
}

export async function validateResetToken(token: string) {
  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record) return null;
  if (record.used) return null;
  if (record.expiresAt < new Date()) return null;
  return record;
}

export async function markTokenUsed(token: string) {
  await db.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });
}
