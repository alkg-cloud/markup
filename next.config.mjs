/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
  poweredByHeader: false,
};

export default nextConfig;
