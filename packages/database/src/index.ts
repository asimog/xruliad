export type DatabaseConfig = { url?: string };
export function readDatabaseConfig(): DatabaseConfig {
  return { url: process.env.DATABASE_URL };
}
export function assertDatabaseConfigured(config = readDatabaseConfig()) {
  if (!config.url) throw new Error("DATABASE_URL is required.");
}
