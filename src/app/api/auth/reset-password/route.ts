import { NextRequest, NextResponse } from 'next/server';
import { validateResetToken, markTokenUsed } from '@/lib/auth/reset-token';
import { hashPassword } from '@/lib/auth/password';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json() as { token?: string; newPassword?: string };

    if (!token || !newPassword) {
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

    await db.user.update({
      where: { email: record.email },
      data: { password: hashed },
    });

    await markTokenUsed(token);

    return NextResponse.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err: unknown) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
