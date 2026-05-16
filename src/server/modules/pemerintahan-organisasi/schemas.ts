import "server-only";

import { z } from "zod";
import { uuidSchema } from "@/server/validation/common";

const nullableText = (max = 500) =>
    z.preprocess(
        (value) => (value === "" || value == null ? null : value),
        z.string().trim().max(max).nullable().optional()
    ).transform((value) => value ?? null);

const nullableUuid = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    uuidSchema.nullable().optional()
).transform((value) => value ?? null);

export const organisasiPayloadSchema = z.object({
    kelurahan_id: nullableUuid,
    jabatan: z.string().trim().min(1, "Jabatan wajib diisi.").max(180),
    nama_pejabat: z.string().trim().min(1, "Nama pejabat wajib diisi.").max(180),
    nip: nullableText(80),
    foto: nullableText(1000),
    urutan: z.coerce.number().int().min(1).max(9999).default(99),
    is_active: z.coerce.boolean().default(true),
});

export type OrganisasiPayload = z.infer<typeof organisasiPayloadSchema>;
