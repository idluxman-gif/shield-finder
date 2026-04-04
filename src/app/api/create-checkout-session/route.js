import { NextResponse } from 'next/server';

/**
 * Payoneer Checkout — create a hosted payment session.
 *
 * Docs: https://checkoutdocs.payoneer.com/docs/integrate-hosted-payment-page
 * Auth: HTTP Basic (PAYONEER_MERCHANT_CODE:PAYONEER_PAYMENT_TOKEN)
 *
 * transactionId format: sf-{shopId}-{timestamp}
 * shopId for ShieldFinder is a string slug like "sf-brickell-honda-miami"
 * so we encode it: sf-{encodeURIComponent(shopId)}-{timestamp}
 */

const PAYONEER_API = process.env.PAYONEER_API_URL || 'https://api.payoneer.com';

function payoneerAuthHeader() {
  const credentials = `${process.env.PAYONEER_MERCHANT_CODE}:${process.env.PAYONEER_PAYMENT_TOKEN}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export async function POST(request) {
  try {
    const { shopId, shopName } = await request.json();

    if (!shopId || !shopName) {
      return NextResponse.json({ error: 'shopId and shopName are required' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://www.shieldfinder.com';
    // Encode shopId so hyphens in the slug don't break our parsing
    const encodedShopId = encodeURIComponent(shopId);
    const transactionId = `sf-${encodedShopId}-${Date.now()}`;

    const payload = {
      transactionId,
      country: 'US',
      customer: {
        email: '',
        registration: { id: `shop-${shopId}` },
      },
      payment: {
        amount: 29.00,
        currency: 'USD',
        reference: `Premium Listing — ${shopName}`,
        longReference: {
          essential: `Monthly premium listing on ShieldFinder.com for ${shopName}`,
        },
      },
      callback: {
        returnUrl: `${origin}/upgrade/success?shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent(shopName)}`,
        cancelUrl: `${origin}/upgrade?shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent(shopName)}&cancelled=1`,
        notificationUrl: `${origin}/api/webhook/payoneer`,
      },
      products: [
        {
          code: 'premium_listing',
          name: 'Premium Listing — ShieldFinder.com',
          quantity: 1,
          currency: 'USD',
          amount: 29.00,
        },
      ],
      style: {
        hostedVersion: 'v4',
      },
    };

    const res = await fetch(`${PAYONEER_API}/api/lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.optile.payment.enterprise-v1-extensible+json',
        'Accept': 'application/vnd.optile.payment.enterprise-v1-extensible+json',
        'Authorization': payoneerAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[checkout] Payoneer error:', data);
      return NextResponse.json({ error: data.resultInfo || 'Failed to create payment session' }, { status: 500 });
    }

    const redirectUrl = data.links?.redirect || data.redirect;
    if (!redirectUrl) {
      console.error('[checkout] No redirect URL in Payoneer response:', data);
      return NextResponse.json({ error: 'No redirect URL returned' }, { status: 500 });
    }

    return NextResponse.json({ url: redirectUrl });
  } catch (error) {
    console.error('[checkout] error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
