import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";

// 50 MB hard cap for any remote asset fetched for Arweave upload.
const MAX_REMOTE_ASSET_BYTES = 50 * 1024 * 1024;

// Matches private/loopback/link-local address literals in the URL hostname.
const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|::1$|fc00:|fd[0-9a-f]{2}:)/i;

async function safeFetchRemoteAsset(sourceUrl: string): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error(`Invalid URL for remote asset upload: ${sourceUrl}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`URL scheme not allowed for remote asset: ${parsed.protocol}`);
  }

  if (PRIVATE_HOST_RE.test(parsed.hostname)) {
    throw new Error(`URL resolves to a private or reserved host: ${parsed.hostname}`);
  }

  const response = await fetchWithTimeout(sourceUrl, {}, 30_000);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote asset for Arweave upload (${response.status}).`);
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    throw new Error(`Unexpected content-type for remote asset: ${contentType}`);
  }

  const declared = parseInt(response.headers.get("content-length") ?? "0", 10);
  if (declared > MAX_REMOTE_ASSET_BYTES) {
    throw new Error(`Remote asset too large: declared ${declared} bytes`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_REMOTE_ASSET_BYTES) {
    throw new Error(`Remote asset exceeds ${MAX_REMOTE_ASSET_BYTES / (1024 * 1024)}MB limit`);
  }
  return buffer;
}

export type UploadResult = {
  uri: string;
  txId: string;
};

function getJwk(): object {
  const env = getEnv();
  if (!env.ARWEAVE_WALLET_JWK) {
    throw new Error("ARWEAVE_WALLET_JWK is required for Arweave uploads.");
  }
  try {
    return JSON.parse(env.ARWEAVE_WALLET_JWK) as object;
  } catch {
    throw new Error("ARWEAVE_WALLET_JWK must be valid JSON (Arweave JWK format).");
  }
}

function gatewayUrl(txId: string): string {
  const env = getEnv();
  return `${env.ARWEAVE_GATEWAY_URL.replace(/\/+$/, "")}/${txId}`;
}

async function getTurbo() {
  const { TurboFactory } = await import("@ardrive/turbo-sdk");
  return TurboFactory.authenticated({ privateKey: getJwk() as never });
}

export async function uploadJsonToArweave(input: {
  payload: Record<string, unknown>;
  tags?: Array<{ name: string; value: string }>;
}): Promise<UploadResult> {
  const turbo = await getTurbo();
  const body = Buffer.from(JSON.stringify(input.payload));

  const { id } = await turbo.uploadFile({
    fileStreamFactory: () => {
      const { Readable } = require("stream") as typeof import("stream");
      return Readable.from(body);
    },
    fileSizeFactory: () => body.byteLength,
    dataItemOpts: {
      tags: [
        { name: "Content-Type", value: "application/json" },
        ...(input.tags ?? []),
      ],
    },
  });

  return { uri: gatewayUrl(id), txId: id };
}

export async function uploadRemoteFileToArweave(input: {
  sourceUrl: string;
  contentType: string;
  tags?: Array<{ name: string; value: string }>;
}): Promise<UploadResult> {
  const buffer = await safeFetchRemoteAsset(input.sourceUrl);
  const turbo = await getTurbo();

  const { id } = await turbo.uploadFile({
    fileStreamFactory: () => {
      const { Readable } = require("stream") as typeof import("stream");
      return Readable.from(buffer);
    },
    fileSizeFactory: () => buffer.byteLength,
    dataItemOpts: {
      tags: [
        { name: "Content-Type", value: input.contentType },
        ...(input.tags ?? []),
      ],
    },
  });

  return { uri: gatewayUrl(id), txId: id };
}
