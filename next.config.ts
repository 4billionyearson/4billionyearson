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
    ];
  },
}

export default nextConfig
