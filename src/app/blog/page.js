import Link from 'next/link';
import { blogPosts } from '@/data/blogPosts';
import { siteConfig } from '@/config/site';
import PageNav from '@/components/PageNav';

const { domain, displayName, primaryColor } = siteConfig;

export const metadata = {
  title: `Auto Glass Repair Tips & Guides | ${displayName} Blog`,
  description:
    'Expert guides on windshield replacement costs, insurance claims, chip repair, ADAS recalibration, and more. Everything you need to know about auto glass repair.',
  alternates: { canonical: `${domain}/blog/` },
  openGraph: {
    title: `Auto Glass Repair Tips & Guides | ${displayName} Blog`,
    description:
      'Expert guides on windshield replacement costs, insurance claims, chip repair, ADAS recalibration, and more.',
    type: 'website',
    url: `${domain}/blog`,
  },
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const CATEGORY_COLORS = {
  'Cost & Pricing': { bg: '#E0F2FE', color: '#0369A1' },
  'Insurance': { bg: '#DCFCE7', color: '#15803D' },
  'Repair vs. Replace': { bg: '#FEF9C3', color: '#92400E' },
  'ADAS & Technology': { bg: '#EDE9FE', color: '#6D28D9' },
  'Mobile Service': { bg: '#FCE7F3', color: '#9D174D' },
  'Service & Scheduling': { bg: '#FFEDD5', color: '#9A3412' },
  'Local Guides': { bg: '#DBEAFE', color: '#1E40AF' },
  'City Guides': { bg: '#DBEAFE', color: '#1E40AF' },
};

export default function BlogIndexPage() {
  const sorted = [...blogPosts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const featured = sorted[0];
  const rest = sorted.slice(1);

  return (
    <div style={{ minHeight: '100vh', background: '#F0F9FF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PageNav />

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #ffffff 0%, #E0F2FE 100%)', borderBottom: '1px solid #BAE6FD', padding: '48px 20px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#E0F2FE', color: primaryColor, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Auto Glass Resource Center
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: '#0C1A2E', margin: '0 0 12px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', lineHeight: 1.2 }}>
            Windshield & Auto Glass Guides
          </h1>
          <p style={{ fontSize: 17, color: '#475569', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
            Straightforward answers on replacement costs, insurance, chip repair, ADAS recalibration, and more — from the team at ShieldFinder.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* Featured Post */}
        {featured && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Featured</div>
            <Link href={`/blog/${featured.slug}`} style={{ textDecoration: 'none', display: 'block' }} className="blog-featured-link">
              <div className="blog-featured-card" style={{
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #BAE6FD',
                padding: '32px 36px',
                transition: 'box-shadow 0.2s',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {(() => {
                    const cat = CATEGORY_COLORS[featured.category] || { bg: '#E0F2FE', color: primaryColor };
                    return (
                      <span style={{ background: cat.bg, color: cat.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
                        {featured.category}
                      </span>
                    );
                  })()}
                  <span style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>{featured.readMinutes} min read</span>
                </div>
                <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: '#0C1A2E', margin: '0 0 12px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', lineHeight: 1.3 }}>
                  {featured.title}
                </h2>
                <p style={{ fontSize: 16, color: '#475569', margin: '0 0 20px', lineHeight: 1.6 }}>
                  {featured.excerpt}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    <span style={{ fontWeight: 600, color: '#0C1A2E' }}>{featured.author}</span>
                    {' · '}
                    {formatDate(featured.publishedAt)}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: primaryColor }}>Read article →</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Post Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {rest.map(post => {
            const cat = CATEGORY_COLORS[post.category] || { bg: '#E0F2FE', color: primaryColor };
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: '24px',
                  height: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    <span style={{ background: cat.bg, color: cat.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                      {post.category}
                    </span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{post.readMinutes} min</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C1A2E', margin: '0 0 10px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', lineHeight: 1.4, flexGrow: 1 }}>
                    {post.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.excerpt}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>{formatDate(post.publishedAt)}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: primaryColor }}>Read →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 56, background: '#0369A1', borderRadius: 16, padding: '36px 32px', textAlign: 'center', color: '#fff' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
            Ready to Find a Shop Near You?
          </h2>
          <p style={{ fontSize: 15, margin: '0 0 20px', opacity: 0.85 }}>
            Use ShieldFinder to compare verified auto glass shops in your area — with ratings, insurance direct billing info, and mobile service availability.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#fff', color: '#0369A1', fontWeight: 700, fontSize: 15, padding: '12px 28px', borderRadius: 10, textDecoration: 'none' }}>
            Find Auto Glass Shops →
          </Link>
        </div>
      </div>
      <style>{`
        .blog-featured-card:hover { box-shadow: 0 8px 32px rgba(3,105,161,0.12); }
      `}</style>
    </div>
  );
}
