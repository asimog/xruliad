export type SupabaseMemoryStore = "cloud" | "local";

export type SupabaseClientMode = "browser" | "server" | "service_role" | "local";

export type SupabaseDataClass = "users" | "sessions" | "commands" | "theses" | "jobs" | "approvals" | "platform_payment_receipts" | "user_local_payment_receipts_metadata" | "display_artifacts" | "audit_logs" | "agent_memories" | "agent_receipts" | "inference_receipts" | "github_tasks" | "github_artifacts" | "github_pull_requests" | "artifact_provenance" | "video_jobs" | "ad_jobs" | "research_jobs" | "simulation_jobs";

export type SupabaseForbiddenClass = "user_trading_keys" | "user_wallet_private_keys" | "local_paysh_private_keys" | "raw_private_strategy" | "unredacted_medical_notes" | "unapproved_qvac_logs";

export type SupabaseClientConfig = {
  url: string;
  anonKey?: string;
  serviceRoleKey?: string;
  mode: SupabaseClientMode;
  store: SupabaseMemoryStore;
};

export function readSupabaseStatus(env: NodeJS.ProcessEnv = process.env) {
  const cloudUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const cloudAnon = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cloudServiceRole = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_KEY;
  const localUrl = env.LOCAL_SUPABASE_URL;
  const localAnon = env.LOCAL_SUPABASE_ANON_KEY;
  const localServiceRole = env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  return {
    configured: Boolean(cloudUrl && cloudAnon),
    cloudUrlConfigured: Boolean(cloudUrl),
    cloudAnonConfigured: Boolean(cloudAnon),
    cloudServiceRoleConfigured: Boolean(cloudServiceRole),
    localConfigured: Boolean(localUrl && localAnon),
    localUrlConfigured: Boolean(localUrl),
    localAnonConfigured: Boolean(localAnon),
    localServiceRoleConfigured: Boolean(localServiceRole),
    serviceRoleConfigured: Boolean(cloudServiceRole)
  };
}

export function createCloudBrowserClient(env: NodeJS.ProcessEnv = process.env): SupabaseClientConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "";
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) throw new Error("Cloud Supabase browser client not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, anonKey: anon, mode: "browser", store: "cloud" };
}

export function createCloudServerClient(env: NodeJS.ProcessEnv = process.env, useServiceRole = false): SupabaseClientConfig {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_KEY;
  if (!url) throw new Error("Cloud Supabase server client not configured: missing SUPABASE_URL");
  if (useServiceRole && !serviceRole) throw new Error("Service role client not configured: missing SUPABASE_SERVICE_ROLE_KEY");
  return { url, anonKey: useServiceRole ? undefined : anon, serviceRoleKey: useServiceRole ? serviceRole : undefined, mode: useServiceRole ? "service_role" : "server", store: "cloud" };
}

export function createLocalSupabaseClient(env: NodeJS.ProcessEnv = process.env): SupabaseClientConfig {
  const url = env.LOCAL_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const anon = env.LOCAL_SUPABASE_ANON_KEY ?? "local-anon-key";
  const serviceRole = env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  return { url, anonKey: anon, serviceRoleKey: serviceRole, mode: serviceRole ? "service_role" : "local", store: "local" };
}

export function selectSupabaseClient(env: NodeJS.ProcessEnv = process.env, preferLocal = false, useServiceRole = false): SupabaseClientConfig {
  const memoryMode = env.MEMORY_MODE ?? "hybrid";
  if (memoryMode === "local" || preferLocal) return createLocalSupabaseClient(env);
  return createCloudServerClient(env, useServiceRole);
}

export const supabaseAllowedStores: SupabaseDataClass[] = [
  "users", "sessions", "commands", "theses", "jobs", "approvals",
  "platform_payment_receipts", "user_local_payment_receipts_metadata",
  "display_artifacts", "audit_logs", "agent_memories", "agent_receipts",
  "inference_receipts", "github_tasks", "github_artifacts", "github_pull_requests",
  "artifact_provenance", "video_jobs", "ad_jobs", "research_jobs", "simulation_jobs"
];

export const supabaseForbiddenStores: SupabaseForbiddenClass[] = [
  "user_trading_keys", "user_wallet_private_keys", "local_paysh_private_keys",
  "raw_private_strategy", "unredacted_medical_notes", "unapproved_qvac_logs"
];

export function isForbiddenClass(dataClass: string): boolean {
  return supabaseForbiddenStores.includes(dataClass as SupabaseForbiddenClass);
}

export function isAllowedStore(dataClass: string): boolean {
  return supabaseAllowedStores.includes(dataClass as SupabaseDataClass);
}

export function assertNoServiceRoleInBrowser(mode: SupabaseClientMode): void {
  if (mode === "service_role") throw new Error("Service role key must not be used in browser code.");
}
