import { withSentryConfig } from '@sentry/nextjs';
import withPWA from '@ducanh2912/next-pwa';
import bundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@second-turn/design-system'],
  // Optimize bundle chunks
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', '@supabase/supabase-js'],
  },
  // Enable image optimization for external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cf.geekdo-images.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    // Generate ?section= → clean URL redirects for both locale-prefixed and bare paths
    // (localePrefix: 'as-needed' means default locale has no prefix)
    const sectionRedirects = [
      { base: 'legal', section: 'buyer', dest: 'legal/terms' },
      { base: 'legal', section: 'terms', dest: 'legal/terms' },
      { base: 'legal', section: 'privacy', dest: 'legal/privacy' },
      { base: 'legal', section: 'seller', dest: 'legal/seller' },
      { base: 'legal', section: 'cookies', dest: 'legal/cookies' },
      { base: 'legal', section: 'fees', dest: 'legal/fees' },
      { base: 'help', section: 'buying', dest: 'help/buying' },
      { base: 'help', section: 'selling', dest: 'help/selling' },
      { base: 'help', section: 'grading', dest: 'help/grading' },
      { base: 'help', section: 'shipping', dest: 'help/shipping' },
      { base: 'help', section: 'wallet', dest: 'help/wallet' },
      { base: 'help', section: 'payments', dest: 'help/wallet' },
      { base: 'help', section: 'dac7', dest: 'help/dac7' },
    ].flatMap(({ base, section, dest }) => [
      {
        source: `/${base}`,
        has: [{ type: 'query', key: 'section', value: section }],
        destination: `/${dest}`,
        permanent: true,
      },
      {
        source: `/:locale/${base}`,
        has: [{ type: 'query', key: 'section', value: section }],
        destination: `/:locale/${dest}`,
        permanent: true,
      },
    ]);

    return [
      // Seller profile URL migration
      {
        source: '/sellers/:id',
        destination: '/profile/:id',
        permanent: true,
      },
      // Legacy standalone legal URLs (constrain :locale to real locale codes)
      {
        source: '/:locale(lv|lt|et)/terms',
        destination: '/:locale/legal/terms',
        permanent: true,
      },
      {
        source: '/:locale(lv|lt|et)/privacy',
        destination: '/:locale/legal/privacy',
        permanent: true,
      },
      {
        source: '/:locale(lv|lt|et)/seller/terms',
        destination: '/:locale/legal/seller',
        permanent: true,
      },
      // Legacy help slug (grading-guide → grading)
      {
        source: '/:locale(lv|lt|et)/help/grading-guide',
        destination: '/:locale/help/grading',
        permanent: true,
      },
      // Legacy ?section= → clean URL redirects
      ...sectionRedirects,
    ];
  },
  // Rewrites to handle locale-prefixed manifest requests
  async rewrites() {
    return [
      {
        source: '/:locale/manifest.json',
        destination: '/manifest.json',
      },
    ];
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + Sentry + Cloudflare Turnstile + Vercel Analytics
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://browser.sentry-cdn.com https://va.vercel-scripts.com https://vercel.live",
              // Workers: self + blob (for MapLibre GL web workers)
              "worker-src 'self' blob:",
              // Styles: self + inline (for CSS-in-JS)
              "style-src 'self' 'unsafe-inline'",
              // Images: self + data URIs + HTTPS sources + blob for image processing
              "img-src 'self' data: https: blob:",
              // Fonts: self
              "font-src 'self'",
              // Connections: self + Supabase + Sentry + MapBox + Carto (map tiles) + Vercel Analytics + BGG images (SW fetch) + EveryPay (payment icons)
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://api.mapbox.com https://*.cartocdn.com https://*.carto.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vercel.live https://cf.geekdo-images.com https://*.every-pay.com https://*.every-pay.eu",
              // Frames: Cloudflare Turnstile
              "frame-src https://challenges.cloudflare.com https://vercel.live",
              // Prevent object/embed
              "object-src 'none'",
              // Restrict base URI
              "base-uri 'self'",
            ].join('; '),
          },
          // Enforce HTTPS (1 year)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

// Configure PWA
const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

// Wrap with i18n as innermost wrapper (closest to config)
// Sentry as outermost wrapper for source map uploads and instrumentation
export default withSentryConfig(
  withBundleAnalyzer(withPWAConfig(withNextIntl(nextConfig))),
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    hideSourceMaps: true,
  }
);
