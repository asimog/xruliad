/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@hypermyths/fonts",
    "@hypermyths/music-orb",
    "@hypermyths/theme",
    "@hypermyths/ui",
    "@hypermyths/visuals"
  ]
};

export default nextConfig;
