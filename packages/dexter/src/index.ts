export type DexterStatus = { configured: boolean; baseUrl?: string; note: string };
export function readDexterStatus(env: NodeJS.ProcessEnv = process.env): DexterStatus {
  return { configured: Boolean(env.DEXTER_API_BASE_URL || env.OPENDEXTER_API_BASE_URL), baseUrl: env.DEXTER_API_BASE_URL ?? env.OPENDEXTER_API_BASE_URL, note: "Dexter/OpenDexter is a cloud-safe paid-data boundary when configured." };
}
