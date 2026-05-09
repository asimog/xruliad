import { readDatabaseConfig } from "@hypermyths/database";
import { startServiceRuntime } from "@hypermyths/service-runtime";

startServiceRuntime({
  service: "api",
  role: "Shared backend API boundary for cross-product jobs and database-backed operations.",
  publicSurface: "internal",
  endpoints: ["GET /health", "GET /capabilities", "GET /database/status"],
  capabilities: () => ({ databaseConfigured: Boolean(readDatabaseConfig().url) }),
  routes: {
    "GET /database/status": () => ({
      configured: Boolean(readDatabaseConfig().url),
      provider: process.env.RAILWAY_PROJECT_NAME ? "railway" : "unknown"
    })
  }
});
