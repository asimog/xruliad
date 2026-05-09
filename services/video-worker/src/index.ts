import { createVideoScript } from "@hypermyths/intelligence";
import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "video-worker",
  role: "HashMyth video job and script preparation backend.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /video/jobs", "POST /video/script"],
  capabilities: () => ({
    videoProviderConfigured: Boolean(process.env.VIDEO_SERVICE_BASE_URL || process.env.OPENROUTER_API_KEY),
    s3Configured: Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
  }),
  routes: {
    "POST /video/jobs": ({ body }) => ({
      id: crypto.randomUUID(),
      status: "queued",
      type: "hashmyth_video",
      input: bodyRecord(body),
      createdAt: new Date().toISOString()
    }),
    "POST /video/script": ({ body }) => {
      const input = bodyRecord(body);
      return createVideoScript({
        productId: (input.productId as never) ?? "hashmyth",
        title: String(input.title ?? "HashMyth video"),
        thesis: String(input.thesis ?? input.prompt ?? "Create a video script.")
      });
    }
  }
});
