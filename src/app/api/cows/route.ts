import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';

export const GET = withAuth(async (_req, { tenantId }) => {
  const cows = await db.cow.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(cows);
});

export const POST = withAuth(async (req, { tenantId }) => {
  const body = await req.json();
  const { tagNumber, name, breed, purchasePrice, status } = body;

  if (!tagNumber || !name) {
    return Response.json({ error: 'Tag number and name are required' }, { status: 400 });
  }

  const existing = await db.cow.findFirst({ where: { tagNumber, tenantId } });
  if (existing) {
    return Response.json({ error: 'Tag number already exists' }, { status: 400 });
  }

  const cow = await db.cow.create({
    data: {
      tagNumber,
      name,
      breed: breed || null,
      purchasePrice: purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== '' ? parseFloat(purchasePrice) : null,
      status: status || 'active',
      tenantId,
    },
  });

  return Response.json(cow, { status: 201 });
});
