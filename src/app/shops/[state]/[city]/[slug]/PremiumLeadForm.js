"use client";
import { useState } from "react";

export default function PremiumLeadForm({ shopName, shopCity, shopState, shopSlug, shopIndex }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", serviceType: "", message: "",
  });

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          serviceType: form.serviceType,
          message: form.message,
          shop_name: shopName,
          shop_city: shopCity,
          shop_state: shopState,
          shop_slug: shopSlug,
          shop_index: shopIndex,
          site: "shieldfinder",
          submitted_at: new Date().toISOString(),
        }),
      });
    } catch (_) {
      // never surface errors to user
    }
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{ background: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
        <h3 style={{ color: '#1E40AF', margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Request Sent!</h3>
        <p style={{ color: '#1D4ED8', fontSize: 14, margin: 0 }}>
          {shopName} will be in touch with you shortly.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#EFF6FF', border: '2px solid #0369A1', borderRadius: 16, padding: '22px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>🛡️</span>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1E40AF', margin: 0 }}>
          Request a Quote from {shopName}
        </h2>
      </div>
      <p style={{ fontSize: 13, color: '#1D4ED8', marginBottom: 16, marginTop: 4 }}>
        Featured shop — fill out the form and they&apos;ll respond directly to you.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input
            name="name" type="text" placeholder="Your full name" required
            value={form.name} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #93C5FD', fontSize: 14, outline: 'none', background: '#fff' }}
          />
          <input
            name="email" type="email" placeholder="Email address" required
            value={form.email} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #93C5FD', fontSize: 14, outline: 'none', background: '#fff' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input
            name="phone" type="tel" placeholder="(555) 000-0000"
            value={form.phone} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #93C5FD', fontSize: 14, outline: 'none', background: '#fff' }}
          />
          <select
            name="serviceType" required
            value={form.serviceType} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #93C5FD', fontSize: 14, outline: 'none', background: '#fff' }}
          >
            <option value="">Service Type</option>
            <option>Windshield Replacement</option>
            <option>Chip / Crack Repair</option>
            <option>Side Window</option>
            <option>Rear Window</option>
            <option>ADAS Recalibration</option>
          </select>
        </div>
        <textarea
          name="message" placeholder="Vehicle make/model, insurance info, or other details…" rows={3}
          value={form.message} onChange={handleChange}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #93C5FD', fontSize: 14, outline: 'none', resize: 'vertical', background: '#fff' }}
        />
        <button
          type="submit" disabled={submitting}
          style={{
            background: '#0369A1', color: '#fff', padding: '12px 24px', borderRadius: 10,
            border: 'none', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Sending…' : '🛡️ Get My Free Quote'}
        </button>
      </form>
    </div>
  );
}
