"use client";
import { useState } from "react";

export default function QuoteForm({ shopName, shopCity, shopState }) {
  const [fields, setFields] = useState({ name: '', email: '', phone: '', serviceType: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  function handleChange(e) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, shopName, shopCity, shopState, site: 'shieldfinder' }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0C1A2E', marginTop: 0, marginBottom: 8, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        &#x1f50d; Get a Free Quote from {shopName}
      </h2>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
        Fill out the form below and we&rsquo;ll connect you with this shop.
      </p>
      {status === 'success' ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#x2705;</div>
          <h3 style={{ color: '#0369A1', margin: '0 0 8px' }}>Quote Requested!</h3>
          <p style={{ color: '#64748B', fontSize: 14 }}>We&rsquo;ve received your request. For the fastest response, call the shop directly.</p>
        </div>
      ) : status === 'error' ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#x26a0;&#xfe0f;</div>
          <h3 style={{ color: '#dc2626', margin: '0 0 8px' }}>Submission Failed</h3>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>Something went wrong. Please try calling the shop directly.</p>
          <button onClick={() => setStatus('idle')}
            style={{ background: '#0369A1', color: '#fff', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input type="text" name="name" placeholder="Your Name" required value={fields.name} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 14, outline: 'none' }} />
          <input type="email" name="email" placeholder="Email Address" required value={fields.email} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 14, outline: 'none' }} />
          <input type="tel" name="phone" placeholder="Phone Number" value={fields.phone} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 14, outline: 'none' }} />
          <select name="serviceType" value={fields.serviceType} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 14, outline: 'none', background: '#fff' }}>
            <option value="">Service Type</option>
            <option>Windshield Replacement</option>
            <option>Windshield Chip Repair</option>
            <option>Side Window Replacement</option>
            <option>Rear Window Replacement</option>
            <option>ADAS Recalibration</option>
            <option>Mobile Service</option>
            <option>Other</option>
          </select>
          <textarea name="message" placeholder="Tell us more about your vehicle or damage..." rows={3} value={fields.message} onChange={handleChange}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 14, outline: 'none', gridColumn: '1 / -1', resize: 'vertical' }} />
          <button type="submit" disabled={status === 'submitting'}
            style={{ gridColumn: '1 / -1', background: status === 'submitting' ? '#6b7280' : '#0369A1', color: '#fff', padding: '12px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 15, cursor: status === 'submitting' ? 'not-allowed' : 'pointer' }}>
            {status === 'submitting' ? 'Sending...' : 'Get Free Quote'}
          </button>
        </form>
      )}
    </div>
  );
}
