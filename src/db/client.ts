import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@127.0.0.1:5432/sidakota";

const globalForDb = globalThis as unknown as {
    sidakotaPool?: Pool;
};

export const pool =
    globalForDb.sidakotaPool ??
    new Pool({
        connectionString,
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
        idleTimeoutMillis: 30_000,
    });

if (process.env.NODE_ENV !== "production") {
    globalForDb.sidakotaPool = pool;
}

export const db = drizzle(pool, { schema });
