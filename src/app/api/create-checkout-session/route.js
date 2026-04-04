import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { shopId, shopName } = await request.json();

    if (!shopId || !shopName) {
      return NextResponse.json({ error: 'shopId and shopName are required' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://www.shieldfinder.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          shopId: String(shopId),
          shopName,
          site: 'sf',
        },
      },
      metadata: {
        shopId: String(shopId),
        shopName,
        site: 'sf',
      },
      success_url: `${origin}/upgrade/success?shopId=${shopId}&shopName=${encodeURIComponent(shopName)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade?shopId=${shopId}&shopName=${encodeURIComponent(shopName)}&cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[checkout] error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
