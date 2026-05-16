import "server-only";

import { z } from "zod";
import { newsStatusSchema, paginationSchema, slugify, uuidSchema } from "@/server/validation/common";

export const beritaListQuerySchema = paginationSchema.extend({
    q: z.string().trim().max(120).optional().catch(undefined),
    category: z.string().trim().max(80).optional().catch(undefined),
});

export const beritaIdParamsSchema = z.object({
    id: uuidSchema,
});

export const beritaSlugParamsSchema = z.object({
    slug: z.string().trim().min(1).max(180),
});

const optionalText = z
    .string()
    .trim()
    .max(20_000)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const beritaPayloadSchema = z.object({
    judul: z.string().trim().min(3, "Judul minimal 3 karakter.").max(240),
    slug: z
        .string()
        .trim()
        .max(180)
        .optional()
        .nullable()
        .transform((value) => value || undefined),
    kategori: z.string().trim().min(1).max(80).default("Berita"),
    ringkasan: optionalText,
    konten: z.string().trim().min(1, "Konten wajib diisi.").max(200_000),
    gambar: optionalText,
    status: newsStatusSchema.default("draft"),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().nullable(),
});

export const beritaPatchSchema = beritaPayloadSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field wajib dikirim.",
});

export function normalizeBeritaSlug(input: { judul?: string; slug?: string | null }) {
    const value = input.slug || input.judul || "";
    return slugify(value);
}

export type BeritaListQuery = z.infer<typeof beritaListQuerySchema>;
export type BeritaPayload = z.infer<typeof beritaPayloadSchema>;
export type BeritaPatch = z.infer<typeof beritaPatchSchema>;

