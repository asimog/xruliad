import { createCloudServerClient, type SupabaseClientConfig } from "./index.js";

export function getSupabaseConfig(): SupabaseClientConfig {
  return createCloudServerClient();
}

export async function pingSupabase(): Promise<boolean> {
  try {
    const config = getSupabaseConfig();
    return Boolean(config.url);
  } catch {
    return false;
  }
}
