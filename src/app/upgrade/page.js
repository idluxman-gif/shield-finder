'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UpgradeForm() {
  const params = useSearchParams();
  const shopId = params.get('shopId');
  const shopName = params.get('shopName') || '';
  const cancelled = params.get('cancelled');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpgrade() {
    if (!shopId) {
      setError('No shop selected. Please use the upgrade link from your listing page.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, shopName }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0C1A2E', margin: '0 0 12px' }}>
          Premium Listing
        </h1>
        <p style={{ fontSize: 17, color: '#64748B', margin: 0 }}>
          Stand out from the competition on ShieldFinder
        </p>
      </div>

      {cancelled && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 16, marginBottom: 24, color: '#DC2626', fontSize: 14 }}>
          Checkout was cancelled — no charge was made. You can try again below.
        </div>
      )}

      {shopName && (
        <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: 16, marginBottom: 24, fontSize: 15, color: '#0C4A6E' }}>
          Upgrading: <strong>{decodeURIComponent(shopName)}</strong>
        </div>
      )}

      <div style={{ background: '#fff', border: '2px solid #06B6D4', borderRadius: 16, padding: 32, marginBottom: 32, boxShadow: '0 4px 24px rgba(6,182,212,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#06B6D4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Premium Plan</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#0C1A2E' }}>$29<span style={{ fontSize: 16, fontWeight: 500, color: '#64748B' }}>/month</span></div>
          </div>
          <span style={{ background: '#06B6D4', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            ✓ Most Popular
          </span>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
          {[
            '⭐ Featured badge on your listing',
            '📌 Top placement in city search results',
            '✅ "Verified Business" callout',
            '📞 Prominent direct contact form',
            '📊 Enhanced listing with more details',
            '🔔 Instant lead email notifications',
          ].map((item, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 15, color: '#334155', borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none' }}>
              {item}
            </li>
          ))}
        </ul>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: 12, marginBottom: 16, color: '#DC2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading || !shopId}
          style={{
            width: '100%',
            background: loading ? '#9CA3AF' : '#0369A1',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '16px 24px',
            fontSize: 17,
            fontWeight: 700,
            cursor: loading || !shopId ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Redirecting to checkout...' : 'Upgrade for $29/month →'}
        </button>

        <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: '12px 0 0' }}>
          Secure payment via Stripe · Cancel anytime
        </p>
      </div>

      {!shopId && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            To upgrade your listing, visit your shop page and click the upgrade button.
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
