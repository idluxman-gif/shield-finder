'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UpgradeForm() {
  const params = useSearchParams();
  const shopId = params.get('shopId');
  const shopName = params.get('shopName') || '';
  const cancelled = params.get('cancelled');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!shopId) {
      setError('No shop selected. Please use the upgrade link from your listing page.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, shopName, ownerEmail: email }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit request. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>📬</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0C1A2E', margin: '0 0 12px' }}>Request received!</h2>
        <p style={{ fontSize: 16, color: '#475569', margin: '0 0 24px', lineHeight: 1.6 }}>
          We&apos;ll send a <strong>$29 Payoneer payment request</strong> to <strong>{email}</strong> within a few hours.
          Once you complete the payment, your listing upgrades within 1 hour.
        </p>
        <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: 20, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#0C4A6E', fontWeight: 600 }}>What to expect:</p>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20, color: '#0C4A6E', fontSize: 14, lineHeight: 2 }}>
            <li>Payment request arrives in your inbox via Payoneer</li>
            <li>Pay $29 — takes ~2 minutes</li>
            <li>Your listing upgrades within 1 hour</li>
          </ol>
        </div>
        <Link href="/" style={{ display: 'inline-block', marginTop: 24, color: '#0369A1', fontWeight: 600, textDecoration: 'none' }}>
          Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0C1A2E', margin: '0 0 10px' }}>
          Premium Listing
        </h1>
        <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>
          Stand out from the competition on ShieldFinder
        </p>
      </div>

      {cancelled && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 14, marginBottom: 20, color: '#DC2626', fontSize: 14 }}>
          Your request was cancelled — no charge was made.
        </div>
      )}

      {shopName && (
        <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 15, color: '#0C4A6E' }}>
          Upgrading: <strong>{decodeURIComponent(shopName)}</strong>
        </div>
      )}

      <div style={{ background: '#fff', border: '2px solid #06B6D4', borderRadius: 14, padding: 28, marginBottom: 28, boxShadow: '0 4px 20px rgba(6,182,212,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#06B6D4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Premium Plan</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0C1A2E' }}>$29<span style={{ fontSize: 15, fontWeight: 500, color: '#64748B' }}>/month</span></div>
          </div>
          <span style={{ background: '#06B6D4', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            ✓ Most Popular
          </span>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px' }}>
          {[
            '⭐ Featured badge on your listing',
            '📌 Top placement in city search results',
            '✅ "Verified Business" callout',
            '📞 Prominent direct contact form',
            '📊 Enhanced listing with more details',
          ].map((item, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 14, color: '#334155', borderBottom: i < 4 ? '1px solid #F1F5F9' : 'none' }}>
              {item}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Your email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0' }}>
              We&apos;ll send your Payoneer payment request here.
            </p>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: 10, marginBottom: 14, color: '#DC2626', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !shopId}
            style={{
              width: '100%',
              background: loading ? '#9CA3AF' : '#0369A1',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '14px 24px',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading || !shopId ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Submitting...' : 'Request Premium Upgrade →'}
          </button>

          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: '10px 0 0' }}>
            Payment via Payoneer · $29/month · Cancel anytime
          </p>
        </form>
      </div>

      {!shopId && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 14 }}>
            To upgrade, visit your shop page and click the upgrade button.
          </p>
          <Link href="/" style={{ color: '#0369A1', fontWeight: 600, textDecoration: 'none' }}>
            Browse directory →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function UpgradePage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ background: '#0369A1', padding: '12px 24px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>
          🛡️ ShieldFinder
        </Link>
      </div>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>Loading...</div>}>
        <UpgradeForm />
      </Suspense>
    </div>
  );
}
