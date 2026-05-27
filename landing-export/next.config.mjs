/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // basePath is empty so the export deploys to the root of the user's custom domain.
  basePath: '',
};
export default nextConfig;
