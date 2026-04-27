import Link from 'next/link';
import {
  shops, stateNames, findStateCode, getStateSlug, getCitySlug, getShopSlug,
  getShopPath, getStatePath, getCityPath, SERVICE_LABELS,
} from '@/data/shops';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import PageNav from '@/components/PageNav';
import nextDynamic from 'next/dynamic';
import QuoteForm from './QuoteForm';
import PremiumLeadForm from './PremiumLeadForm';
import { isPremium } from '@/lib/premium';

export const dynamic = 'force-dynamic';

const PhoneLink = nextDynamic(() => import('@/components/TrackingLinks').then(m => ({ default: m.PhoneLink })), { ssr: false });
const OutboundLink = nextDynamic(() => import('@/components/TrackingLinks').then(m => ({ default: m.OutboundLink })), { ssr: false });

const { listing, domain, displayName } = siteConfig;

export function generateStaticParams() {
  return shops.map(s => ({
    state: getStateSlug(s.s),
    city: getCitySlug(s.c),
    slug: getShopSlug(s),
  }));
}

export function generateMetadata({ params }) {
  const shop = shops.find(s =>
    getStateSlug(s.s) === params.state &&
    getCitySlug(s.c) === params.city &&
    getShopSlug(s) === params.slug
  );
  if (!shop) return {};
  const stateName = stateNames[shop.s];
  return {
    title: `${shop.n} - ${listing.categoryLabel} in ${shop.c}, ${stateName} | ${displayName}`,
    description: `${shop.n} in ${shop.c}, ${stateName}. ${shop.r}★ rating from ${shop.v.toLocaleString()} reviews. ${listing.metaSavings}`,
    alternates: { canonical: `/${siteConfig.listingsRoute}/${params.state}/${params.city}/${params.slug}/` },
    // Individual shop detail pages are profile-style listings without enough
    // unique editorial content to warrant indexing on their own. They remain
    // accessible to visitors and crawlers (follow), but should not be indexed
    // — this prevents thousands of thin pages from diluting the site's
    // overall content-quality signal.
    robots: { index: false, follow: true },
  };
}

