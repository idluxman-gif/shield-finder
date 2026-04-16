import { NextResponse } from 'next/server';
import { getPremiumRecord } from '@/lib/premium';

export async function POST(request) {
  try {
    const data = await request.json();
    // Support both camelCase (QuoteForm) and snake_case (PremiumLeadForm) field names
    const name = data.name;
    const email = data.email;
    const phone = data.phone;
    const serviceType = data.serviceType || data.service_type;
    const message = data.message;
    const shopName = data.shopName || data.shop_name;
    const shopCity = data.shopCity || data.shop_city;
    const shopState = data.shopState || data.shop_state;
    const shopIndex = data.shop_index ?? null;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_SF;
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.LEAD_NOTIFICATION_EMAIL_SF;

    const payload = {
      name,
      email,
      phone: phone || '',
      serviceType: serviceType || '',
      message: message || '',
      shopName: shopName || '',
      shopCity: shopCity || '',
      shopState: shopState || '',
      submittedAt: new Date().toISOString(),
    };

    // Forward to Google Sheets via Apps Script webhook
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('[lead] webhook error:', err);
      }
    }

    // Send email notification via Resend
    if (resendKey && notifyEmail) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'leads@shieldfinder.com',
            to: [notifyEmail],
            subject: `New Lead: ${name} — ${serviceType || 'auto glass'} at ${shopName}`,
            html: `
              <h2>New Lead from ShieldFinder</h2>
              <table>
                <tr><td><strong>Name</strong></td><td>${name}</td></tr>
                <tr><td><strong>Email</strong></td><td>${email}</td></tr>
                <tr><td><strong>Phone</strong></td><td>${phone || '—'}</td></tr>
                <tr><td><strong>Service</strong></td><td>${serviceType || '—'}</td></tr>
                <tr><td><strong>Message</strong></td><td>${message || '—'}</td></tr>
                <tr><td><strong>Shop</strong></td><td>${shopName}, ${shopCity}, ${shopState}</td></tr>
                <tr><td><strong>Submitted</strong></td><td>${payload.submittedAt}</td></tr>
              </table>
            `,
          }),
        });
      } catch (err) {
        console.error('[lead] resend error:', err);
      }
    }

    // Forward lead to shop owner if premium listing has ownerEmail
    if (shopIndex != null) {
      try {
        const record = await getPremiumRecord(shopIndex);
        const ownerEmail = record?.active && record?.ownerEmail ? record.ownerEmail : null;
        if (resendKey && ownerEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'leads@shieldfinder.com',
              to: [ownerEmail],
              subject: `New quote request: ${serviceType || 'auto glass'} — ${name}`,
              html: `
                <h2>New Quote Request — ShieldFinder.com</h2>
                <p>A customer submitted a quote request for <strong>${shopName}</strong> on ShieldFinder.com.</p>
                <table cellpadding="6" cellspacing="0">
                  <tr><td><strong>Name</strong></td><td>${name}</td></tr>
                  <tr><td><strong>Email</strong></td><td>${email}</td></tr>
                  <tr><td><strong>Phone</strong></td><td>${phone || '—'}</td></tr>
                  <tr><td><strong>Service Type</strong></td><td>${serviceType || '—'}</td></tr>
                  <tr><td><strong>Message</strong></td><td>${message || '—'}</td></tr>
                  <tr><td><strong>Submitted</strong></td><td>${payload.submittedAt}</td></tr>
                </table>
                <p style="margin-top:16px;font-size:13px;color:#64748b;">
                  Reply directly to this email or contact the customer at ${email}.
                </p>
              `,
            }),
          });
        }
      } catch (err) {
        console.error('[lead] Premium owner forwarding error:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[lead] error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
