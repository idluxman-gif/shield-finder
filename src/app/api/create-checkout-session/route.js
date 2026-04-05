import { NextResponse } from 'next/server';

/**
 * Premium upgrade — Lemon Squeezy checkout session.
 *
 * Creates a Lemon Squeezy checkout URL for $29/month premium listing.
 * Custom data (shopId, shopName) is passed through so the webhook
 * can activate premium on the correct listing.
 */

export async function POST(request) {
  try {
    const { shopId, shopName } = await request.json();

    if (!shopId || !shopName) {
      return NextResponse.json({ error: 'shopId and shopName are required' }, { status: 400 });
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

    if (!apiKey || !storeId || !variantId) {
      console.error('[checkout] missing env vars');
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const origin = request.headers.get('origin') || 'https://www.shieldfinder.com';

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                shop_id: shopId,
                shop_name: shopName,
                site: 'shieldfinder',
              },
            },
            product_options: {
              redirect_url: `${origin}/upgrade?success=true&shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent(shopName)}`,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: storeId } },
            variant: { data: { type: 'variants', id: variantId } },
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[checkout] LS API error:', JSON.stringify(data));
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    const checkoutUrl = data.data?.attributes?.url;
    if (!checkoutUrl) {
      console.error('[checkout] no URL in response:', JSON.stringify(data));
      return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, checkoutUrl });
  } catch (error) {
    console.error('[checkout] error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
