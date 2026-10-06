import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { verifyPassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Apple App Store Guideline 5.1.1(v) / Google Play's User Data policy: an app
// that supports in-app account creation must let the user delete that account
// from inside the app. One user = one tenant today (register and POST
// /api/ranches are the only places tenantId is ever assigned, each creating a
// fresh tenant), so deleting "my account" means deleting the whole tenant —
// guarded below in case that ever changes.
export const POST = withAuth(async (req: NextRequest, { userId, tenantId }) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(`account-delete:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Google-only accounts have no password to confirm with — the session
  // token itself is the authentication (same exemption login/register use).
  if (user.password) {
    const body = await req.json().catch(() => null) as { password?: string } | null;
    const isValid = body?.password ? await verifyPassword(body.password, user.password) : false;
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }
  }

  const otherTenantMembers = await db.user.count({ where: { tenantId, id: { not: userId } } });

  await db.$transaction(async (tx) => {
    // The user goes first: User.tenant is a required relation, so Prisma
    // refuses to delete a Tenant while any User still points at it (P2014).
    // RefreshTokens cascade automatically via the User relation.
    await tx.user.delete({ where: { id: userId } });
    await tx.passwordResetToken.deleteMany({ where: { email: user.email } });

    if (otherTenantMembers === 0) {
      // Sole user on this tenant — delete every tenant-scoped record. Only
      // SalaryPayment->Employee and FeedUsage->FeedBatch cascade automatically
      // (see apps/web/prisma/schema.prisma); everything else needs an
      // explicit delete before the Tenant itself can go.
      await tx.sale.deleteMany({ where: { tenantId } });
      await tx.payment.deleteMany({ where: { tenantId } });
      await tx.customer.deleteMany({ where: { tenantId } });
      await tx.employee.deleteMany({ where: { tenantId } });
      await tx.cow.deleteMany({ where: { tenantId } });
      await tx.feedBatch.deleteMany({ where: { tenantId } });
      // After feed batches, which point at suppliers.
      await tx.supplierPayment.deleteMany({ where: { tenantId } });
      await tx.supplier.deleteMany({ where: { tenantId } });
      await tx.otherExpense.deleteMany({ where: { tenantId } });
      await tx.otherIncome.deleteMany({ where: { tenantId } });
      await tx.idempotencyKey.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    }
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
});
