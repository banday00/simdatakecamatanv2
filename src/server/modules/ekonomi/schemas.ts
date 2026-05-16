import "server-only";

import { z } from "zod";
import { latitudeSchema, longitudeSchema, tahunSchema, uuidSchema } from "@/server/validation/common";

const nullableText = (max = 1000) =>
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
const positiveRefId = z.coerce.number().int().positive("Referensi wajib dipilih.");

const nullableLatitude = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    latitudeSchema.nullable().optional()
).transform((value) => value ?? null);

const nullableLongitude = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    longitudeSchema.nullable().optional()
).transform((value) => value ?? null);

const statusSchema = z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => ["aktif", "tidak aktif", "tutup"].includes(value), "Status usaha tidak valid.");

export const saranaPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    nama: z.string().trim().min(1, "Nama sarana wajib diisi.").max(180),
    jenis_id: positiveRefId,
    alamat: nullableText(1000),
    koordinat_lat: nullableLatitude,
    koordinat_lng: nullableLongitude,
});

export const potensiPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    nama_usaha: z.string().trim().min(1, "Nama usaha wajib diisi.").max(180),
    jenis_usaha_id: positiveRefId,
    pemilik: nullableText(160),
    alamat_usaha: nullableText(1000),
    jumlah_tenaga_kerja: nonNegativeInt,
    omzet_per_bulan: nullableNumber(0).transform((value) => value ?? 0),
    status: statusSchema.default("aktif"),
});

export const sektorPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    sektor_id: positiveRefId,
    jumlah_usaha: nonNegativeInt,
    jumlah_tenaga_kerja: nonNegativeInt,
});

export const ekonomiResourceSchemas = {
    sarana: saranaPayloadSchema,
    potensi: potensiPayloadSchema,
    sektorUsaha: sektorPayloadSchema,
} as const;

export type SaranaPayload = z.infer<typeof saranaPayloadSchema>;
export type PotensiPayload = z.infer<typeof potensiPayloadSchema>;
export type SektorPayload = z.infer<typeof sektorPayloadSchema>;
export type EkonomiResource = keyof typeof ekonomiResourceSchemas;
