import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth/jwt';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  error?: string;
}

interface GoogleUserInfo {
  sub: string;        // Google user ID
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/login?error=google_cancelled`);
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/login?error=google_not_configured`);
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json() as GoogleTokenResponse;
    if (tokens.error || !tokens.access_token) {
      console.error('Google token exchange failed:', tokens);
      return NextResponse.redirect(`${appUrl}/login?error=google_token_failed`);
    }

    // 2. Fetch user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json() as GoogleUserInfo;

    if (!profile.email) {
      return NextResponse.redirect(`${appUrl}/login?error=google_no_email`);
    }

    // 3. Find or create the user
    let user = await db.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      // New Google user — create a tenant + user automatically
      const firstName = profile.name?.split(' ')[0] || 'User';

      const { newTenant, newUser } = await db.$transaction(async (tx) => {
        const newTenant = await tx.tenant.create({
          data: { name: `${firstName}'s Farm` },
        });
        const newUser = await tx.user.create({
          data: {
            name: profile.name || profile.email,
            email: profile.email,
            googleId: profile.sub,
            password: null,
            role: 'owner',
            tenantId: newTenant.id,
          },
        });
        return { newTenant, newUser };
      });

      user = newUser;
      void newTenant; // used inside transaction
    } else if (!user.googleId) {
      // Existing email user — link their Google account
      user = await db.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub },
      });
    }

    // 4. Issue JWT cookie and redirect to dashboard
    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.redirect(`${appUrl}/dashboard`);
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/login?error=google_server_error`);
  }
}
