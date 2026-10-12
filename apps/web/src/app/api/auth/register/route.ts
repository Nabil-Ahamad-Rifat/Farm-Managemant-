import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@farm/shared-validation';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isMobileClient } from '@/lib/auth/clientType';
import { issueRefreshToken, MOBILE_ACCESS_TOKEN_TTL } from '@/lib/auth/refreshToken';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many accounts created from this network. Please try again later.' }, { status: 429 });
  }

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue?.path[0] === 'password'
      ? 'Password must be at least 8 characters'
      : 'Name, a valid email, and password are required';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { name, email, password, tenantName } = parsed.data;

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  const hashedPassword = await hashPassword(password);

  const { tenant, user } = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: tenantName || `${name.split(' ')[0]}'s Farm` },
    });

    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'owner',
        tenantId: tenant.id,
      },
    });

    return { tenant, user };
  });

  const mobile = isMobileClient(req);
  const token = signToken(
    {
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
      name: user.name,
      tv: user.tokenVersion ?? 0,
    },
    mobile ? MOBILE_ACCESS_TOKEN_TTL : undefined
  );

  const responseBody: Record<string, unknown> = {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant,
  };

  if (mobile) {
    responseBody.accessToken = token;
    responseBody.refreshToken = await issueRefreshToken(user.id, req.headers.get('user-agent'));
  }

  const response = NextResponse.json(responseBody, { status: 201 });

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
