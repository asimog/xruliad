import { startServiceRuntime } from "@hypermyths/service-runtime";

function bodyRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? body as Record<string, unknown> : {};
}

startServiceRuntime({
  service: "ad-server",
  role: "Hypertian ad job, overlay, and attention-market backend.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "POST /ads/jobs", "POST /ads/overlays"],
  capabilities: () => ({
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  }),
  routes: {
    "POST /ads/jobs": ({ body }) => ({
      id: crypto.randomUUID(),
      type: "ad_campaign",
      status: "queued",
      input: bodyRecord(body),
      createdAt: new Date().toISOString()
    }),
    "POST /ads/overlays": ({ body }) => ({
      id: crypto.randomUUID(),
      type: "stream_overlay",
      status: "prepared",
      sponsorMetadataVisible: true,
      input: bodyRecord(body),
      createdAt: new Date().toISOString()
    })
  }
});
