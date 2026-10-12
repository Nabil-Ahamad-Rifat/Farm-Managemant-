import { NextRequest, NextResponse } from 'next/server';
import { validateResetToken, markTokenUsed } from '@/lib/auth/reset-token';
import { hashPassword } from '@/lib/auth/password';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { token, newPassword } = await req.json() as { token?: string; newPassword?: string };

    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const record = await validateResetToken(token);
    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired reset link. Please request a new one.' }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);

    // A new password logs out every old session (web and phone).
    const user = await db.user.findUnique({ where: { email: record.email }, select: { id: true, tokenVersion: true } });
    if (user) {
      await db.user.update({ where: { id: user.id }, data: { password: hashed, tokenVersion: (user.tokenVersion ?? 0) + 1 } });
      await db.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }

    await markTokenUsed(token);

    return NextResponse.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err: unknown) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
