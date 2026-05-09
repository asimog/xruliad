import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    "@hypermyths/fonts",
    "@hypermyths/music-orb",
    "@hypermyths/theme",
    "@hypermyths/ui",
    "@hypermyths/visuals",
  ],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  outputFileTracingIncludes: {
    '/api/*': ['node_modules/next/dist/compiled/source-map/**/*'],
    '/api/**/*': ['node_modules/next/dist/compiled/source-map/**/*'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; " +
              "frame-src https://www.youtube.com; " +
              "img-src 'self' https: data: blob:; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "connect-src 'self' https: wss: ws:; " +
              "media-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
