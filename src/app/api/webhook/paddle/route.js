import { NextResponse } from 'next/server';
import { setPremium, revokePremium } from '@/lib/premium';
import crypto from 'crypto';

/**
 * Paddle webhook handler for ShieldFinder.
 *
 * Verifies Paddle-Signature header (ts:rawBody HMAC-SHA256).
 * Handles subscription lifecycle events to activate/revoke premium listings.
 */

function verifyPaddleSignature(rawBody, signatureHeader, secret) {
  const parts = signatureHeader.split(';');
  const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
  const h1 = parts.find(p => p.startsWith('h1='))?.split('=')[1];
  if (!ts || !h1) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(`${ts}:${rawBody}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(digest));
}

export async function POST(request) {
  try {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[paddle-webhook] PADDLE_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const rawBody = await request.text();
    const signatureHeader = request.headers.get('paddle-signature');

    if (!signatureHeader) {
      console.warn('[paddle-webhook] missing Paddle-Signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
      console.warn('[paddle-webhook] invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType = body.event_type;
    const customData = body.data?.custom_data || {};
    const shopId = customData.shop_id;
    const subscriptionId = body.data?.id;
    const email = body.data?.customer?.email || '';

    console.log(`[paddle-webhook] event=${eventType} shopId=${shopId} sub=${subscriptionId}`);

    if (!shopId) {
      console.warn('[paddle-webhook] no shop_id in custom_data:', JSON.stringify(customData));
      return NextResponse.json({ received: true });
    }

    if (customData.site && customData.site !== 'shieldfinder') {
      console.log(`[paddle-webhook] ignoring event for site=${customData.site}`);
      return NextResponse.json({ received: true });
    }

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.activated':
      case 'transaction.completed':
        await setPremium(shopId, { paymentId: `paddle-${subscriptionId}`, email });
        console.log(`[paddle-webhook] premium activated: shopId=${shopId}`);
        break;

      case 'subscription.canceled':
      case 'subscription.paused':
      case 'subscription.past_due':
        await revokePremium(shopId);
        console.log(`[paddle-webhook] premium revoked: shopId=${shopId}`);
        break;

      default:
        console.log(`[paddle-webhook] unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[paddle-webhook] handler error:', err);
    return NextResponse.json({ received: true });
  }
}
