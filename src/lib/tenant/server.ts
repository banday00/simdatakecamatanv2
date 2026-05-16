import "server-only";

import { pool } from "@/db/client";
import type { Tenant } from "@/types";

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
    const result = await pool.query(
        `SELECT *
         FROM tenants
         WHERE slug = $1
           AND is_active = true
         LIMIT 1`,
        [slug]
    ).catch((error) => {
        console.error("[tenant] Failed to resolve tenant:", error.message);
        return null;
    });

    if (!result) return null;
    return (result.rows[0] as Tenant | undefined) ?? null;
}

export async function listActiveTenants(): Promise<Tenant[]> {
    const result = await pool.query(
        `SELECT *
         FROM tenants
         WHERE is_active = true
         ORDER BY nama ASC`
    ).catch((error) => {
        console.error("[tenant] Failed to list tenants:", error.message);
        return null;
    });

    return (result?.rows as Tenant[] | undefined) ?? [];
}
