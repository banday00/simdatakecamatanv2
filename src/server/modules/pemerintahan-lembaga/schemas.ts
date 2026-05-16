import "server-only";

import { z } from "zod";
import { uuidSchema } from "@/server/validation/common";

export const lembagaPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    nama: z.string().trim().min(1, "Nama lembaga wajib diisi.").max(180),
    jenis: z.enum(["RT", "RW", "PKK", "Karang Taruna", "LPM", "Posyandu", "Majelis Taklim", "Lainnya"]),
    ketua: z.preprocess(
        (value) => (value === "" || value == null ? null : value),
        z.string().trim().max(180).nullable().optional()
    ).transform((value) => value ?? null),
    jumlah_anggota: z.coerce.number().int().min(0).max(1_000_000).default(0),
    status: z.enum(["aktif", "tidak_aktif"]).default("aktif"),
});

export type LembagaPayload = z.infer<typeof lembagaPayloadSchema>;
