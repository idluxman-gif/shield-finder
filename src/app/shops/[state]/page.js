import Link from 'next/link';
import { shops, stateNames, findStateCode, getShopsByCity, getStateSlug, getShopPath, getCityPath, getStatePath } from '@/data/shops';
import { stateEditorial } from '@/data/stateEditorial';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import PageNav from '@/components/PageNav';
import ShopListClient from '@/components/ShopListClient';
import { Suspense } from 'react';
import { isPremium } from '@/lib/premium';

const { listing, domain, displayName } = siteConfig;

export function generateStaticParams() {
  const states = [...new Set(shops.map(s => s.s))];
  return states.map(s => ({ state: getStateSlug(s) }));
}

export function generateMetadata({ params }) {
  const stateCode = findStateCode(params.state);
  if (!stateCode) return {};
  const stateName = stateNames[stateCode];
  const stateShops = shops.filter(s => s.s === stateCode);
  return {
    title: `${listing.categoryLabel} ${listing.plural} in ${stateName} (${stateShops.length}) | ${displayName}`,
    description: `Find ${stateShops.length} verified ${listing.categoryLabel.toLowerCase()} ${listing.plural} in ${stateName}. ${listing.metaSavings}`,
    alternates: { canonical: `/${siteConfig.listingsRoute}/${params.state}` },
  };
}

export default async function StatePage({ params }) {
  const stateCode = findStateCode(params.state);
  if (!stateCode) notFound();
  const stateName = stateNames[stateCode];
  const cityEntries = getShopsByCity(stateCode);
  const stateShops = shops.filter(s => s.s === stateCode).sort((a, b) => b.v - a.v);

  const premiumChecks = await Promise.all(stateShops.map(s => isPremium(s.i)));
  const premiumShopIds = stateShops.filter((s, idx) => premiumChecks[idx]).map(s => s.i);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${listing.categoryLabel} ${listing.plural} in ${stateName}`,
    "description": `Directory of ${stateShops.length} verified ${listing.categoryLabel.toLowerCase()} ${listing.plural} across ${cityEntries.length} cities in ${stateName}.`,
    "numberOfItems": cityEntries.length,
    "itemListElement": cityEntries.slice(0, 50).map(([cityName, cityShops], idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": `${listing.categoryLabel} ${listing.plural} in ${cityName}, ${stateName}`,
      "url": `${domain}${getCityPath(stateCode, cityName)}`,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": domain },
      { "@type": "ListItem", "position": 2, "name": stateName, "item": `${domain}${getStatePath(stateCode)}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#F0F9FF', minHeight: '100vh' }}>
        <PageNav />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px' }}>
          {/* Breadcrumbs */}
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
            <Link href="/" style={{ color: '#0369A1', textDecoration: 'none' }}>Home</Link>
            <span style={{ margin: '0 6px' }}>/</span>
            <span style={{ color: '#0C1A2E' }}>{stateName}</span>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0C1A2E', margin: '12px 0 6px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {listing.categoryLabel} {listing.plural} in {stateName}
          </h1>
          <p style={{ color: '#64748B', fontSize: 15, margin: '0 0 16px' }}>
            {stateShops.length} verified {listing.plural} across {cityEntries.length} cities. {listing.metaSavings}
          </p>

          {stateEditorial[stateCode] && (
            <p style={{ color: '#334155', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px', padding: '16px 20px', background: '#fff', border: '1px solid #BAE6FD', borderRadius: 10 }}>
              {stateEditorial[stateCode]}
            </p>
          )}

          {/* Cities grid */}
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0C1A2E', marginBottom: 12, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Cities in {stateName}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 36 }}>
            {cityEntries.map(([cityName, cityShops]) => (
              <Link key={cityName} href={getCityPath(stateCode, cityName)}
                style={{ background: '#fff', padding: '12px 16px', borderRadius: 10, textDecoration: 'none', color: '#0C1A2E', border: '1px solid #BAE6FD', fontWeight: 600, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{cityName}</span>
                <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{cityShops.length}</span>
              </Link>
            ))}
          </div>

          {/* All shops — with filter/sort */}
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0C1A2E', marginBottom: 14, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>All {listing.plural} in {stateName}</h2>
        </div>

        <Suspense>
          <ShopListClient shops={stateShops} premiumShopIds={premiumShopIds} />
        </Suspense>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', padding: '20px 0 44px' }}>
            <Link href="/" style={{ color: '#0369A1', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
              &larr; Back to All {listing.plural}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
