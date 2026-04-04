import { NextResponse } from 'next/server';
import { setPremium, revokePremium } from '@/lib/premium';

/**
 * Manual premium activation endpoint — for use by board when Payoneer
 * payment is confirmed but IPN did not fire automatically.
 *
 * POST /api/admin/activate-premium
 * Body: { secret, shopId, email, action: "activate" | "revoke" }
 *
 * Requires ADMIN_SECRET env var to be set.
 */

export async function POST(request) {
  try {
    const { secret, shopId, email, action = 'activate' } = await request.json();

    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required' }, { status: 400 });
    }

    if (action === 'revoke') {
      await revokePremium(shopId);
      return NextResponse.json({ success: true, action: 'revoked', shopId });
    }

    await setPremium(shopId, { paymentId: `manual-${Date.now()}`, email: email || '' });
    return NextResponse.json({ success: true, action: 'activated', shopId });
  } catch (err) {
    console.error('[admin/activate-premium] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
