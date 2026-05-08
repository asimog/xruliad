/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@hypermyths/fonts',
    '@hypermyths/music-orb',
    '@hypermyths/theme',
    '@hypermyths/ui',
    '@hypermyths/visuals',
  ],
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
