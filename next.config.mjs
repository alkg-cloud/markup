/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Allow common dev tunnel providers (Cloudflare, ngrok) to reach the local
  // `next dev` server. Without this, Next 16 dev blocks client-side JS
  // hydration on non-localhost hosts — login forms render but the React
  // tree never attaches event listeners. Wildcards match any subdomain so
  // a fresh tunnel URL (re-generated on every `cloudflared` run) works
  // without re-editing config. See `docs/qa-dev-flow.md`.
  //
  // This is dev-only — production builds (image.yml → deploy.yml) do NOT
  // use this setting; they ship from `next build` + `output: 'standalone'`
  // and bind to a known host behind Caddy. The dev server only listens on
  // localhost; reaching it from these hosts still requires an outbound
  // tunnel the operator opened.
  allowedDevOrigins: ['*.trycloudflare.com', '*.ngrok.io', '*.ngrok-free.app'],
};

export default nextConfig;
