"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getShopPath } from "@/data/shops";

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

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviewed' },
  { value: 'price_asc', label: 'Price: Low → High' },
];

export default function ShopListClient({ shops, title }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Read filter state from URL
  const ins = searchParams.get('ins') === '1';
  const mob = searchParams.get('mob') === '1';
  const minRating = searchParams.get('minRating') || '';
  const price = searchParams.get('price') || '';
  const sort = searchParams.get('sort') || 'rating';

  const updateParam = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
    setMobileFiltersOpen(false);
  }, [router, pathname]);

  const filtered = useMemo(() => {
    let list = [...shops];
    if (ins) list = list.filter(s => s.ins);
    if (mob) list = list.filter(s => s.mob);
    if (minRating === '4.5') list = list.filter(s => s.r >= 4.5);
    else if (minRating === '4') list = list.filter(s => s.r >= 4.0);
    if (price) list = list.filter(s => s.pr === price);
    if (sort === 'reviews') list.sort((a, b) => b.v - a.v);
    else if (sort === 'price_asc') list.sort((a, b) => (a.pr || '$$').localeCompare(b.pr || '$$'));
    else list.sort((a, b) => b.r - a.r || b.v - a.v);
    return list;
  }, [shops, ins, mob, minRating, price, sort]);

  const activeFilterCount = [ins, mob, minRating, price].filter(Boolean).length;

  const FilterContent = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {/* Insurance Direct */}
      <button
        onClick={() => updateParam('ins', ins ? '' : '1')}
        style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${ins ? '#0369A1' : '#BAE6FD'}`, background: ins ? '#0369A1' : '#fff', color: ins ? '#fff' : '#0369A1', transition: 'all .15s' }}
      >
        ✓ Insurance Direct
      </button>

      {/* Mobile Service */}
      <button
        onClick={() => updateParam('mob', mob ? '' : '1')}
        style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${mob ? '#0369A1' : '#BAE6FD'}`, background: mob ? '#0369A1' : '#fff', color: mob ? '#fff' : '#0369A1', transition: 'all .15s' }}
      >
        🚗 Mobile Service
      </button>

      {/* Min Rating */}
      <select
        value={minRating}
        onChange={e => updateParam('minRating', e.target.value)}
        style={{ padding: '7px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `2px solid ${minRating ? '#0369A1' : '#BAE6FD'}`, background: minRating ? '#E0F2FE' : '#fff', color: '#0369A1', cursor: 'pointer', appearance: 'none', paddingRight: 28 }}
      >
        <option value="">Any Rating</option>
        <option value="4">4.0+ Stars</option>
        <option value="4.5">4.5+ Stars</option>
      </select>

      {/* Price Tier */}
      <select
        value={price}
        onChange={e => updateParam('price', e.target.value)}
        style={{ padding: '7px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `2px solid ${price ? '#0369A1' : '#BAE6FD'}`, background: price ? '#E0F2FE' : '#fff', color: '#0369A1', cursor: 'pointer', appearance: 'none', paddingRight: 28 }}
      >
        <option value="">Any Price</option>
        <option value="$">$ Budget</option>
        <option value="$$">$$ Mid-Range</option>
        <option value="$$$">$$$ Premium</option>
      </select>

      {/* Sort */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Sort:</span>
        <select
          value={sort}
          onChange={e => updateParam('sort', e.target.value === 'rating' ? '' : e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '2px solid #BAE6FD', background: '#fff', color: '#0369A1', cursor: 'pointer', appearance: 'none', paddingRight: 28 }}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Clear */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '2px solid #FCA5A5', background: '#FEE2E2', color: '#B91C1C', transition: 'all .15s' }}
        >
          Clear ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Filter bar — sticky */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #BAE6FD', boxShadow: '0 2px 8px rgba(3,105,161,0.06)', padding: '10px 0', marginBottom: 20 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          {/* Desktop */}
          <div className="filter-desktop">
            <FilterContent />
          </div>

          {/* Mobile toggle */}
          <div className="filter-mobile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setMobileFiltersOpen(v => !v)}
                style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '2px solid #BAE6FD', background: activeFilterCount > 0 ? '#E0F2FE' : '#fff', color: '#0369A1' }}
              >
                {mobileFiltersOpen ? '▲ Filters' : '▼ Filters'}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Sort:</span>
                <select
                  value={sort}
                  onChange={e => updateParam('sort', e.target.value === 'rating' ? '' : e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '2px solid #BAE6FD', background: '#fff', color: '#0369A1', cursor: 'pointer' }}
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            {mobileFiltersOpen && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E0F2FE' }}>
                <FilterContent />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
          {filtered.length} {filtered.length === 1 ? 'shop' : 'shops'}
          {activeFilterCount > 0 ? ` matching your filters` : ''}
        </p>
      </div>

      {/* Shop grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', marginBottom: 40 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #BAE6FD' }}>
            <p style={{ fontSize: 16, color: '#64748B', margin: '0 0 12px' }}>No shops match your current filters.</p>
            <button onClick={clearFilters} style={{ padding: '10px 20px', background: '#0369A1', color: '#fff', border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map((shop, idx) => {
              const tier = TIER_CONFIG[shop.pr] || TIER_CONFIG['$$'];
              return (
                <Link key={shop.i} href={getShopPath(shop)}
                  style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', border: '1px solid #BAE6FD' }}>
                  <div style={{ background: tier.bg, height: 90, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 14, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '-0.5px' }}>
                      {getInitials(shop.n)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {shop.r > 0 ? (
                        <>
                          <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{shop.r}</span>
                          <span style={{ fontSize: 10, color: tier.accent, letterSpacing: '0.5px' }}>{'★'.repeat(Math.round(shop.r))}{'☆'.repeat(5 - Math.round(shop.r))}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>New</span>
                      )}
                    </div>
                    <span style={{ position: 'absolute', bottom: 7, right: 10, color: tier.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {tier.label}
                    </span>
                    {idx === 0 && (
                      <span style={{ position: 'absolute', top: 8, right: 8, background: '#F59E0B', color: '#fff', padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>★ Top Rated</span>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px 16px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#0C1A2E', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{shop.n}</h3>
                    <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 5px' }}>{shop.a}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 7 }}>
                      <span style={{ color: '#F59E0B' }}>{'★'.repeat(Math.round(shop.r))}</span>
                      <span style={{ color: '#64748B' }}>{shop.r} ({shop.v.toLocaleString()})</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {shop.ins && <span style={{ fontSize: 10, fontWeight: 700, color: '#0369A1', background: '#E0F2FE', padding: '2px 7px', borderRadius: 8 }}>✓ Insurance Direct</span>}
                      {shop.mob && <span style={{ fontSize: 10, fontWeight: 700, color: '#0C1A2E', background: '#FEF3C7', padding: '2px 7px', borderRadius: 8 }}>🚗 Mobile Service</span>}
                    </div>
                    {shop.hours && shop.hours['Monday'] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#065F46', fontWeight: 600 }}>Hours available · see details</span>
                      </div>
                    )}
                    {shop.p && <p style={{ fontSize: 12, color: '#64748B', margin: '7px 0 0' }}>{shop.p}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .filter-desktop { display: flex !important; }
          .filter-mobile { display: none !important; }
        }
        @media (max-width: 639px) {
          .filter-desktop { display: none !important; }
          .filter-mobile { display: block !important; }
        }
      `}</style>
    </>
  );
}
