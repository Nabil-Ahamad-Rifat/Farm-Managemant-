import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth/jwt';
import { withAuth } from '@/lib/middleware/withAuth';
import { isMobileClient } from '@/lib/auth/clientType';
import { issueRefreshToken, MOBILE_ACCESS_TOKEN_TTL } from '@/lib/auth/refreshToken';

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json();
  const ranchName = typeof body?.ranchName === 'string' ? body.ranchName.trim() : '';

  if (!ranchName) {
    return Response.json({ error: 'Ranch name is required' }, { status: 400 });
  }

  const tenant = await db.tenant.create({
    data: {
      name: ranchName,
    },
  });

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: { tenantId: tenant.id },
  });

  const mobile = isMobileClient(req);
  const token = signToken(
    {
      userId: updatedUser.id,
      tenantId: tenant.id,
      role: updatedUser.role,
      email: updatedUser.email,
      name: updatedUser.name,
    },
    mobile ? MOBILE_ACCESS_TOKEN_TTL : undefined
  );

  const responseBody: Record<string, unknown> = {
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    },
    tenant,
  };

  if (mobile) {
    responseBody.accessToken = token;
    responseBody.refreshToken = await issueRefreshToken(updatedUser.id, req.headers.get('user-agent'));
  }

  const response = NextResponse.json(responseBody, { status: 201 });

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
});
