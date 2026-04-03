import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, email, phone, serviceType, message, shopName, shopCity, shopState } = data;

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[lead] error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
