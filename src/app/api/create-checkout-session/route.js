import { NextResponse } from 'next/server';

/**
 * Premium upgrade request — email-based payment flow for ShieldFinder.
 *
 * Since Payoneer requires a specific recipient email per payment request,
 * we use a notification-based flow:
 *
 * 1. Shop owner submits their email + shop info here
 * 2. We email idluxman@gmail.com via Resend with the owner's details
 * 3. Board sends the owner a $29 Payoneer payment request to their email
 * 4. Once paid, board calls POST /api/admin/activate-premium to flip the flag
 */

export async function POST(request) {
  try {
    const { shopId, shopName, ownerEmail } = await request.json();

    if (!shopId || !shopName || !ownerEmail) {
      return NextResponse.json({ error: 'shopId, shopName, and ownerEmail are required' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const boardEmail = 'idluxman@gmail.com';
    const origin = request.headers.get('origin') || 'https://www.shieldfinder.com';

    // Email 1: Notify board
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'listings@shieldfinder.com',
        to: [boardEmail],
        subject: `Premium Upgrade Request — ${shopName}`,
        html: `
          <h2>New Premium Listing Upgrade Request</h2>
          <table cellpadding="8" style="border-collapse:collapse">
            <tr><td><strong>Shop Name</strong></td><td>${shopName}</td></tr>
            <tr><td><strong>Shop ID</strong></td><td>${shopId}</td></tr>
            <tr><td><strong>Owner Email</strong></td><td>${ownerEmail}</td></tr>
            <tr><td><strong>Site</strong></td><td>shieldfinder.com</td></tr>
            <tr><td><strong>Price</strong></td><td>$29/month</td></tr>
          </table>
          <p><strong>Action required:</strong> Send a Payoneer payment request for $29 to <a href="mailto:${ownerEmail}">${ownerEmail}</a>.</p>
          <p>Once payment is confirmed, activate the listing with:</p>
          <pre style="background:#f4f4f4;padding:12px;border-radius:4px">curl -X POST ${origin}/api/admin/activate-premium \\
  -H "Content-Type: application/json" \\
  -d '{"secret":"YOUR_ADMIN_SECRET","shopId":"${shopId}","email":"${ownerEmail}"}'</pre>
        `,
      }),
    });

    // Email 2: Confirm to shop owner
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'listings@shieldfinder.com',
        to: [ownerEmail],
        subject: `Premium Listing Request Received — ${shopName}`,
        html: `
          <h2>We received your Premium Listing request!</h2>
          <p>Thanks for your interest in upgrading <strong>${shopName}</strong> on ShieldFinder.</p>
          <p>Here's what happens next:</p>
          <ol>
            <li>We'll send you a <strong>$29 payment request via Payoneer</strong> to this email within a few hours.</li>
            <li>Once you complete the payment, your listing will be upgraded to Premium within 1 hour.</li>
          </ol>
          <p>Your Premium listing will include:</p>
          <ul>
            <li>⭐ Featured badge on your listing</li>
            <li>📌 Top placement in city search results</li>
            <li>✅ "Verified Business" callout</li>
            <li>📞 Prominent direct contact form</li>
          </ul>
          <p>Questions? Reply to this email.</p>
          <p>— ShieldFinder Team</p>
        `,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[upgrade-request] error:', error);
    return NextResponse.json({ error: 'Failed to submit upgrade request' }, { status: 500 });
  }
}
