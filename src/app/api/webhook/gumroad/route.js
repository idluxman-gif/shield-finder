import { NextResponse } from 'next/server';

/**
 * Gumroad webhook hub — handles BOTH ShieldFinder and ScratchAndDentGuide.
 *
 * Gumroad only supports a single "Ping" endpoint, so this handler acts as
 * the central webhook receiver for both sites. It writes directly to Vercel KV
 * using the correct prefix based on the `site` custom field:
 *   - site=shieldfinder  → premium:sf:{shopId}
 *   - site=scratchanddent → premium:sad:{shopId}
 *
 * Gumroad sends POST requests with form-encoded data.
 * Custom fields passed through checkout: shop_id, shop_name, site
 */

const PREMIUM_DAYS = 32;

const SITE_PREFIX = {
  shieldfinder: 'premium:sf',
  scratchanddent: 'premium:sad',
};

async function getKv() {
  const { kv } = await import('@vercel/kv');
  return kv;
}

async function activatePremium(kvPrefix, shopId, { paymentId, email }) {
  const store = await getKv();
  const since = new Date().toISOString();
  const expiresAt = new Date(Date.now() + PREMIUM_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await store.set(`${kvPrefix}:${shopId}`, {
    paymentId,
    email,
    ownerEmail: null,
    since,
    expiresAt,
    active: true,
  });
}

async function deactivatePremium(kvPrefix, shopId) {
  const store = await getKv();
  const existing = await store.get(`${kvPrefix}:${shopId}`);
  if (existing) {
    await store.set(`${kvPrefix}:${shopId}`, { ...existing, active: false });
  }
}

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

    console.log(`[gumroad-webhook] resource=${resourceName} site=${site} shopId=${shopId} sale=${saleId} sub=${subscriptionId} cancelled=${cancelled}`);

    if (!shopId) {
      console.warn('[gumroad-webhook] no shop_id in custom fields');
      return NextResponse.json({ received: true });
    }

    const kvPrefix = SITE_PREFIX[site];
    if (!kvPrefix) {
      console.warn(`[gumroad-webhook] unknown site: ${site}`);
      return NextResponse.json({ received: true });
    }

    if (cancelled || refunded) {
      await deactivatePremium(kvPrefix, shopId);
      console.log(`[gumroad-webhook] premium revoked: site=${site} shopId=${shopId}`);
    } else {
      await activatePremium(kvPrefix, shopId, {
        paymentId: `gumroad-${subscriptionId || saleId}`,
        email,
      });
      console.log(`[gumroad-webhook] premium activated: site=${site} shopId=${shopId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[gumroad-webhook] handler error:', err);
    return NextResponse.json({ received: true });
  }
}
