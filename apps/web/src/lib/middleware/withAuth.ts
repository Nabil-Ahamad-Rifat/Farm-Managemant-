import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { currentUser, isOwner } from '@/lib/auth/session';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}

export function withAuth<T = unknown>(
  handler: (req: NextRequest, ctx: AuthContext, routeContext: T) => Promise<Response>
) {
  return async (req: NextRequest, routeContext: T) => {
    const authHeader = req.headers.get('authorization');
    const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) || req.cookies.get('token')?.value;

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await currentUser(verifyToken(token));
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    return handler(req, payload, routeContext);
  };
}

export async function getIdFromParams(routeContext: unknown, req: NextRequest): Promise<string | null> {
  if (routeContext && typeof routeContext === 'object' && 'params' in routeContext) {
    const resolved = await (routeContext as { params?: Promise<{ id?: string }> }).params;
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

/** Like withAuth, for routes only the farm owner may use (money reports, settings, team). Managers get 403. */
export function withOwner<T = unknown>(
  handler: (req: NextRequest, ctx: AuthContext, routeContext: T) => Promise<Response>
) {
  return withAuth<T>(async (req, ctx, routeContext) => {
    if (!isOwner(ctx.role)) {
      return Response.json({ error: 'Only the farm owner can see this' }, { status: 403 });
    }
    return handler(req, ctx, routeContext);
  });
}
