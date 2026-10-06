import { farmSettingsSchema } from '@farm/shared-validation';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware/withAuth';
import { getDefaultMilkPrice } from '@/lib/settings';

export const GET = withAuth(async (_req, { tenantId }) => {
  try {
    return Response.json({ defaultMilkPrice: await getDefaultMilkPrice(tenantId) });
  } catch (err: unknown) {
    console.error('Error loading settings:', err);
    return Response.json({ error: 'Failed to load settings' }, { status: 500 });
  }
});

export const PUT = withAuth(async (req, { tenantId }) => {
  try {
    const parsed = farmSettingsSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid settings' }, { status: 400 });
    }
    await db.tenant.update({ where: { id: tenantId }, data: { defaultMilkPrice: parsed.data.defaultMilkPrice } });
    return Response.json(parsed.data);
  } catch (err: unknown) {
    console.error('Error saving settings:', err);
    return Response.json({ error: 'Failed to save settings' }, { status: 500 });
  }
});
