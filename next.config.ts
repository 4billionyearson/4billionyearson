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
