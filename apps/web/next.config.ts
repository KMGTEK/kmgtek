import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

/** Where the Next server (and the browser, through the rewrite below) reaches the NestJS API. */
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/**
 * Content-Security-Policy.
 * `'unsafe-inline'` is required for Next's inline bootstrap/flight scripts and for
 * `next/font` + next-themes' blocking theme script. Google Maps (embed) and GA are allow-listed.
 */
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://www.googletagmanager.com https://www.google-analytics.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  // `http://localhost:*` is always allowed (not gated on `isProd`) because this app is run
  // as a "production" build (`next start`) even for local/on-machine testing — uploaded
  // files served by the local API (e.g. branding.logoUrl) resolve to a plain-http localhost
  // URL in that setup. A real deployment never has anything reachable at literal localhost
  // from a visitor's browser, so this doesn't weaken CSP for any real environment.
  `img-src 'self' data: blob: https: http://localhost:*`,
  `media-src 'self' data: blob: https: http://localhost:*`,
  `connect-src 'self' https://www.google-analytics.com https://cdn.simpleicons.org${isProd ? '' : ' ws: http://localhost:*'}`,
  `frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube-nocookie.com https://meet.jit.si`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  isProd ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@kmg/shared'],
  outputFileTracingRoot: process.cwd().replace(/\/apps\/web$/, ''),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.simpleicons.org' },
      // AWS/Azure logos were pulled from simple-icons over trademark takedowns; devicon still
      // hosts them, used as a fallback for those two vendor logos specifically.
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.kmgtek.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'http', hostname: 'localhost', port: '4000' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'media.licdn.com' },
    ],
  },
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${apiInternalUrl}/api/v1/:path*` },
      { source: '/api/docs', destination: `${apiInternalUrl}/api/docs` },
      { source: '/api/docs/:path*', destination: `${apiInternalUrl}/api/docs/:path*` },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/:file(logo|logo-mark).svg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default nextConfig;
