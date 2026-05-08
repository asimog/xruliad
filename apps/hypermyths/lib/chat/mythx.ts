import { z } from "zod";

export const mythXModeSchema = z.enum([
  "token_scanner",
  "trending_tokens",
  "login_required",
]);

export const mythXActionTypeSchema = z.enum([
  "show_options",
  "select_mode",
  "collect_input",
  "suggest_login",
]);

export type MythXMode = z.infer<typeof mythXModeSchema>;
export type MythXActionType = z.infer<typeof mythXActionTypeSchema>;

export type MythXOption = {
  id: string;
  label: string;
  description: string;
};

export type MythXComposer = {
  placeholder: string;
  submitLabel: string;
};

type MythXModeConfig = {
  label: string;
  description: string;
  placeholder: string;
  submitLabel: string;
  authOnly?: boolean;
};

const MODE_CONFIGS: Record<MythXMode, MythXModeConfig> = {
  token_scanner: {
    label: "Token Scanner",
    description: "Scan a token with Helius, DexScreener, Birdeye, GMGN, and XActions.",
    placeholder: "Paste a Solana token address to scan",
    submitLabel: "Scan token",
  },
  trending_tokens: {
    label: "Trending Tokens",
    description: "Show market and public-attention signals in one list.",
    placeholder: "Press Show Trends",
    submitLabel: "Show Trends",
  },
  login_required: {
    label: "Login",
    description: "Login is not required for scanner use.",
    placeholder: "Paste a token address",
    submitLabel: "Scan token",
    authOnly: true,
  },
};

const MODE_ORDER: MythXMode[] = ["token_scanner", "trending_tokens"];

export function isSelectableMythXMode(value: string | null | undefined): value is MythXMode {
  if (!value) return false;
  return mythXModeSchema.safeParse(value).success;
}

export function isModeAvailable(mode: MythXMode, _isAuthenticated: boolean): boolean {
  return mode !== "login_required";
}

export function getMythXModeConfig(mode: MythXMode): MythXModeConfig {
  return MODE_CONFIGS[mode];
}

export function getDefaultMythXMode(_isAuthenticated: boolean): MythXMode {
  return "token_scanner";
}

export function buildModeOptions(_isAuthenticated: boolean): MythXOption[] {
  return MODE_ORDER.map((mode) => {
    const config = MODE_CONFIGS[mode];
    return {
      id: mode,
      label: config.label,
      description: config.description,
    };
  });
}

export function buildModePrompt(mode: MythXMode, _isAuthenticated: boolean): string {
  return MODE_CONFIGS[mode].description;
}

export function buildComposer(mode: MythXMode, isAuthenticated: boolean): MythXComposer {
  const activeMode = !isModeAvailable(mode, isAuthenticated)
    ? getDefaultMythXMode(isAuthenticated)
    : mode;
  const config = MODE_CONFIGS[activeMode];

  return {
    placeholder: config.placeholder,
    submitLabel: config.submitLabel,
  };
}

export function getMythXModesForPrompt(_isAuthenticated: boolean): Array<{
  id: MythXMode;
  label: string;
  description: string;
  authOnly: boolean;
}> {
  return MODE_ORDER.map((mode) => ({
    id: mode,
    label: MODE_CONFIGS[mode].label,
    description: MODE_CONFIGS[mode].description,
    authOnly: false,
  }));
}
