import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool:
    | import("pg").Pool
    | undefined;
};

let _db: PrismaClient | undefined;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getPrismaClient(): PrismaClient {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;

  // No DATABASE_URL = build/SSG worker context; return undefined.
  // Routes that need DB will fail at runtime (expected), not at build time.
  if (!databaseUrl) {
    return undefined as unknown as PrismaClient;
  }

  // Prisma v7 requires explicit connection config:
  //   prisma+postgres:// → Prisma Postgres / Accelerate (accelerateUrl)
  //   postgresql:// / postgres:// → direct connection via pg adapter
  if (databaseUrl.startsWith("prisma+postgres://") || databaseUrl.startsWith("prisma://")) {
    _db = globalForPrisma.prisma ?? new PrismaClient({ accelerateUrl: databaseUrl });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
    const pool =
      globalForPrisma.pgPool ??
      new Pool({
        connectionString: databaseUrl,
        max: envInt("DB_POOL_MAX", 5),
        min: envInt("DB_POOL_MIN", 1),
        idleTimeoutMillis: envInt("DB_POOL_IDLE_TIMEOUT_MS", 15_000),
        connectionTimeoutMillis: envInt("DB_POOL_CONNECTION_TIMEOUT_MS", 5_000),
        allowExitOnIdle: true,
      });
    globalForPrisma.pgPool = pool;
    const adapter = new PrismaPg(pool);
    _db = globalForPrisma.prisma ?? new PrismaClient({ adapter });
  }

  // Keep Prisma instance cached per runtime process in all environments to
  // avoid pool fan-out under serverless concurrency.
  globalForPrisma.prisma = _db;

  return _db;
}

export const db = getPrismaClient();

export { PrismaClient, Prisma };
