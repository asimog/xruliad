export type X402Endpoint = { url: string; method: string; price?: string; currency?: string; facilitator?: string };
export type X402Status = { enabled: boolean; scanBaseUrl: string; apiBaseUrl?: string; maxRequestCost?: number };

export function readX402Status(env: NodeJS.ProcessEnv = process.env): X402Status {
  return {
    enabled: env.X402_ENABLED !== "false",
    scanBaseUrl: env.X402SCAN_BASE_URL ?? "https://www.x402scan.com",
    apiBaseUrl: env.X402SCAN_API_BASE_URL,
    maxRequestCost: env.X402_MAX_REQUEST_COST ? Number(env.X402_MAX_REQUEST_COST) : undefined
  };
}

export function discoverX402Endpoints(seedUrl: string): X402Endpoint[] {
  return [{ url: seedUrl, method: "GET", facilitator: process.env.X402_DEFAULT_FACILITATOR }];
}
