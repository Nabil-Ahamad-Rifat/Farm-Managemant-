import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}

export function withAuth(handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) || req.cookies.get('token')?.value;

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    return handler(req, payload);
  };
}
