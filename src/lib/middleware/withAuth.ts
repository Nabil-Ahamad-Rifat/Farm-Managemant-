import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}

export function withAuth<T = any>(
  handler: (req: NextRequest, ctx: AuthContext, routeContext: T) => Promise<Response>
) {
  return async (req: NextRequest, routeContext: T) => {
    const authHeader = req.headers.get('authorization');
    const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) || req.cookies.get('token')?.value;

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    return handler(req, payload, routeContext);
  };
}

export async function getIdFromParams(routeContext: any, req: NextRequest): Promise<string | null> {
  if (routeContext?.params) {
    const resolved = await routeContext.params;
    if (resolved?.id) return resolved.id;
  }

  // Parse path segments, e.g. /api/employees/clx123/salary -> 'clx123'
  const segments = req.nextUrl.pathname.split('/').filter(Boolean);
  const apiIndex = segments.indexOf('api');
  if (apiIndex !== -1 && segments.length >= apiIndex + 3) {
    // segments[apiIndex+1] = 'employees', segments[apiIndex+2] = employeeId
    return segments[apiIndex + 2];
  }

  const last = segments.pop();
  if (last === 'salary' || last === 'usage') {
    return segments.pop() || null;
  }
  return last || null;
}
