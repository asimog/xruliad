import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PaidApiCall } from "@hypermyths/types";

const execFileAsync = promisify(execFile);

export type PayShConfig = {
  apiBaseUrl?: string;
  walletPrivateKey?: string;
  network: string;
  defaultCurrency: string;
  maxRequestCostUsd: number;
  dailySpendLimitUsd: number;
  command: string;
  sandbox: boolean;
};

export type PaidRequestQuote = {
  provider: string;
  url: string;
  method: string;
  estimatedCostUsd: number;
  currency: string;
  network: string;
};

export type PaidRequestResult = {
  status: "ok" | "payment_required" | "missing_setup" | "failed";
  statusCode?: number;
  data?: unknown;
  error?: string;
  paymentChallenge?: unknown;
};

export class PayShSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayShSetupError";
  }
}

function envNumber(name: string, fallback: number) {
  const value = process.env[name] ?? process.env[name.replace("PAYSH_", "PAY_SH_")];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readPayShConfig(): PayShConfig {
  return {
    apiBaseUrl: process.env.PAYSH_API_BASE_URL,
    walletPrivateKey: process.env.PAYSH_WALLET_PRIVATE_KEY,
    network: process.env.PAYSH_NETWORK ?? process.env.PAY_SH_NETWORK ?? "base",
    defaultCurrency: process.env.PAYSH_DEFAULT_CURRENCY ?? process.env.PAY_SH_DEFAULT_CURRENCY ?? "USDC",
    maxRequestCostUsd: envNumber("PAYSH_MAX_REQUEST_COST", 1),
    dailySpendLimitUsd: envNumber("PAYSH_DAILY_SPEND_LIMIT", 25),
    command: process.env.PAYSH_COMMAND ?? process.env.PAY_SH_COMMAND ?? "pay",
    sandbox: (process.env.PAYSH_SANDBOX ?? process.env.PAY_SH_SANDBOX ?? "true") !== "false"
  };
}

export class PayShClient {
  constructor(private readonly config: PayShConfig = readPayShConfig()) {}

  quotePaidRequest(input: { provider: string; url: string; method?: string; estimatedCostUsd?: number }): PaidRequestQuote {
    const estimatedCostUsd = input.estimatedCostUsd ?? 0;
    if (estimatedCostUsd > this.config.maxRequestCostUsd) {
      throw new PayShSetupError(`Estimated request cost ${estimatedCostUsd} exceeds PAYSH_MAX_REQUEST_COST ${this.config.maxRequestCostUsd}.`);
    }
    return {
      provider: input.provider,
      url: input.url,
      method: input.method ?? "POST",
      estimatedCostUsd,
      currency: this.config.defaultCurrency,
      network: this.config.network
    };
  }

  async executePaidRequest(input: {
    provider: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    estimatedCostUsd?: number;
  }): Promise<PaidRequestResult> {
    this.quotePaidRequest(input);
    const args = [
      ...(this.config.sandbox ? ["--sandbox"] : []),
      "curl",
      input.url,
      "-sS",
      "-X",
      input.method ?? "POST",
      "-H",
      "accept: application/json"
    ];
    for (const [key, value] of Object.entries(input.headers ?? {})) args.push("-H", `${key}: ${value}`);
    if (input.body !== undefined) args.push("-H", "content-type: application/json", "-d", JSON.stringify(input.body));
    try {
      const result = await execFileAsync(this.config.command, args, { timeout: 60_000, maxBuffer: 1024 * 1024 * 8, windowsHide: true });
      return { status: "ok", data: parsePayload(result.stdout), error: result.stderr.trim() || undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/ENOENT|not recognized|cannot find/i.test(message)) return { status: "missing_setup", error: `pay.sh CLI not available: ${message}` };
      if (/402|payment required/i.test(message)) return handlePaymentChallenge(message);
      return { status: "failed", error: message };
    }
  }
}

function parsePayload(payload: string): unknown {
  if (!payload.trim()) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return { text: payload };
  }
}

export function handlePaymentChallenge(challenge: unknown): PaidRequestResult {
  return { status: "payment_required", statusCode: 402, paymentChallenge: challenge, error: "Payment challenge was returned and must be authorized by the local wallet." };
}

const usageLog: PaidApiCall[] = [];

export function trackPaidApiCall(call: PaidApiCall) {
  usageLog.push(call);
  return call;
}

export function getTrackedPaidApiCalls() {
  return [...usageLog];
}

export const quotePaidRequest = (input: Parameters<PayShClient["quotePaidRequest"]>[0]) => new PayShClient().quotePaidRequest(input);
export const executePaidRequest = (input: Parameters<PayShClient["executePaidRequest"]>[0]) => new PayShClient().executePaidRequest(input);
