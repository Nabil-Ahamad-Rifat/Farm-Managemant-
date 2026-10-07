import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@farm/shared-validation';
import { db } from '@/lib/db';
import { generateResetToken } from '@/lib/auth/reset-token';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const parsed = forgotPasswordSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    const { email } = parsed.data;

    if (!checkRateLimit(`forgot-password-email:${email}`, 3, 15 * 60 * 1000)) {
      return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Always return success to avoid user enumeration attacks
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token = await generateResetToken(email);
    // On the development machine the app runs on whatever address and port is
    // free, so the link uses the address the page was opened on. In production
    // only the configured URL is trusted (a Host header could be forged).
    const dev = process.env.NODE_ENV === 'development';
    const appUrl = dev ? req.nextUrl.origin : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      // Send email via Resend
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Farm Manager <no-reply@yourdomain.com>',
        to: email,
        subject: 'Reset your Farm Manager password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
              <div style="background:#059669;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center">
                <span style="color:white;font-size:18px">🌱</span>
              </div>
              <span style="font-size:18px;font-weight:800;color:#0f172a">Farm Manager</span>
            </div>
            <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Reset your password</h1>
            <p style="color:#64748b;margin:0 0 24px">Click the button below to set a new password. This link expires in 30 minutes.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#059669;color:white;font-weight:600;padding:12px 28px;border-radius:12px;text-decoration:none;font-size:14px">
              Reset Password →
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">If you didn't request this, you can ignore this email.</p>
            <p style="color:#cbd5e1;font-size:11px;margin-top:4px">Link expires at ${new Date(Date.now() + 30 * 60 * 1000).toUTCString()}</p>
          </div>
        `,
      });
    } else {
      // Dev fallback: log the reset URL
      console.log('\n=== PASSWORD RESET LINK (dev mode) ===');
      console.log(resetUrl);
      console.log('======================================\n');
      // No email service here: on the development machine hand the link to the
      // page so the owner can use it right away.
      if (dev) {
        // A relative link, so it opens on whichever device asked (phone or computer).
        return NextResponse.json({ message: 'Email is not set up on this computer.', devResetUrl: `/reset-password?token=${token}` });
      }
    }

    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err: unknown) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
