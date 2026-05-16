import "server-only";

import { z } from "zod";
import { tahunSchema, uuidSchema } from "@/server/validation/common";

const optionalText = z
    .string()
    .trim()
    .max(20_000)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const profilPayloadSchema = z.object({
    kelurahan_id: uuidSchema.nullable().optional(),
    tahun: tahunSchema,
    visi: optionalText,
    misi: optionalText,
    tentang_wilayah: optionalText,
    peta_wilayah: optionalText,
});

export const profilPatchSchema = profilPayloadSchema.omit({ kelurahan_id: true });

export type ProfilPayload = z.infer<typeof profilPayloadSchema>;
export type ProfilPatch = z.infer<typeof profilPatchSchema>;

