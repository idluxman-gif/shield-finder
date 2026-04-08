import { NextResponse } from 'next/server';

/**
 * Premium upgrade — Paddle checkout session (replaces Lemon Squeezy).
 *
 * Creates a Paddle transaction checkout URL for $29/month premium listing.
 * custom_data (shop_id, shop_name) flows through to the webhook handler.
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
      console.error('[checkout] missing Paddle env vars');
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const origin = request.headers.get('origin') || 'https://www.shieldfinder.com';

    const res = await fetch('https://api.paddle.com/transactions', {
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
      console.error('[checkout] no URL in Paddle response:', JSON.stringify(data));
      return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, checkoutUrl });
  } catch (error) {
    console.error('[checkout] error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
