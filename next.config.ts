import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
  // Ensure pre-computed climate snapshot JSON files are bundled into the
  // serverless function output. Without this, route handlers that read
  // the files with a dynamic path (e.g. `${dir}/${code}.json`) get
  // ENOENT at runtime on Vercel because the tracer can't resolve the
  // path.
  outputFileTracingIncludes: {
    '/api/climate/**': [
      './public/data/climate/**/*.json',
    ],
  },
  async headers() {
    return [
      {
        // Allow embed routes to be iframed by any origin.
        // All other routes keep the default SAMEORIGIN-equivalent behaviour
        // (no X-Frame-Options header → browsers apply their default policy,
        // which is to allow same-origin framing).
        source: '/climate/enso/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/energy',
        destination: '/energy-dashboard',
        permanent: true,
      },
      // Old WordPress-style URLs found in Google Search Console
      {
        source: '/renewable-energy',
        destination: '/category/renewable-energy',
        permanent: true,
      },
      {
        source: '/artificial-intelligence',
        destination: '/category/artificial-intelligence',
        permanent: true,
      },
      {
        source: '/artificial-intelligence-2',
        destination: '/category/artificial-intelligence',
        permanent: true,
      },
      {
        source: '/climate-change',
        destination: '/category/climate',
        permanent: true,
      },
      {
        source: '/biotechnology',
        destination: '/category/biotechnology',
        permanent: true,
      },
      {
        source: '/privacy-policy',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/about-us',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/category/uncategorized',
        destination: '/',
        permanent: true,
      },
      // Old WordPress date-based post URLs e.g. /2025/01/30/renewable-energy/
      {
        source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug*',
        destination: '/',
        permanent: true,
      },
    ];
  },
}

export default nextConfig
