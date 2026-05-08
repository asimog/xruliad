function addOrigin(origins: Set<string>, value: string | null | undefined): void {
  if (!value) return;
  try {
    origins.add(new URL(value).origin);
  } catch {
    // Ignore malformed configuration values.
  }
}

function addSupabaseStorageOrigin(origins: Set<string>, value: string | null | undefined): void {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.hostname.endsWith(".supabase.co")) {
      origins.add(url.origin);
    }
  } catch {
    // Ignore malformed configuration values.
  }
}

export function isAllowedStoredRedirectUrl(
  target: string,
  requestUrl: string,
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(target, requestUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  const allowedOrigins = new Set<string>();
  addOrigin(allowedOrigins, requestUrl);
  addOrigin(allowedOrigins, process.env.APP_BASE_URL);
  addOrigin(allowedOrigins, process.env.S3_PUBLIC_URL);
  addOrigin(allowedOrigins, process.env.S3_ENDPOINT);
  addSupabaseStorageOrigin(allowedOrigins, process.env.S3_ENDPOINT);
  addSupabaseStorageOrigin(allowedOrigins, process.env.S3_PUBLIC_URL);

  return allowedOrigins.has(parsed.origin);
}
