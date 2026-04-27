/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['lucide-react'],
  async redirects() {
    return [
      // Old thin City Guides stubs → substantive Local Guides replacements
      { source: '/blog/best-auto-glass-shops-houston', destination: '/blog/best-auto-glass-shops-in-houston', permanent: true },
      { source: '/blog/best-auto-glass-shops-chicago', destination: '/blog/best-auto-glass-shops-in-chicago', permanent: true },
      { source: '/blog/best-auto-glass-shops-phoenix', destination: '/blog/best-auto-glass-shops-in-phoenix', permanent: true },
      // Stubs without direct substantive replacement → blog index
      { source: '/blog/best-auto-glass-shops-los-angeles', destination: '/blog', permanent: true },
      { source: '/blog/best-auto-glass-shops-new-york', destination: '/blog', permanent: true },
    ];
  },
};

module.exports = nextConfig;
