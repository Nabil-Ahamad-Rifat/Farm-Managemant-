import { cache } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken, JwtPayload } from '@/lib/auth/jwt';
import { db } from '@/lib/db';

/**
 * The signed-in user for a token, checked against the database on every
 * request: a removed member, a reset password (tokenVersion) or a changed
 * role takes effect at once instead of when the token expires. The role and
 * name come from the database, not the token.
 */
export async function currentUser(payload: JwtPayload | null): Promise<JwtPayload | null> {
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { tenantId: true, role: true, name: true, email: true, tokenVersion: true },
  });
  if (!user || user.tenantId !== payload.tenantId || (user.tokenVersion ?? 0) !== (payload.tv ?? 0)) return null;
  return { ...payload, role: user.role, name: user.name, email: user.email };
}

/** Owners see everything; managers do the daily work but not the money reports or settings. */
export const isOwner = (role: string) => role !== 'manager';

// Cached per request: the layout and the page both ask.
export const getSession = cache(async (): Promise<JwtPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return currentUser(verifyToken(token));
});

/** For owner-only pages: the session, or a redirect (to login, or to the dashboard for managers). */
export async function requireOwnerPage(): Promise<JwtPayload> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!isOwner(session.role)) redirect('/dashboard');
  return session;
}
