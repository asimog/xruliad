// S3-compatible video storage — Supabase Storage S3 API
// Uploads completed video URLs to persistent cloud storage so
// temporary xAI CDN URLs don't expire before users can view them.

import {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { fetchWithTimeout } from "@/lib/network/http";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { stat as fsStat } from "fs/promises";

let _client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (_client) return _client;

  const env = getEnv();
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    return null;
  }

  // Lazy singleton initialization — safe in Node.js single-threaded model
  _client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // required for Supabase S3
  });

  return _client;
}

function buildPublicUrl(key: string): string {
  const env = getEnv();
  if (env.S3_PUBLIC_URL) {
    return `${env.S3_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
  }
  // Supabase Storage public URL format
  const supabaseProjectRef = env.S3_ENDPOINT?.match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];
  if (supabaseProjectRef) {
    return `https://${supabaseProjectRef}.supabase.co/storage/v1/object/public/${env.S3_BUCKET}/${key}`;
  }
  // Generic S3-compatible fallback
  return `${env.S3_ENDPOINT?.replace(/\/+$/, "")}/${env.S3_BUCKET}/${key}`;
}

// Hostnames of video-provider CDNs whose URLs either expire, are rate-limited,
// or require Authorization to read. These must never be persisted as the final
// video URL once S3 is configured.
const EPHEMERAL_PROVIDER_HOSTS = [
  "openrouter.ai",
  "api.replicate.com",
  "replicate.delivery",
  "pbxt.replicate.delivery",
  "fal.media",
  "v2.fal.media",
  "v3.fal.media",
  "api.x.ai",
  "xai-cdn.com",
  "elizaos.ai",
  "api.elizaos.ai",
  "huggingface.co",
];

export function isEphemeralProviderUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return EPHEMERAL_PROVIDER_HOSTS.some(
      (h) => host === h || host.endsWith("." + h),
    );
  } catch {
    return false;
  }
}

