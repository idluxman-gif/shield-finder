import { NextResponse } from 'next/server';

/**
 * Premium upgrade — Paddle checkout session.
 *
 * Creates a Paddle transaction/checkout for $29/month premium listing.
 * Custom data (shopId, shopName, site) is passed through so the webhook
 * can activate premium on the correct listing.
 */

export async function POST(request) {
  try {
    const { shopId, shopName } = await request.json();

    if (!shopId || !shopName) {
      return NextResponse.json({ error: 'shopId and shopName are required' }, { status: 400 });
    }

    const apiKey = process.env.PADDLE_API_KEY;
    const priceId = process.env.PADDLE_PRICE_ID;

    if (!apiKey || !priceId) {
      console.error('[checkout] missing PADDLE env vars');
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const origin = request.headers.get('origin') || 'https://www.shieldfinder.com';
    const baseUrl = apiKey.startsWith('test_')
      ? 'https://sandbox-api.paddle.com'
      : 'https://api.paddle.com';

    const res = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: {
          shop_id: shopId,
          shop_name: shopName,
          site: 'shieldfinder',
        },
        checkout: {
          url: `${origin}/upgrade?success=true&shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent(shopName)}`,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[checkout] Paddle API error:', JSON.stringify(data));
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    const checkoutUrl = data.data?.checkout?.url;
    if (!checkoutUrl) {
      console.error('[checkout] no checkout URL in response:', JSON.stringify(data));
      return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, checkoutUrl });
  } catch (error) {
    console.error('[checkout] error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
