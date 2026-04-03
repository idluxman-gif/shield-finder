import Link from 'next/link';
import PageNav from '@/components/PageNav';
import { siteConfig } from '@/config/site';

const { domain } = siteConfig;

export const metadata = {
  title: `About ShieldFinder | Independent Auto Glass Repair Directory`,
  description: 'ShieldFinder is a vetted directory of independent auto glass shops — not Safelite, not chains. Learn how we verify listings and why we built it.',
  alternates: { canonical: `${domain}/about` },
};

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F0F9FF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PageNav />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 48px' }}>
        <nav style={{ marginBottom: 20, fontSize: 12, color: '#94A3B8' }}>
          <Link href="/" style={{ color: '#94A3B8', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <span style={{ color: '#64748B' }}>About</span>
        </nav>

        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: '#0C1A2E', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          About ShieldFinder
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 16, color: '#64748B', lineHeight: 1.5 }}>
          A directory of independent auto glass shops. Not Safelite. Not chains.
        </p>

        <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.8 }}>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A2E', margin: '0 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>What ShieldFinder Is</h2>
          <p>ShieldFinder is a free directory of verified, independent auto glass repair shops across the United States. Every shop listed here is a standalone local business — not a Safelite franchise, not a chain affiliate, not a referral network.</p>
          <p>You can search by state and city, filter by service type or mobile availability, and get directly to the shops that fit your needs. No sign-ups. No paid placements. No results manipulated by advertising relationships.</p>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A2E', margin: '32px 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>What &ldquo;Verified&rdquo; Means</h2>
          <p>Every shop on ShieldFinder has passed a four-point verification check:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 16px' }}>
            <li><strong>Active business license</strong> &mdash; confirmed through state or county business registries</li>
            <li><strong>Verified phone number</strong> &mdash; the listed number reaches a working auto glass business</li>
            <li><strong>Minimum review threshold</strong> &mdash; at least 10 customer reviews with a 4.0+ average rating</li>
            <li><strong>Physical address confirmed</strong> &mdash; a real street address, no P.O. boxes or virtual offices</li>
          </ul>
          <p>Listings that fail any check are removed. If a shop you find is closed or incorrect, <Link href="/contact" style={{ color: '#0369A1' }}>let us know</Link> and we&rsquo;ll fix it within 48 hours.</p>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A2E', margin: '32px 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Why We Built It</h2>
          <p>Search for &ldquo;auto glass repair near me&rdquo; and the first page is Safelite, Safelite, and more Safelite. Independent shops &mdash; often cheaper, faster, and personally accountable &mdash; are buried.</p>
          <p>That gap is the reason ShieldFinder exists. Independent shops do the same work, frequently for less money, and they have an actual owner you can talk to if something goes wrong. They just can&rsquo;t out-spend a national chain on Google ads.</p>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A2E', margin: '32px 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Who Maintains It</h2>
          <p>ShieldFinder is operated by a small team that builds local search directories for specialized service industries. We cover our costs through display advertising on listing pages. Shops cannot pay to be listed or to rank higher &mdash; inclusion is based entirely on verification, not budget.</p>
          <p>Questions? Reach us at <strong>info@shieldfinder.com</strong>. We respond within 1&ndash;2 business days.</p>

        </div>
      </div>
    </div>
  );
}
