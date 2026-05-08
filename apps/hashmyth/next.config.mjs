/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@hypermyths/fonts",
    "@hypermyths/music-orb",
    "@hypermyths/theme",
    "@hypermyths/ui",
    "@hypermyths/visuals",
    "@hypermyths/unified-feed",
    "@hypermyths/product-api",
    "@hypermyths/hashmyth-video"
  ]
};

export default nextConfig;
