import { NextRequest, NextResponse } from 'next/server';
import { revokeRefreshToken } from '@/lib/auth/refreshToken';

export async function POST(req: NextRequest) {
  // Mobile clients pass their refresh token so it's revoked server-side,
  // not just discarded on-device.
  const body = await req.json().catch(() => null) as { refreshToken?: string } | null;
  if (body?.refreshToken) {
    await revokeRefreshToken(body.refreshToken);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
}
