import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { setPremium, revokePremium } from '@/lib/premium';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const shopId = session.metadata?.shopId;
        const email = session.customer_details?.email || '';
        const subscriptionId = session.subscription;
        if (shopId) {
          await setPremium(shopId, { subscriptionId, email });
          console.log(`[webhook] premium activated: shopId=${shopId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const shopId = sub.metadata?.shopId;
        if (shopId) {
          await revokePremium(shopId);
          console.log(`[webhook] premium revoked: shopId=${shopId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`[webhook] payment failed for subscription ${invoice.subscription}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
