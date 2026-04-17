import Link from 'next/link';
import PageNav from '@/components/PageNav';
import { siteConfig } from '@/config/site';

const { domain } = siteConfig;

export const metadata = {
  title: `About ShieldFinder | Independent Auto Glass Repair Directory`,
  description: 'ShieldFinder is a free, consumer-focused directory of verified independent auto glass shops across all 50 states. Learn how we verify listings, why we built it, how listings work, and how we make money — plainly stated.',
  alternates: { canonical: `${domain}/about` },
};

const h2Style = { fontSize: 22, fontWeight: 800, color: '#0C1A2E', margin: '32px 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" };
const linkStyle = { color: '#0369A1' };

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

          <h2 style={{ ...h2Style, margin: '0 0 12px' }}>What ShieldFinder Is</h2>
          <p>ShieldFinder is a free, consumer-first directory of independent auto glass repair shops covering all 50 states. Every shop listed here is a standalone local business &mdash; not a Safelite franchise, not a chain subsidiary, and not part of an insurance referral network. We have no ownership ties to Safelite, Glass Doctor, or any national chain.</p>
          <p>Our goal is to help drivers find a real, accountable auto glass specialist without wading through ads, lead-capture forms, or generic review sites. Unlike Yelp or Google Maps, every business in our directory is a verified auto glass specialist &mdash; not a general mechanic or a body shop that happens to do glass. We show you transparent ratings, a working phone number, and a physical address. No sign-ups, no spammy contact forms, and no selling your information to third-party lead buyers.</p>

          <h2 style={h2Style}>How Shops Are Listed and Verified</h2>
          <p>Every shop in our directory passes a four-point verification check before going live:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 16px' }}>
            <li><strong>Active business license</strong> &mdash; confirmed through state or county business registries</li>
            <li><strong>Verified working phone number</strong> &mdash; the listed number reaches a real auto glass business during normal hours</li>
            <li><strong>Minimum review threshold</strong> &mdash; at least 10 public customer reviews with a 4.0+ average rating</li>
            <li><strong>Physical address confirmed</strong> &mdash; a real street address, cross-checked against the shop&rsquo;s Google Business Profile &mdash; no P.O. boxes or virtual offices</li>
          </ul>
          <p>Where applicable, we give preference to shops carrying <strong>Auto Glass Safety Council (AGSC)</strong> certification, the industry standard for safe windshield installation. We actively remove any shop flagged for insurance fraud, unresolved BBB complaints, or a pattern of negative reviews we can verify. If a shop you find is closed, inaccurate, or looks suspicious, <Link href="/contact" style={linkStyle}>let us know</Link> and we&rsquo;ll investigate within 48 hours.</p>

          <h2 style={h2Style}>Our Mission</h2>
          <p>ShieldFinder is run by a small, independent team. We built this directory because searching &ldquo;auto glass repair near me&rdquo; returns the same thing in every city: Safelite, Safelite, and more Safelite. Independent shops &mdash; often cheaper, faster, and personally accountable &mdash; get buried simply because they can&rsquo;t out-bid a national chain on Google ads.</p>
          <p>We&rsquo;re consumer-first and shop-friendly. Organic rankings on ShieldFinder cannot be bought. A shop&rsquo;s position in search results and state listings is based entirely on verification status, review quality, and relevance &mdash; never on whether they pay us. Any paid Premium listings are clearly marked and kept visually separate from organic results.</p>

          <h2 style={h2Style}>How to Claim or Upgrade a Listing</h2>
          <p>A free baseline listing is available to any auto glass shop that passes our verification. Shop owners who want more visibility can upgrade to a <strong>Premium listing for $29/month</strong>, which adds a photo gallery, a direct lead form, a featured badge on city and state pages, a custom business description, and priority placement above standard listings (always labeled as &ldquo;Featured&rdquo;).</p>
          <p>To claim your shop, visit the individual listing and use the Claim button, or go directly to <code>/claim/[shop-slug]</code> and submit the claim form. We verify claims within 1&ndash;2 business days. Questions about listings, claims, upgrades, or corrections? Reach us at <strong>info@shieldfinder.com</strong>.</p>

          <h2 style={h2Style}>How We Make Money</h2>
          <p>Full transparency: ShieldFinder is funded by (1) Google AdSense display ads on the site and (2) optional Premium listings for shop owners, which are always clearly marked. We do <strong>not</strong> accept payment in exchange for organic ranking, and we do not sell consumer leads or contact information to third parties.</p>

        </div>
      </div>
    </div>
  );
}