export default async function ShopPage({ params }) {
  const shop = shops.find(s =>
    getStateSlug(s.s) === params.state &&
    getCitySlug(s.c) === params.city &&
    getShopSlug(s) === params.slug
  );
  if (!shop) notFound();

  const premium = await isPremium(shop.i);
  const stateName = stateNames[shop.s];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.n + ' ' + shop.a)}`;
  const otherShops = shops.filter(s => s.c === shop.c && s.s === shop.s && s.i !== shop.i).slice(0, 4);

  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "name": shop.n,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": shop.a.split(',')[0],
      "addressLocality": shop.c,
      "addressRegion": shop.s,
      "addressCountry": "US",
    },
    "telephone": shop.p,
    "url": shop.w || `${domain}${getShopPath(shop)}`,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": shop.r,
      "reviewCount": shop.v,
    },
    "priceRange": shop.pr,
    ...(shop.hours ? {
      "openingHoursSpecification": DAY_ORDER
        .filter(d => shop.hours[d] && shop.hours[d] !== 'Closed')
        .map(d => ({
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": `https://schema.org/${d}`,
          "opens": shop.hours[d].split('–')[0]?.trim() || '',
          "closes": shop.hours[d].split('–')[1]?.trim() || '',
        })),
    } : {}),
    ...(shop.reviews && shop.reviews.length > 0 ? {
      "review": shop.reviews.map(rv => ({
        "@type": "Review",
        "author": { "@type": "Person", "name": rv.author },
        "reviewRating": { "@type": "Rating", "ratingValue": rv.rating, "bestRating": 5 },
        "reviewBody": rv.text,
        "datePublished": rv.date,
      })),
    } : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": domain },
      { "@type": "ListItem", "position": 2, "name": stateName, "item": `${domain}${getStatePath(shop.s)}` },
      { "@type": "ListItem", "position": 3, "name": shop.c, "item": `${domain}${getCityPath(shop.s, shop.c)}` },
      { "@type": "ListItem", "position": 4, "name": shop.n },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#F0F9FF', minHeight: '100vh' }}>
        <PageNav />

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 24px' }}>
          {/* Breadcrumbs */}
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
            <Link href="/" style={{ color: '#0369A1', textDecoration: 'none' }}>Home</Link>
            <span style={{ margin: '0 6px' }}>/</span>
            <Link href={getStatePath(shop.s)} style={{ color: '#0369A1', textDecoration: 'none' }}>{stateName}</Link>
            <span style={{ margin: '0 6px' }}>/</span>
            <Link href={getCityPath(shop.s, shop.c)} style={{ color: '#0369A1', textDecoration: 'none' }}>{shop.c}</Link>
            <span style={{ margin: '0 6px' }}>/</span>
            <span style={{ color: '#0C1A2E' }}>{shop.n}</span>
          </div>

          {/* Shop hero card */}
          <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: premium ? '2px solid #0369A1' : '1px solid #BAE6FD', marginBottom: 24 }}>
            {premium && (
              <div style={{ background: '#0369A1', color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', padding: '6px 0', letterSpacing: '0.06em' }}>
                ★ FEATURED LISTING — Premium Partner
              </div>
            )}
            {/* Store photo */}
            {shop.img && (
              <div style={{ width: '100%', height: 220, overflow: 'hidden', position: 'relative' }}>
                <img
                  src={shop.img}
                  alt={`${shop.n} storefront`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}
            {/* Hero header */}
            <div style={{ background: premium ? 'linear-gradient(135deg, #0C4A6E 0%, #075985 50%, #0369A1 100%)' : 'linear-gradient(135deg, #0369A1 0%, #0284C7 100%)', padding: '28px 24px 22px' }}>
              {premium && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: '#F59E0B', color: '#0C1A2E', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>
                    ⭐ PREMIUM LISTING
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    ✓ Verified Business
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: '#fff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{shop.n}</h1>
                  <p style={{ margin: '0 0 10px', opacity: 0.85, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}>
                    📍 {shop.a}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#FDE68A', fontSize: 15 }}>{'★'.repeat(Math.round(shop.r))}</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{shop.r}</span>
                    <span style={{ opacity: 0.75, color: '#fff', fontSize: 13 }}>({shop.v.toLocaleString()} reviews)</span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                      {shop.pr === '$' ? '$ Budget' : shop.pr === '$$$' ? '$$$ Premium' : '$$ Mid-Range'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Badges */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {shop.ins && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                    🛡 Insurance Direct
                  </span>
                )}
                {shop.mob && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FEF3C7', color: '#0C1A2E', padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                    📱 Mobile Service
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {/* CTAs */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                {shop.p && (
                  <PhoneLink href={`tel:${shop.p.replace(/[^+\d]/g, '')}`}
                    style={{ background: '#0369A1', color: '#fff', padding: '12px 22px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    📞 Call Now: {shop.p}
                  </PhoneLink>
                )}
                {shop.w && (
                  <OutboundLink href={shop.w} target="_blank" rel="noopener noreferrer"
                    style={{ background: '#E0F2FE', color: '#0369A1', padding: '12px 22px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    🌐 Visit Website
                  </OutboundLink>
                )}
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#F59E0B', color: '#fff', padding: '12px 22px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  📍 Get Directions
                </a>
              </div>

              {/* Services offered */}
              {shop.svc && shop.svc.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0C1A2E', marginBottom: 10, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Services Offered</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {shop.svc.map(st => (
                      <span key={st} style={{ padding: '5px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>
                        {SERVICE_LABELS[st]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Address', value: shop.a },
                  { label: 'Phone', value: shop.p || 'Not available' },
                  { label: 'Rating', value: `${shop.r}/5 (${shop.v.toLocaleString()} reviews)` },
                  { label: 'Price Range', value: shop.pr === '$' ? 'Budget-Friendly' : shop.pr === '$$$' ? 'Premium' : 'Mid-Range' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#F0F9FF', padding: 14, borderRadius: 10, border: '1px solid #BAE6FD' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: '#0C1A2E', fontWeight: 500 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Hours of operation */}
              {shop.hours && (
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0C1A2E', marginBottom: 10, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Hours of Operation</h2>
                  <div style={{ background: '#F0F9FF', borderRadius: 12, border: '1px solid #BAE6FD', overflow: 'hidden' }}>
                    {DAY_ORDER.map((day, idx) => {
                      const hoursText = shop.hours[day];
                      const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                      const isClosed = !hoursText || hoursText === 'Closed';
                      return (
                        <div key={day} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '9px 16px',
                          background: isToday ? '#E0F2FE' : 'transparent',
                          borderBottom: idx < 6 ? '1px solid #BAE6FD' : 'none',
                        }}>
                          <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#0369A1' : '#374151', minWidth: 100 }}>
                            {day}{isToday ? ' (Today)' : ''}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isClosed ? '#94A3B8' : (isToday ? '#0369A1' : '#0C1A2E') }}>
                            {hoursText || 'Closed'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Map embed */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0C1A2E', marginBottom: 10, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Location</h2>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #BAE6FD' }}>
                  <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(shop.a)}&output=embed`}
                    width="100%"
                    height="280"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map showing ${shop.n} location`}
                  />
                </div>
              </div>

              {/* About */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0C1A2E', marginBottom: 8, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>About {shop.n}</h2>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
                  {shop.n} is an {listing.categoryLabel.toLowerCase()} {listing.singular} located in {shop.c}, {stateName}.
                  {shop.ins ? ' They work directly with insurance providers for hassle-free claims.' : ''}
                  {shop.mob ? ' Mobile service available — they come to you.' : ''}
                  {' '}With a {shop.r}-star rating from {shop.v.toLocaleString()} reviews, they are
                  a {shop.r >= 4.7 ? 'highly-rated' : 'well-reviewed'} {listing.singular} in the {shop.c} area.
                </p>
              </div>

              {/* Lead form — premium gets dedicated PremiumLeadForm, others get generic QuoteForm */}
              {premium ? (
                <div style={{ marginBottom: 24 }}>
                  <PremiumLeadForm
                    shopName={shop.n}
                    shopCity={shop.c}
                    shopState={stateName}
                    shopSlug={getShopSlug(shop)}
                    shopIndex={shop.i}
                  />
                </div>
              ) : (
                <>
                  <QuoteForm shopName={shop.n} shopCity={shop.c} shopState={stateName} />

                  {/* Claim Your Listing CTA */}
                  <div style={{ background: '#E0F2FE', border: '1px dashed #0369A1', borderRadius: 12, padding: '16px 20px', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0C4A6E', marginBottom: 2 }}>🏆 Is this your shop?</div>
                      <div style={{ fontSize: 13, color: '#0369A1' }}>Claim your listing to get a Featured badge, top placement, and a dedicated lead form.</div>
                    </div>
                    <Link href={`/claim/${getShopSlug(shop)}`}
                      style={{ background: '#0369A1', color: '#fff', padding: '10px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Claim Your Listing →
                    </Link>
                  </div>
                </>
              )}

              {/* Customer reviews */}
              {shop.reviews && shop.reviews.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0C1A2E', marginBottom: 10, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>What Customers Say</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {shop.reviews.slice(0, 5).map((rv, idx) => (
                      <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #0369A1, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{rv.author.charAt(0)}</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0C1A2E' }}>{rv.author}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#F59E0B', fontSize: 12 }}>{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                              <span style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(rv.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.65 }}>&ldquo;{rv.text}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 10, marginBottom: 0 }}>
                    Reviews sourced from Google. Showing {Math.min(shop.reviews.length, 5)} of {shop.v.toLocaleString()} total reviews.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Other shops in city */}
          {otherShops.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0C1A2E', marginBottom: 14, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                Other {listing.plural} in {shop.c}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
                {otherShops.map(other => (
                  <Link key={other.i} href={getShopPath(other)}
                    style={{ background: '#fff', borderRadius: 14, textDecoration: 'none', color: 'inherit', border: '1px solid #BAE6FD', padding: 16, display: 'block' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#0C1A2E', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{other.n}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: '#F59E0B' }}>{'★'.repeat(Math.round(other.r))}</span>
                      <span style={{ color: '#64748B' }}>{other.r} ({other.v.toLocaleString()})</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {other.ins && <span style={{ fontSize: 10, fontWeight: 700, color: '#0369A1', background: '#E0F2FE', padding: '2px 7px', borderRadius: 8 }}>✓ Insurance</span>}
                      {other.mob && <span style={{ fontSize: 10, fontWeight: 700, color: '#0C1A2E', background: '#FEF3C7', padding: '2px 7px', borderRadius: 8 }}>🚗 Mobile</span>}
                    </div>
                    {other.p && <p style={{ fontSize: 12, color: '#64748B', margin: '7px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>{other.p}</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ textAlign: 'center', padding: '20px 0 44px', display: 'flex', justifyContent: 'center', gap: 22, flexWrap: 'wrap' }}>
            <Link href={getCityPath(shop.s, shop.c)} style={{ color: '#0369A1', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
              &larr; All {shop.c} {listing.plural}
            </Link>
            <Link href={getStatePath(shop.s)} style={{ color: '#0369A1', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
              All {stateName} {listing.plural}
            </Link>
            <Link href="/" style={{ color: '#0369A1', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
              Full Directory
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
