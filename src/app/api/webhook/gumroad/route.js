import { NextResponse } from 'next/server';
import { setPremium, revokePremium } from '@/lib/premium';

/**
 * Gumroad webhook handler for ShieldFinder.
 *
 * Gumroad sends POST requests with form-encoded data.
 * Events: sale (resource_name=sale), subscription cancellation, etc.
 *
 * Custom fields passed through checkout: shop_id, shop_name, site
 */

export async function POST(request) {
  try {
    const formData = await request.formData();
    const sellerId = formData.get('seller_id');
    const expectedSellerId = process.env.GUMROAD_SELLER_ID;

    // Basic verification: check seller_id matches
    if (expectedSellerId && sellerId !== expectedSellerId) {
      console.warn('[gumroad-webhook] seller_id mismatch');
      return NextResponse.json({ error: 'Invalid seller' }, { status: 401 });
    }

    const resourceName = formData.get('resource_name') || 'sale';
    const shopId = formData.get('custom_fields[shop_id]') || formData.get('shop_id') || '';
    const shopName = formData.get('custom_fields[shop_name]') || formData.get('shop_name') || '';
    const site = formData.get('custom_fields[site]') || formData.get('site') || '';
    const email = formData.get('email') || '';
    const saleId = formData.get('sale_id') || '';
    const subscriptionId = formData.get('subscription_id') || '';
    const cancelled = formData.get('cancelled') === 'true';
    const refunded = formData.get('refunded') === 'true';

    console.log(`[gumroad-webhook] resource=${resourceName} shopId=${shopId} sale=${saleId} sub=${subscriptionId} cancelled=${cancelled}`);

    if (!shopId) {
      console.warn('[gumroad-webhook] no shop_id in custom fields');
      return NextResponse.json({ received: true });
    }

    // Only process events for this site
    if (site && site !== 'shieldfinder') {
      console.log(`[gumroad-webhook] ignoring event for site=${site}`);
      return NextResponse.json({ received: true });
    }

    if (cancelled || refunded) {
      await revokePremium(shopId);
      console.log(`[gumroad-webhook] premium revoked: shopId=${shopId}`);
    } else {
      await setPremium(shopId, {
        paymentId: `gumroad-${subscriptionId || saleId}`,
        email,
      });
      console.log(`[gumroad-webhook] premium activated: shopId=${shopId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[gumroad-webhook] handler error:', err);
    return NextResponse.json({ received: true });
  }
}
