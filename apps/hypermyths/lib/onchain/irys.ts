import { getEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/network/http";

// 50 MB hard cap for any remote asset fetched for Irys upload.
const MAX_REMOTE_ASSET_BYTES = 50 * 1024 * 1024;

// Matches private/loopback/link-local address literals in the URL hostname.
// This is a fast structural check on the URL string — it does not replace
// DNS-level blocking but prevents the most obvious SSRF vectors.
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
    throw new Error(`Failed to fetch remote asset for Irys upload (${response.status}).`);
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

type UploadResult = {
  uri: string;
  txId: string;
};

async function getUploader() {
  const env = getEnv();
  if (!env.IRYS_PRIVATE_KEY) {
    throw new Error("IRYS_PRIVATE_KEY is required for metadata uploads.");
  }
  if (!env.IRYS_PROVIDER_URL) {
    throw new Error("IRYS_PROVIDER_URL is required for metadata uploads.");
  }

  const [{ Uploader }, { Solana }] = await Promise.all([
    import("@irys/upload"),
    import("@irys/upload-solana"),
  ]);

  return Uploader(Solana)
    .withWallet(env.IRYS_PRIVATE_KEY)
    .withRpc(env.IRYS_PROVIDER_URL);
}

function gatewayUrl(txId: string): string {
  const env = getEnv();
  return `${env.IRYS_GATEWAY_URL.replace(/\/+$/, "")}/${txId}`;
}

export async function uploadJsonToIrys(input: {
  payload: Record<string, unknown>;
  tags?: Array<{ name: string; value: string }>;
}): Promise<UploadResult> {
  const uploader = await getUploader();
  const body = JSON.stringify(input.payload);
  const receipt = await uploader.upload(body, {
    tags: [
      { name: "Content-Type", value: "application/json" },
      ...(input.tags ?? []),
    ],
  });

  return {
    uri: gatewayUrl(receipt.id),
    txId: receipt.id,
  };
}

export async function uploadRemoteFileToIrys(input: {
  sourceUrl: string;
  contentType: string;
  tags?: Array<{ name: string; value: string }>;
}): Promise<UploadResult> {
  const buffer = await safeFetchRemoteAsset(input.sourceUrl);
  const uploader = await getUploader();
  const receipt = await uploader.upload(buffer, {
    tags: [
      { name: "Content-Type", value: input.contentType },
      ...(input.tags ?? []),
    ],
  });

  return {
    uri: gatewayUrl(receipt.id),
    txId: receipt.id,
  };
}
