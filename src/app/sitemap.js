import { shops, getStateSlug, getCitySlug } from '@/data/shops';
import { blogPosts } from '@/data/blogPosts';
import { cityEditorial } from '@/data/cityEditorial';
import { siteConfig } from '@/config/site';

const { domain, listingsRoute } = siteConfig;

// Threshold: a city needs at least this many shops OR an editorial block
// to be considered substantial enough for the sitemap. Otherwise it's a
// thin-content liability for AdSense / search.
const MIN_CITY_SHOPS_FOR_SITEMAP = 10;

// All site URLs use a trailing slash because next.config.js sets
// trailingSlash: true. The sitemap MUST match the canonical form,
// otherwise every URL gets a 308 redirect when crawled.
function withSlash(path) {
  return path.endsWith('/') ? path : path + '/';
}

export default function sitemap() {
  const states = [...new Set(shops.map(s => s.s))];

  const stateUrls = states.map(stateCode => ({
    url: withSlash(`${domain}/${listingsRoute}/${getStateSlug(stateCode)}`),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Only include cities that are substantive: either has editorial content
  // or has enough shops to make the listing meaningful. Tiny cities with
  // 1-3 shops are intentionally excluded to keep the sitemap high-quality.
  const cityUrls = [];
  states.forEach(stateCode => {
    const cities = [...new Set(shops.filter(s => s.s === stateCode).map(s => s.c))];
    cities.forEach(city => {
      const cityShopCount = shops.filter(s => s.s === stateCode && s.c === city).length;
      const hasEditorial = !!cityEditorial[`${stateCode}-${city}`];
      if (cityShopCount < MIN_CITY_SHOPS_FOR_SITEMAP && !hasEditorial) return;
      cityUrls.push({
        url: withSlash(`${domain}/${listingsRoute}/${getStateSlug(stateCode)}/${getCitySlug(city)}`),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: hasEditorial ? 0.8 : 0.7,
      });
    });
  });

  // Shop detail pages are deliberately NOT in the sitemap. The page itself
  // is set to noindex,follow — it's useful for direct visitors but is not
  // substantial enough to count toward indexed content quality.

  const blogIndexUrl = {
    url: withSlash(`${domain}/blog`),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  };

  const blogPostUrls = blogPosts.map(post => ({
    url: withSlash(`${domain}/blog/${post.slug}`),
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: withSlash(domain),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: withSlash(`${domain}/about`),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    blogIndexUrl,
    ...blogPostUrls,
    ...stateUrls,
    ...cityUrls,
  ];
}
