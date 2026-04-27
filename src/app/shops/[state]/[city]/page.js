import Link from 'next/link';
import { shops, stateNames, findStateCode, getStateSlug, getCitySlug, getShopPath, getStatePath, getCityPath } from '@/data/shops';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import PageNav from '@/components/PageNav';
import ShopListClient from '@/components/ShopListClient';
import { Suspense } from 'react';
import { isPremium } from '@/lib/premium';
import { cityEditorial } from '@/data/cityEditorial';

// Cities with fewer than this many shops AND no editorial block are
// considered thin pages — they get noindex,follow to keep them out of
// Google's index without breaking the in-site browsing flow.
const MIN_CITY_SHOPS_FOR_INDEX = 5;

const TIER_CONFIG = {
  '$':   { bg: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', accent: '#94A3B8', label: '$ Budget' },
  '$$':  { bg: 'linear-gradient(135deg, #0C4A6E 0%, #075985 100%)', accent: '#7DD3FC', label: '$$ Mid-Range' },
  '$$$': { bg: 'linear-gradient(135deg, #7C2D12 0%, #9A3412 100%)', accent: '#FCD34D', label: '$$$ Premium' },
};

function getInitials(name) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const { listing, domain, displayName } = siteConfig;

export function generateStaticParams() {
  const combos = new Set();
  const params = [];
  for (const s of shops) {
    const key = `${s.s}-${s.c}`;
    if (!combos.has(key)) {
      combos.add(key);
      params.push({ state: getStateSlug(s.s), city: getCitySlug(s.c) });
    }
  }
  return params;
}

export function generateMetadata({ params }) {
  const stateCode = findStateCode(params.state);
  if (!stateCode) return {};
  const stateName = stateNames[stateCode];
  const cityShops = shops.filter(s => s.s === stateCode && getCitySlug(s.c) === params.city);
  if (cityShops.length === 0) return {};
  const cityName = cityShops[0].c;
  const hasEditorial = !!cityEditorial[`${stateCode}-${cityName}`];
  const isThin = cityShops.length < MIN_CITY_SHOPS_FOR_INDEX && !hasEditorial;
  return {
    title: `${listing.categoryLabel} ${listing.plural} in ${cityName}, ${stateName} | ${displayName}`,
    description: `Find ${cityShops.length} ${listing.categoryLabel.toLowerCase()} ${listing.plural} in ${cityName}, ${stateName}. ${listing.metaSavings}`,
    alternates: { canonical: `/${siteConfig.listingsRoute}/${params.state}/${params.city}/` },
    robots: isThin ? { index: false, follow: true } : undefined,
  };
}

export default async function CityPage({ params }) {
  const stateCode = findStateCode(params.state);
  if (!stateCode) notFound();
  const stateName = stateNames[stateCode];
  const cityShops = shops
    .filter(s => s.s === stateCode && getCitySlug(s.c) === params.city)
    .sort((a, b) => b.v - a.v);
  if (cityShops.length === 0) notFound();
  const cityName = cityShops[0].c;

  const premiumChecks = await Promise.all(cityShops.map(s => isPremium(s.i)));
  const premiumShopIds = cityShops.filter((s, idx) => premiumChecks[idx]).map(s => s.i);

  const editorial = cityEditorial[`${stateCode}-${cityName}`];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#F0F9FF', minHeight: '100vh' }}>
      <PageNav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px' }}>
        {/* Breadcrumbs */}
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
          <Link href="/" style={{ color: '#0369A1', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <Link href={getStatePath(stateCode)} style={{ color: '#0369A1', textDecoration: 'none' }}>{stateName}</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <span style={{ color: '#0C1A2E' }}>{cityName}</span>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0C1A2E', margin: '12px 0 6px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          {listing.categoryLabel} {listing.plural} in {cityName}, {stateName}
        </h1>
        <p style={{ color: '#64748B', fontSize: 15, margin: '0 0 28px' }}>
          {cityShops.length} verified {cityShops.length === 1 ? listing.singular : listing.plural}. {listing.metaSavings}
        </p>

        {/* Editorial intro block */}
        {editorial && (
          <div style={{ background: 'white', border: '1px solid #BAE6FD', borderRadius: 12, padding: '24px 28px', marginBottom: 36 }}>
            {editorial.split('\n\n').map((paragraph, i) => (
              <p key={i} style={{ margin: '0 0 16px', lineHeight: 1.7, color: '#334155', fontSize: 15 }} dangerouslySetInnerHTML={{ __html: paragraph }} />
            ))}
          </div>
        )}

        {/* Shop cards — with filter/sort */}
      </div>

      <Suspense>
        <ShopListClient shops={cityShops} premiumShopIds={premiumShopIds} />
      </Suspense>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {/* Back links */}
        <div style={{ textAlign: 'center', padding: '20px 0 44px', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Link href={getStatePath(stateCode)} style={{ color: '#0369A1', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            &larr; All {stateName} {listing.plural}
          </Link>
          <Link href="/" style={{ color: '#0369A1', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            &larr; Back to Directory
          </Link>
        </div>
      </div>
    </div>
  );
}
