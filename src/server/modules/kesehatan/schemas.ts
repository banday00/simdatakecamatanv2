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

const nullableUuid = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    uuidSchema.nullable().optional()
).transform((value) => value ?? null);

const nullableLatitude = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    latitudeSchema.nullable().optional()
).transform((value) => value ?? null);

const nullableLongitude = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    longitudeSchema.nullable().optional()
).transform((value) => value ?? null);

const stringArray = z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(z.string().trim().max(120)).default([])
).transform((value) => value.map((item) => item.trim()).filter(Boolean));

export const fasilitasPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    nama: z.string().trim().min(1, "Nama fasilitas wajib diisi.").max(180),
    jenis_id: z.coerce.number().int().positive("Jenis fasilitas wajib dipilih."),
    alamat: nullableText(1000),
    penanggung_jawab: nullableText(160),
    jumlah_tenaga_medis: nonNegativeInt,
    koordinat_lat: nullableLatitude,
    koordinat_lng: nullableLongitude,
});

export const maternalPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    ibu_hamil: nonNegativeInt,
    ibu_bersalin: nonNegativeInt,
    bayi_lahir_hidup: nonNegativeInt,
    kematian_ibu: nonNegativeInt,
    kematian_bayi: nonNegativeInt,
    kb_aktif: nonNegativeInt,
});

export const posyanduPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    nama: z.string().trim().min(1, "Nama posyandu wajib diisi.").max(180),
    strata: z.enum(["Pratama", "Madya", "Purnama", "Mandiri"]).default("Pratama"),
    jumlah_kader: nonNegativeInt,
    jumlah_balita: nonNegativeInt,
    jumlah_lansia: nonNegativeInt,
    alamat: nullableText(1000),
    ketua: nullableText(160),
    anggota_kader: stringArray,
    rt_rw: nullableText(40),
    frekuensi_kegiatan: nonNegativeInt,
    tahun: z.preprocess(
        (value) => (value === "" || value == null ? null : value),
        tahunSchema.nullable().optional()
    ).transform((value) => value ?? null),
    jumlah_ibu_hamil: nonNegativeInt,
    jumlah_wus_pus: nonNegativeInt,
    cakupan_gizi: nullableNumber(0, 100).transform((value) => value ?? 0),
    cakupan_kia: nullableNumber(0, 100).transform((value) => value ?? 0),
    cakupan_kb: nullableNumber(0, 100).transform((value) => value ?? 0),
    cakupan_imunisasi: nullableNumber(0, 100).transform((value) => value ?? 0),
}).transform((value) => ({
    ...value,
    jumlah_kader: value.anggota_kader.length,
}));

export const healthResourceSchemas = {
    fasilitas: fasilitasPayloadSchema,
    maternal: maternalPayloadSchema,
    posyandu: posyanduPayloadSchema,
} as const;

export type FasilitasPayload = z.infer<typeof fasilitasPayloadSchema>;
export type MaternalPayload = z.infer<typeof maternalPayloadSchema>;
export type PosyanduPayload = z.infer<typeof posyanduPayloadSchema>;
export type HealthResource = keyof typeof healthResourceSchemas;
export type HealthPayloadByResource = {
    fasilitas: FasilitasPayload;
    maternal: MaternalPayload;
    posyandu: PosyanduPayload;
};
