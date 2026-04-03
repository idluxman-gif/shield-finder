/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['lucide-react'],
};

module.exports = nextConfig;
