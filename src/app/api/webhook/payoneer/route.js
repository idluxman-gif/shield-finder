import { NextResponse } from 'next/server';
import { setPremium } from '@/lib/premium';

/**
 * Payoneer IPN handler for ShieldFinder.
 *
 * transactionId format: sf-{encodedShopId}-{timestamp}
 * shopId is URL-encoded because SF slugs contain hyphens.
 */

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[payoneer-ipn] received:', JSON.stringify(body));

    const { transactionId, statusCode, resultCode } = body;

    if (resultCode !== 'SUCCESS' || statusCode !== 'charged') {
      console.log(`[payoneer-ipn] ignored: status=${statusCode} result=${resultCode}`);
      return NextResponse.json({ received: true });
    }

    // Format: sf-{encodedShopId}-{timestamp}
    if (!transactionId?.startsWith('sf-')) {
      console.warn('[payoneer-ipn] unexpected transactionId format:', transactionId);
      return NextResponse.json({ received: true });
    }

    // Strip prefix and suffix: "sf-" prefix, "-{timestamp}" suffix
    const withoutPrefix = transactionId.slice(3); // remove "sf-"
    const lastDash = withoutPrefix.lastIndexOf('-');
    const encodedShopId = lastDash > 0 ? withoutPrefix.slice(0, lastDash) : withoutPrefix;
    const shopId = decodeURIComponent(encodedShopId);
    const email = body.customer?.email || body.identification?.email || '';

    if (!shopId) {
      console.error('[payoneer-ipn] could not parse shopId from:', transactionId);
      return NextResponse.json({ received: true });
    }

    await setPremium(shopId, { paymentId: transactionId, email });
    console.log(`[payoneer-ipn] premium activated: shopId=${shopId}`);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[payoneer-ipn] handler error:', err);
    return NextResponse.json({ received: true });
  }
}
