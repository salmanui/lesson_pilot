/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: 'standalone',
  // The auth API sends no CORS headers and answers preflight OPTIONS with 405, so
  // the browser blocks any direct call to it. Proxy /api/auth/* through this server
  // instead: the request stays same-origin and CORS never comes into play.
  // (Remove once the API sends Access-Control-Allow-Origin and handles OPTIONS.)
  async rewrites() {
    const authApiUrl = process.env.NEXT_PUBLIC_AUTH_API_URL;
    if (!authApiUrl) return [];
    return [
      {
        source: "/api/auth/:path*",
        destination: `${authApiUrl.replace(/\/$/, "")}/api/auth/:path*`,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;
