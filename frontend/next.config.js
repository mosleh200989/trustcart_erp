/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
    domains: ['images.unsplash.com', 'res.cloudinary.com'],
  },
  // Rewrites for landing pages:
  // 1. trustcart.com.bd/products/seed-mix/?landing_page=seed-mix  →  /lp/seed-mix
  // 2. trustcart.com.bd/products/?landing_page=seed-mix            →  /lp/seed-mix
  // 3. trustcart.com.bd/?landing_page=seed-mix                     →  /lp/seed-mix
  // 4. (legacy) trustcart.com.bd/?cartflows_step=seed-mix          →  /lp/seed-mix
  // International (foreign phone, no +88 prefix):
  // 5. trustcart.com.bd/products/seed-mix/?landing_page_intl=seed-mix  →  /lp/intl/seed-mix
  // 6. trustcart.com.bd/?landing_page_intl=seed-mix                    →  /lp/intl/seed-mix
  async rewrites() {
    return {
      beforeFiles: [
        // ── International landing page rewrites (must come before regular ones) ──
        // /products/anything/?landing_page_intl=slug  → /lp/intl/slug
        {
          source: '/products/:path*',
          has: [{ type: 'query', key: 'landing_page_intl', value: '(?<slug>.+)' }],
          destination: '/lp/intl/:slug',
        },
        // /?landing_page_intl=slug  → /lp/intl/slug
        {
          source: '/',
          has: [{ type: 'query', key: 'landing_page_intl', value: '(?<slug>.+)' }],
          destination: '/lp/intl/:slug',
        },

        // ── Regular (Bangladesh) landing page rewrites ──
        // /products/anything/?landing_page=slug  → /lp/slug
        {
          source: '/products/:path*',
          has: [{ type: 'query', key: 'landing_page', value: '(?<slug>.+)' }],
          destination: '/lp/:slug',
        },
        // /?landing_page=slug  → /lp/slug
        {
          source: '/',
          has: [{ type: 'query', key: 'landing_page', value: '(?<slug>.+)' }],
          destination: '/lp/:slug',
        },
        // Legacy: /?cartflows_step=slug  → /lp/slug
        {
          source: '/',
          has: [{ type: 'query', key: 'cartflows_step', value: '(?<slug>.+)' }],
          destination: '/lp/:slug',
        },
      ],
    };
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = config.watchOptions || {};
      config.watchOptions.ignored = [
        '**/node_modules/**',
        '**/*.sys',
        '**/DumpStack.log.tmp',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
