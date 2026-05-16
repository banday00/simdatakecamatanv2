import "server-only";

import { z } from "zod";
import { latitudeSchema, longitudeSchema, tahunSchema, uuidSchema } from "@/server/validation/common";

const nullableText = (max = 500) =>
    z.preprocess(
        (value) => (value === "" || value == null ? null : value),
        z.string().trim().max(max).nullable().optional()
    ).transform((value) => value ?? null);

const nullableNumber = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
    z.preprocess(
        (value) => (value === "" || value == null ? null : value),
        z.coerce.number().min(min).max(max).nullable().optional()
    ).transform((value) => value ?? null);

const nonNegativeInt = z.coerce.number().int().min(0).default(0);
const percentage = z.coerce.number().min(0).max(999).default(0);

const nullableLatitude = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    latitudeSchema.nullable().optional()
).transform((value) => value ?? null);

const nullableLongitude = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    longitudeSchema.nullable().optional()
).transform((value) => value ?? null);

export const jenjangSaranaSchema = z.enum(["PAUD", "TK", "SD", "SMP", "SMA", "SMK"]);
export const jenjangPartisipasiSchema = z.enum(["SD", "SMP", "SMA"]);

export const saranaPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    nama: z.string().trim().min(1, "Nama sekolah wajib diisi.").max(180),
    jenjang: jenjangSaranaSchema,
    status: z.enum(["Negeri", "Swasta"]),
    npsn: nullableText(20),
    jumlah_guru: nonNegativeInt,
    jumlah_siswa: nonNegativeInt,
    akreditasi: z.enum(["A", "B", "C", "Belum"]).default("Belum"),
    koordinat_lat: nullableLatitude,
    koordinat_lng: nullableLongitude,
    jumlah_rombel: nonNegativeInt,
    jumlah_siswa_perempuan: nonNegativeInt,
    jumlah_siswa_laki: nonNegativeInt,
    jumlah_siswa_dalam_kota: nonNegativeInt,
    jumlah_siswa_luar_kota: nonNegativeInt,
    jumlah_ruang_kelas: nonNegativeInt,
    semester: z.coerce.number().int().min(1).max(99999),
    tahun_ajaran: tahunSchema,
    partisipasi_bos: z.enum(["ya", "tidak"]).default("tidak"),
}).transform((value) => ({
    ...value,
    jumlah_siswa: value.jumlah_siswa_laki + value.jumlah_siswa_perempuan,
}));

export const partisipasiPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    jenjang: jenjangPartisipasiSchema,
    angka_partisipasi: percentage,
    angka_putus_sekolah: nonNegativeInt,
    angka_melek_huruf: z.coerce.number().min(0).max(100).default(0),
    jumlah_usia_7_12: nonNegativeInt,
    jumlah_usia_13_15: nonNegativeInt,
    jumlah_usia_16_18: nonNegativeInt,
    semester: z.coerce.number().int().min(1).max(99999),
});

export const siswaSummaryQuerySchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    semester: z.coerce.number().int().min(1).max(2),
});

export const pendidikanResourceSchemas = {
    sarana: saranaPayloadSchema,
    partisipasi: partisipasiPayloadSchema,
} as const;

export type PendidikanResource = keyof typeof pendidikanResourceSchemas;
export type SaranaPayload = z.infer<typeof saranaPayloadSchema>;
export type PartisipasiPayload = z.infer<typeof partisipasiPayloadSchema>;
export type SiswaSummaryQuery = z.infer<typeof siswaSummaryQuerySchema>;
