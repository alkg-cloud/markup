/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // basePath is empty so the export deploys to the root of the user's custom domain.
  basePath: '',
  // The main app is the canonical typecheck surface (its own CI typecheck job).
  // The export's tsconfig globs in ../src/**/*.{ts,tsx} so the landing page can
  // import shared CopyButton/Toast/Section sources, but Next then typechecks
  // every file in that glob — including main-app API routes the tree-shaker
  // drops. Skip the redundant pass here.
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
