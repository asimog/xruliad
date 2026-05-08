import type { NextConfig } from "next";

function buildCspHeaderValue(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.youtube.com https://s.ytimg.com https://telegram.org",
    "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
    "img-src 'self' data: blob: https://i.ytimg.com https://*.ytimg.com https://placehold.co https://ipfs.io https://*.supabase.co",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org",
    "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://oauth.telegram.org https://www.youtube.com https://www.youtube-nocookie.com",
    "connect-src 'self' https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.mainnet-beta.solana.com https://api.devnet.solana.com https://api.testnet.solana.com https://*.supabase.co",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob: data: https://*.supabase.co",
  ];

  const reportUri = process.env.CSP_REPORT_URI?.trim();
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join("; ");
}

const cspHeaderValue = buildCspHeaderValue();
const securityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()",
  },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  });
}

// CSP applies in all environments; defaults to report-only outside production
if ((process.env.CSP_ENFORCE ?? "false").trim() === "true") {
  securityHeaders.push({
    key: "Content-Security-Policy",
    value: cspHeaderValue,
  });
} else if ((process.env.CSP_REPORT_ONLY ?? "true").trim() === "true") {
  securityHeaders.push({
    key: "Content-Security-Policy-Report-Only",
    value: cspHeaderValue,
  });
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "@hypermyths/fonts",
    "@hypermyths/music-orb",
    "@hypermyths/theme",
    "@hypermyths/ui",
    "@hypermyths/visuals",
  ],
  images: {},
  // Railway Docker optimization
  output: "standalone",
  // Skip TS type check during build (Vercel 2-core timeout workaround)
  // Type checking still runs in dev and CI
  typescript: {
    ignoreBuildErrors: true,
  },
  // Keep reown/walletconnect out of the server bundle — they contain
  // pnpm-hardcoded relative import paths that break under npm.
  serverExternalPackages: [
    "@reown/appkit",
    "@reown/appkit-ui",
    "@reown/appkit-scaffold-ui",
    "@reown/appkit-core",
    "@walletconnect/ethereum-provider",
    "@walletconnect/sign-client",
  ],
  webpack(config, { webpack }) {
    // @phosphor-icons/webcomponents and @reown/appkit-ui were published from pnpm workspaces.
    // They embed hardcoded pnpm-relative imports like:
    //   ../node_modules/.pnpm/@lit_reactive-element@2.0.4/node_modules/@lit/reactive-element/reactive-element.mjs
    // Under npm these paths don't exist. NormalModuleReplacementPlugin intercepts the request
    // string before resolution and redirects to our npm-installed equivalents (.mjs → .js).
    const path = require("path") as typeof import("path");
    const nm = path.resolve(process.cwd(), "node_modules");
    const lit = `${nm}/@lit/reactive-element`;
    const litHtml = `${nm}/lit-html`;
    const litEl = `${nm}/lit-element`;

    const pnpmReplacements: Record<string, string> = {
      "/@lit/reactive-element/reactive-element.mjs": `${lit}/reactive-element.js`,
      "/@lit/reactive-element/css-tag.mjs": `${lit}/css-tag.js`,
      "/@lit/reactive-element/decorators/custom-element.mjs": `${lit}/decorators/custom-element.js`,
      "/@lit/reactive-element/decorators/property.mjs": `${lit}/decorators/property.js`,
      "/@lit/reactive-element/decorators/state.mjs": `${lit}/decorators/state.js`,
      "/lit-html/lit-html.mjs": `${litHtml}/lit-html.js`,
      "/lit-html/static.mjs": `${litHtml}/static.js`,
      "/lit-element/lit-element.mjs": `${litEl}/lit-element.js`,
    };

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /\.pnpm\//,
        (resource: { request: string }) => {
          for (const [pattern, replacement] of Object.entries(pnpmReplacements)) {
            if (resource.request.includes(pattern)) {
              resource.request = replacement;
              return;
            }
          }
        }
      )
    );

    // react-aria imports react-stately/private/flags/flags, which exists on disk but is
    // blocked by react-stately's package.json exports map. Alias it directly to the file.
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      "react-stately/private/flags/flags": `${nm}/react-stately/dist/exports/private/flags/flags.js`,
      "@farcaster/mini-app-solana": path.resolve(
        process.cwd(),
        "lib/auth/optional-farcaster-solana-stub.js",
      ),
      "@farcaster/miniapp-sdk": path.resolve(
        process.cwd(),
        "lib/auth/optional-farcaster-solana-stub.js",
      ),
    };

    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
