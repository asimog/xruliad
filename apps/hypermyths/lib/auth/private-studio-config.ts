const DEFAULT_PRIVATE_STUDIO_AMOUNT_SOL = 0.01;
const DEFAULT_PRIVY_LOGIN_METHODS = ["email"];
const DEFAULT_PRIVY_WALLET_CHAIN_TYPE = "ethereum-only";

function parseAmount(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PRIVATE_STUDIO_AMOUNT_SOL;
  }
  return parsed;
}

function parseCsvList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

export function getPrivyAppId(): string {
  return process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";
}

export function getPrivyClientId(): string {
  return process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() ?? "";
}

export function isPrivyConfigured(): boolean {
  return getPrivyAppId().length > 0;
}

export function getPrivyLoginMethods(): string[] {
  const configured = parseCsvList(process.env.NEXT_PUBLIC_PRIVY_LOGIN_METHODS);
  return configured.length > 0 ? configured : DEFAULT_PRIVY_LOGIN_METHODS;
}

export function getPrivyLoginMessage(): string {
  return (
    process.env.NEXT_PUBLIC_PRIVY_LOGIN_MESSAGE?.trim() ??
    "Log in to unlock HyperMyths private studio access."
  );
}

export function getPrivyTheme(): string {
  return process.env.NEXT_PUBLIC_PRIVY_THEME?.trim() || "dark";
}

export function getPrivyAccentColor(): string | undefined {
  const color = process.env.NEXT_PUBLIC_PRIVY_ACCENT_COLOR?.trim();
  return color && color.length > 0 ? color : undefined;
}

export function shouldShowPrivyWalletLoginFirst(): boolean {
  return parseBoolean(
    process.env.NEXT_PUBLIC_PRIVY_SHOW_WALLET_LOGIN_FIRST,
    false,
  );
}

export function hasPrivySolanaWalletConnectors(): boolean {
  return parseBoolean(
    process.env.NEXT_PUBLIC_PRIVY_ENABLE_SOLANA_WALLETS,
    false,
  );
}

export function getPrivyWalletChainType(): string {
  const configured =
    process.env.NEXT_PUBLIC_PRIVY_WALLET_CHAIN_TYPE?.trim() ??
    DEFAULT_PRIVY_WALLET_CHAIN_TYPE;

  if (
    (configured === "solana-only" || configured === "ethereum-and-solana") &&
    !hasPrivySolanaWalletConnectors()
  ) {
    return DEFAULT_PRIVY_WALLET_CHAIN_TYPE;
  }

  if (
    configured === "ethereum-only" ||
    configured === "solana-only" ||
    configured === "ethereum-and-solana"
  ) {
    return configured;
  }

  return DEFAULT_PRIVY_WALLET_CHAIN_TYPE;
}

export function getPrivyPrimaryDomain(): string {
  return process.env.NEXT_PUBLIC_PRIVY_PRIMARY_DOMAIN?.trim() ?? "";
}

export function getPrivyAllowedRedirectUrls(): string[] {
  return parseCsvList(process.env.NEXT_PUBLIC_PRIVY_ALLOWED_REDIRECT_URLS);
}

export function getPrivateStudioPaymentAddress(): string {
  return process.env.NEXT_PUBLIC_PRIVATE_STUDIO_PAYMENT_ADDRESS?.trim() ?? "";
}

export function getPrivateStudioPaymentAmountSol(): number {
  return parseAmount(process.env.NEXT_PUBLIC_PRIVATE_STUDIO_PAYMENT_AMOUNT_SOL);
}

export function getPrivateStudioPaymentNote(): string {
  return (
    process.env.NEXT_PUBLIC_PRIVATE_STUDIO_PAYMENT_NOTE?.trim() ??
    "Best next step with Privy: authenticate first, then verify a transfer into the studio treasury wallet before granting private generation credits."
  );
}
