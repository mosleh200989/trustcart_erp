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
  // Rewrite: /?cartflows_step=seed-mix  →  /lp/seed-mix (internal)
  // This makes query-param URLs like shop.trustcart.com.bd/?cartflows_step=seed-mix work
  async rewrites() {
    return {
      beforeFiles: [
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
