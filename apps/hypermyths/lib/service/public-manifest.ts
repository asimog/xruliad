import { ACTIVE_PACKAGE_TYPES, PACKAGE_CONFIG } from "@/lib/constants";
import { TOKEN_VIDEO_STYLE_PRESETS } from "@/lib/memecoins/styles";
import type { SupportedTokenChain } from "@/lib/types/domain";

const supportedChains: SupportedTokenChain[] = [
  "solana",
  "ethereum",
  "base",
  "bsc",
];

export const publicHyperCinemaServiceManifest = {
  id: "hypermyths",
  name: "HyperMyths",
  summary:
    "Turns token contracts, wallets, prompts, and X profiles into short-form cinematic videos.",
  version: "2026-04-11",
  primaryMode: "token_video",
  supportedChains,
  inputSchema: {
    addressField: "tokenAddress",
    chainField: "chain",
    promptField: "requestedPrompt",
    styleField: "stylePreset",
  },
  packages: ACTIVE_PACKAGE_TYPES.map((packageType) => {
    const pkg = PACKAGE_CONFIG[packageType];
    return {
      packageType,
      label: pkg.label,
      durationSeconds: pkg.videoSeconds,
      priceSol: pkg.priceSol,
      priceUsdc: pkg.priceUsdc,
    };
  }),
  styles: TOKEN_VIDEO_STYLE_PRESETS.slice(0, 24).map((preset) => ({
    id: preset.id,
    label: preset.label,
    summary: preset.summary,
  })),
  endpoints: {
    createJob: "/api/jobs",
    statusTemplate: "/api/jobs/{jobId}",
    manifest: "/api/service",
  },
} as const;
