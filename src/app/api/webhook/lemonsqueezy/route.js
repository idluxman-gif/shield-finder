import { NextResponse } from 'next/server';
import { setPremium, revokePremium } from '@/lib/premium';
import crypto from 'crypto';

/**
 * Lemon Squeezy webhook handler for ShieldFinder.
 *
 * Handles subscription lifecycle events:
 * - subscription_created / subscription_payment_success → activate premium
 * - subscription_expired / subscription_cancelled → revoke premium
 *
 * Custom data passed through checkout: { shop_id, shop_name, site }
 */

function verifySignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request) {
  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[ls-webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-signature');

    if (!signature) {
      console.warn('[ls-webhook] missing x-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    try {
      if (!verifySignature(rawBody, signature, secret)) {
        console.warn('[ls-webhook] invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      console.warn('[ls-webhook] signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventName = body.meta?.event_name;
    const customData = body.meta?.custom_data || {};
    const shopId = customData.shop_id;
    const subscriptionId = body.data?.id;
    const email = body.data?.attributes?.user_email || '';

    console.log(`[ls-webhook] event=${eventName} shopId=${shopId} sub=${subscriptionId}`);

    if (!shopId) {
      console.warn('[ls-webhook] no shop_id in custom_data:', JSON.stringify(customData));
      return NextResponse.json({ received: true });
    }

    // Only process events for this site
    if (customData.site && customData.site !== 'shieldfinder') {
      console.log(`[ls-webhook] ignoring event for site=${customData.site}`);
      return NextResponse.json({ received: true });
    }

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_payment_success':
      case 'subscription_resumed':
        await setPremium(shopId, {
          paymentId: `ls-${subscriptionId}`,
          email,
        });
        console.log(`[ls-webhook] premium activated: shopId=${shopId}`);
        break;

      case 'subscription_expired':
      case 'subscription_cancelled':
      case 'subscription_paused':
        await revokePremium(shopId);
        console.log(`[ls-webhook] premium revoked: shopId=${shopId}`);
        break;

      default:
        console.log(`[ls-webhook] unhandled event: ${eventName}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[ls-webhook] handler error:', err);
    return NextResponse.json({ received: true });
  }
}
