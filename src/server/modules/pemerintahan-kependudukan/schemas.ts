import "server-only";

import { z } from "zod";
import { uuidSchema } from "@/server/validation/common";

const nonNegativeInt = z.coerce.number().int().min(0).default(0);
const positiveInt = z.coerce.number().int().positive();

const baseFactSchema = z.object({
    kelurahan_id: uuidSchema,
    periode_id: positiveInt,
});

const genderCountSchema = baseFactSchema.extend({
    jml_lk: nonNegativeInt,
    jml_pr: nonNegativeInt,
});

export const kependudukanResourceSchemas = {
    summary: baseFactSchema.extend({
        jml_penduduk_lk: nonNegativeInt,
        jml_penduduk_pr: nonNegativeInt,
        jml_kk_lk: nonNegativeInt,
        jml_kk_pr: nonNegativeInt,
    }),
    kelompok_umur: genderCountSchema.extend({
        kelompok_umur_id: positiveInt,
    }),
    umur_tunggal: genderCountSchema.extend({
        umur: z.coerce.number().int().min(0).max(150),
    }),
    agama: genderCountSchema.extend({
        agama_id: positiveInt,
    }),
    pendidikan: genderCountSchema.extend({
        pendidikan_id: positiveInt,
    }),
    pekerjaan: genderCountSchema.extend({
        pekerjaan_id: positiveInt,
    }),
    status_kawin: genderCountSchema.extend({
        status_kawin_id: positiveInt,
    }),
    golongan_darah: genderCountSchema.extend({
        goldar_id: positiveInt,
    }),
    ktp: baseFactSchema.extend({
        wajib_ktp_lk: nonNegativeInt,
        wajib_ktp_pr: nonNegativeInt,
        punya_ktp_lk: nonNegativeInt,
        punya_ktp_pr: nonNegativeInt,
    }),
    kia: baseFactSchema.extend({
        wajib_kia_lk: nonNegativeInt,
        wajib_kia_pr: nonNegativeInt,
        punya_kia_lk: nonNegativeInt,
        punya_kia_pr: nonNegativeInt,
    }),
    akta: baseFactSchema.extend({
        penduduk_0_18_lk: nonNegativeInt,
        penduduk_0_18_pr: nonNegativeInt,
        punya_akta_lk: nonNegativeInt,
        punya_akta_pr: nonNegativeInt,
    }),
} as const;

export const kependudukanResourceSchema = z.enum([
    "summary",
    "kelompok_umur",
    "umur_tunggal",
    "agama",
    "pendidikan",
    "pekerjaan",
    "status_kawin",
    "golongan_darah",
    "ktp",
    "kia",
    "akta",
]);

export type KependudukanResource = z.infer<typeof kependudukanResourceSchema>;
export type KependudukanPayload = z.infer<(typeof kependudukanResourceSchemas)[KependudukanResource]>;
