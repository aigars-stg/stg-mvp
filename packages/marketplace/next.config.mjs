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
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
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
  // Redirect old seller profile URLs to new unified profile URLs
  async redirects() {
    return [
      {
        source: '/sellers/:id',
        destination: '/profile/:id',
        permanent: true, // 301 redirect for SEO
      },
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
              // Scripts: self + Stripe + Cloudflare Turnstile + Vercel Analytics
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://va.vercel-scripts.com",
              // Workers: self + blob (for MapLibre GL web workers)
              "worker-src 'self' blob:",
              // Styles: self + inline (for CSS-in-JS)
              "style-src 'self' 'unsafe-inline'",
              // Images: self + data URIs + HTTPS sources + blob for image processing
              "img-src 'self' data: https: blob:",
              // Fonts: self
              "font-src 'self'",
              // Connections: self + Supabase + Stripe + MapBox + Carto (map tiles) + Vercel Analytics
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.mapbox.com https://*.cartocdn.com https://*.carto.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
              // Frames: Cloudflare Turnstile + Stripe
              "frame-src https://challenges.cloudflare.com https://js.stripe.com",
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
export default withBundleAnalyzer(withPWAConfig(withNextIntl(nextConfig)));
