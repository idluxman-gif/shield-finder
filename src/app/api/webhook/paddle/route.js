import { NextResponse } from 'next/server';
import { setPremium, revokePremium } from '@/lib/premium';
import crypto from 'crypto';

/**
 * Paddle webhook handler for ShieldFinder.
 *
 * Handles subscription lifecycle events:
 * - subscription.activated / transaction.completed → activate premium
 * - subscription.canceled / subscription.paused → revoke premium
 *
 * Custom data passed through checkout: { shop_id, shop_name, site }
 *
 * Paddle signs webhooks with HMAC-SHA256 using the Paddle-Signature header.
 * Format: ts=TIMESTAMP;h1=HASH
 */

const MAX_VALID_TIME = 5 * 60; // 5 minutes tolerance

function verifyPaddleSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;

  const parts = {};
  signatureHeader.split(';').forEach((part) => {
    const [key, val] = part.split('=');
    parts[key] = val;
  });

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(ts, 10)) > MAX_VALID_TIME) return false;

  const payload = `${ts}:${rawBody}`;
  const hmac = crypto.createHmac('sha256', secret);
  const computed = hmac.update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(computed));
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[paddle-webhook] PADDLE_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('paddle-signature');

    if (!verifyPaddleSignature(rawBody, signature, secret)) {
      console.warn('[paddle-webhook] invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType = body.event_type;
    const customData = body.data?.custom_data || {};
    const shopId = customData.shop_id;
    const subscriptionId = body.data?.id || body.data?.subscription_id || '';
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
      case 'subscription.resumed':
      case 'subscription.updated':
      case 'transaction.completed':
        await setPremium(shopId, {
          paymentId: `paddle-${subscriptionId}`,
          email,
        });
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
