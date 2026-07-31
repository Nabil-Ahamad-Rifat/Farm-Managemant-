import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, tenantName } = body as {
    name?: string;
    email?: string;
    password?: string;
    tenantName?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }

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

  const token = signToken({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant,
    token,
  }, { status: 201 });

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
