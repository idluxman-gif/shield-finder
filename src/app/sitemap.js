import { shops, getStateSlug, getCitySlug, getShopSlug } from '@/data/shops';
import { blogPosts } from '@/data/blogPosts';
import { siteConfig } from '@/config/site';

const { domain, listingsRoute } = siteConfig;

export default function sitemap() {
  const states = [...new Set(shops.map(s => s.s))];

  const stateUrls = states.map(stateCode => ({
    url: `${domain}/${listingsRoute}/${getStateSlug(stateCode)}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const cityUrls = [];
  states.forEach(stateCode => {
    const cities = [...new Set(shops.filter(s => s.s === stateCode).map(s => s.c))];
    cities.forEach(city => {
      const cityShopCount = shops.filter(s => s.s === stateCode && s.c === city).length;
      if (cityShopCount < 3) return;
      cityUrls.push({
        url: `${domain}/${listingsRoute}/${getStateSlug(stateCode)}/${getCitySlug(city)}/`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  });

  const shopUrls = shops.map(shop => ({
    url: `${domain}/${listingsRoute}/${getStateSlug(shop.s)}/${getCitySlug(shop.c)}/${getShopSlug(shop)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const blogIndexUrl = {
    url: `${domain}/blog`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  };

  const blogPostUrls = blogPosts.map(post => ({
    url: `${domain}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    {
      url: domain,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${domain}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    blogIndexUrl,
    ...blogPostUrls,
    ...stateUrls,
    ...cityUrls,
    ...shopUrls,
  ];
}
