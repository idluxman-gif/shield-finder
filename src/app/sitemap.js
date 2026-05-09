import { shops, getStateSlug, getCitySlug, getShopSlug } from '@/data/shops';
import { blogPosts } from '@/data/blogPosts';
import { cityEditorial } from '@/data/cityEditorial';
import { siteConfig } from '@/config/site';

const { domain, listingsRoute } = siteConfig;

// Cities with this many shops OR an editorial block are included in the
// sitemap. Tiny cities with 1-2 shops are still indexable (no noindex)
// but kept out of the sitemap to avoid bulking it with sparse listings.
const MIN_CITY_SHOPS_FOR_SITEMAP = 3;

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

  // Shop detail pages: every shop is in the sitemap. Each shop page now
  // carries 250-320 words of unique generated editorial (see shopEditorial.js)
  // so they're substantive, not boilerplate. Including them gives Google a
  // clear signal of total site footprint and is the structure that got the
  // SAD twin AdSense-approved (728 indexed store pages).
  const shopUrls = shops.map(shop => ({
    url: withSlash(`${domain}/${listingsRoute}/${getStateSlug(shop.s)}/${getCitySlug(shop.c)}/${getShopSlug(shop)}`),
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

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
    ...shopUrls,
  ];
}
