import "server-only";

import { pool } from "@/db/client";
import type { Tenant } from "@/types";
import { AppError } from "@/server/http/errors";
import { tenantSlugSchema } from "@/server/validation/common";

export async function getTenantBySlug(slugInput: string): Promise<Tenant> {
    const slug = tenantSlugSchema.parse(slugInput);
    const result = await pool.query<Tenant>(
        `SELECT *
         FROM tenants
         WHERE slug = $1 AND is_active = true
         LIMIT 1`,
        [slug]
    );

    const tenant = result.rows[0];
    if (!tenant) {
        throw new AppError(404, "Tenant tidak ditemukan.", "TENANT_NOT_FOUND");
    }

    return tenant;
}

