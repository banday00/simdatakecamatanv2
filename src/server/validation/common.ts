import "server-only";

import { z } from "zod";

export const uuidSchema = z.uuid("ID tidak valid.");
export const tenantSlugSchema = z
    .string()
    .min(1, "Tenant wajib diisi.")
    .regex(/^[a-z0-9-]+$/, "Tenant tidak valid.");

export const userRoleSchema = z.enum(["super_admin", "admin_kecamatan", "admin_kelurahan"]);
export const newsStatusSchema = z.enum(["draft", "published", "archived"]);

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const tahunSchema = z.coerce.number().int().min(1900).max(2200);
export const latitudeSchema = z.coerce.number().min(-90).max(90);
export const longitudeSchema = z.coerce.number().min(-180).max(180);

export function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