export function getProviderAuthHeaders(
  url: string,
): Record<string, string> {
  const env = getEnv();
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith("openrouter.ai") && env.OPENROUTER_API_KEY) {
      return { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` };
    }
    if (host.endsWith("x.ai") && env.XAI_API_KEY) {
      return { Authorization: `Bearer ${env.XAI_API_KEY}` };
    }
    if (host.endsWith("replicate.com") && env.REPLICATE_API_KEY) {
      return { Authorization: `Token ${env.REPLICATE_API_KEY}` };
    }
  } catch {
    // Fall through
  }
  return {};
}

async function ensureBucketExists(
  client: S3Client,
  bucket: string,
): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    // Bucket doesn't exist — create it
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

/**
 * Downloads a video from a URL and uploads it to S3-compatible storage.
 * Returns the persistent public URL.
 *
 * Behaviour contract:
 *   - If S3 is NOT configured → returns `sourceUrl` (local-dev only).
 *   - If S3 IS configured → must succeed or throw. Never silently persists
 *     an ephemeral provider URL as if it were the final artifact.
 */
export async function uploadVideoToStorage(
  sourceUrl: string,
  key: string,
): Promise<string> {
  const client = getS3Client();
  if (!client) {
    // S3 not configured — return original URL for local-dev ergonomics.
    return sourceUrl;
  }

  const env = getEnv();

  // Provider CDNs (OpenRouter, xAI, Replicate) gate downloads behind auth even
  // when the URL looks public.
  const downloadHeaders: Record<string, string> = getProviderAuthHeaders(sourceUrl);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      sourceUrl,
      { headers: downloadHeaders },
      60_000,
    );
  } catch (error) {
    logger.error("s3_upload_download_network_failed", {
      component: "storage_s3",
      sourceUrl: sourceUrl.slice(0, 100),
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error(
      `Failed to download source video for storage upload: ${
        error instanceof Error ? error.message : "network error"
      }`,
    );
  }

  if (!response.ok || !response.body) {
    logger.error("s3_upload_download_failed", {
      component: "storage_s3",
      sourceUrl: sourceUrl.slice(0, 100),
      status: response.status,
    });
    throw new Error(
      `Failed to download source video (status ${response.status}): ${sourceUrl.slice(
        0,
        120,
      )}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "video/mp4";
  const contentLength = response.headers.get("content-length");

  try {
    await ensureBucketExists(client, env.S3_BUCKET);

    // Convert web ReadableStream to Node.js Readable for AWS SDK Upload
    const nodeStream = Readable.from(
      response.body as unknown as AsyncIterable<Uint8Array>,
    );

    const upload = new Upload({
      client,
      params: {
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: nodeStream,
        ContentType: contentType,
        ...(contentLength
          ? { ContentLength: parseInt(contentLength, 10) }
          : {}),
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 10, // 10 MB parts
    });

    await upload.done();

    // Verify the object is accessible — Supabase S3 can resolve upload.done()
    // without the object being reachable (RLS, bucket config, etc.)
    await client.send(
      new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
  } catch (error) {
    logger.error("s3_upload_failed", {
      component: "storage_s3",
      key,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error(
      `Failed to upload video to storage (key=${key}): ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }

  const publicUrl = buildPublicUrl(key);
  logger.info("s3_upload_complete", {
    component: "storage_s3",
    key,
    publicUrl: publicUrl.slice(0, 100),
  });
  return publicUrl;
}

/**
 * Uploads a video Buffer directly to S3-compatible storage (no source URL needed).
 * Returns the persistent public URL, or null if S3 is not configured or upload fails.
 */
export async function uploadVideoBufferToStorage(
  buffer: Buffer,
  key: string,
  contentType = "video/mp4",
): Promise<string | null> {
  const client = getS3Client();
  if (!client) return null;

  const env = getEnv();

  try {
    await ensureBucketExists(client, env.S3_BUCKET);

    const upload = new Upload({
      client,
      params: {
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 10,
    });

    await upload.done();

    try {
      await client.send(
        new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      );
    } catch {
      logger.warn("s3_buffer_upload_verification_failed", {
        component: "storage_s3",
        key,
      });
      return null;
    }

    const publicUrl = buildPublicUrl(key);
    logger.info("s3_buffer_upload_complete", {
      component: "storage_s3",
      key,
      publicUrl: publicUrl.slice(0, 100),
    });

    return publicUrl;
  } catch (error) {
    logger.warn("s3_buffer_upload_failed", {
      component: "storage_s3",
      key,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Uploads a local video file from the filesystem to S3-compatible storage.
 * This is the correct function to use for locally-generated video files.
 * Returns the persistent public URL, or null if S3 is not configured or upload fails.
 *
 * FIX for Bug #2: This resolves the issue where three-act-pipeline was passing
 * local filesystem paths to uploadVideoToStorage (which expects URLs).
 */
export async function uploadLocalFileToStorage(
  localFilePath: string,
  key: string,
  contentType = "video/mp4",
): Promise<string | null> {
  const client = getS3Client();
  if (!client) return null;

  const env = getEnv();

  const fileStats = await fsStat(localFilePath);
  if (!fileStats.isFile()) {
    logger.error("s3_local_upload_not_a_file", {
      component: "storage_s3",
      localFilePath,
    });
    throw new Error(`Not a regular file: ${localFilePath}`);
  }

  try {
    await ensureBucketExists(client, env.S3_BUCKET);

    const fileStream = createReadStream(localFilePath);
    const upload = new Upload({
      client,
      params: {
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        ContentLength: fileStats.size,
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 10,
    });

    await upload.done();

    await client.send(
      new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
  } catch (error) {
    logger.error("s3_local_upload_failed", {
      component: "storage_s3",
      key,
      localFilePath,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error(
      `Failed to upload local file to storage (key=${key}): ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }

  const publicUrl = buildPublicUrl(key);
  logger.info("s3_local_upload_complete", {
    component: "storage_s3",
    key,
    fileSizeBytes: fileStats.size,
    publicUrl: publicUrl.slice(0, 100),
  });
  return publicUrl;
}

export function isStorageConfigured(): boolean {
  return getS3Client() !== null;
}

/**
 * Extracts the S3 key from a stored Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/videos/video-renders/jobId/final.mp4"
 *   → "video-renders/jobId/final.mp4"
 * Returns null if the URL is not a recognised Supabase storage URL.
 */
export function extractS3KeyFromUrl(url: string): string | null {
  const env = getEnv();
  const base = env.S3_PUBLIC_URL?.replace(/\/+$/, "");
  if (base && url.startsWith(base + "/")) {
    return url.slice(base.length + 1);
  }
  // Fallback pattern: .../object/public/{bucket}/key
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match?.[1] ?? null;
}

/**
 * Generates a short-lived presigned GET URL for an S3 object.
 * Use this when the bucket is private and public URLs return 400/403.
 * Default expiry: 1 hour. Caller can override expiresIn.
 */
export async function generateSignedVideoUrl(
  key: string,
  expiresIn = 3600,
): Promise<string | null> {
  const client = getS3Client();
  if (!client) return null;

  const env = getEnv();
  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      { expiresIn },
    );
  } catch (error) {
    logger.warn("s3_sign_url_failed", {
      component: "storage_s3",
      key,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}
