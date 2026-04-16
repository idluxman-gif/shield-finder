import { NextResponse } from 'next/server';

/**
 * Premium upgrade — Gumroad checkout redirect.
 *
 * Returns the Gumroad checkout URL with custom fields for shop identification.
 * No server-side session needed — Gumroad handles everything.
 */

export async function POST(request) {
  try {
    const { shopId, shopName } = await request.json();

    if (!shopId || !shopName) {
      return NextResponse.json({ error: 'shopId and shopName are required' }, { status: 400 });
    }

    const productId = process.env.GUMROAD_PRODUCT_ID;
    if (!productId) {
      console.error('[checkout] missing GUMROAD_PRODUCT_ID');
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const checkoutUrl = `https://app.gumroad.com/checkout?product=${encodeURIComponent(productId)}&wanted=true&custom_fields[shop_id]=${encodeURIComponent(shopId)}&custom_fields[shop_name]=${encodeURIComponent(shopName)}&custom_fields[site]=shieldfinder`;

    return NextResponse.json({ success: true, checkoutUrl });
  } catch (error) {
    console.error('[checkout] error:', error);
    return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 });
  }
}
