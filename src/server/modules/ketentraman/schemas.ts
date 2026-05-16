import "server-only";

import { z } from "zod";
import { latitudeSchema, longitudeSchema, tahunSchema, uuidSchema } from "@/server/validation/common";

const nullableText = (max = 1000) =>
    z.preprocess(
        (value) => (value === "" || value == null ? null : value),
        z.string().trim().max(max).nullable().optional()
    ).transform((value) => value ?? null);

const nullableLatitude = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    latitudeSchema.nullable().optional()
).transform((value) => value ?? null);

const nullableLongitude = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    longitudeSchema.nullable().optional()
).transform((value) => value ?? null);

const nonNegativeInt = z.coerce.number().int().min(0).default(0);
const money = z.coerce.number().min(0).default(0);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.");

const riskSchema = z
    .enum(["Rendah", "Sedang", "Tinggi", "rendah", "sedang", "tinggi"])
    .transform((value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase());

export const insidenPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    jenis: z.string().trim().min(1).max(120).default("Banjir"),
    deskripsi: nullableText(2000),
    tanggal: dateSchema,
    lokasi: z.string().trim().min(1, "Lokasi wajib diisi.").max(1000),
    korban: nonNegativeInt,
    kerugian: money,
    jenis_kejadian: z.string().trim().min(1, "Jenis kejadian wajib diisi.").max(120),
    korban_meninggal: nonNegativeInt,
    korban_luka: nonNegativeInt,
    pengungsi: nonNegativeInt,
    kerusakan_rumah: nonNegativeInt,
    kerugian_material: money,
    penanganan: nullableText(2000),
    status: z.enum(["open", "handling", "resolved"]).default("open"),
}).transform((value) => ({
    ...value,
    jenis: value.jenis_kejadian,
    korban: value.korban_meninggal + value.korban_luka,
    kerugian: value.kerugian_material,
}));

export const bencanaPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    jenis_bencana: z.string().trim().min(1, "Jenis bencana wajib diisi.").max(120),
    tingkat_risiko: riskSchema.default("Sedang"),
    lokasi: nullableText(1000),
    koordinat_lat: nullableLatitude,
    koordinat_lng: nullableLongitude,
    jumlah_kk_terdampak: nonNegativeInt,
    jalur_evakuasi: nullableText(1000),
    posko_bencana: nullableText(1000),
    tahun_data: tahunSchema,
});

export const kaderPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    jenis: z.string().trim().min(1).max(120).default("Kader Keamanan"),
    jumlah: nonNegativeInt,
    tahun: tahunSchema,
    jumlah_linmas: nonNegativeInt,
    jumlah_satgas: nonNegativeInt,
    jumlah_fkdm: nonNegativeInt,
    pelatihan_dilaksanakan: nonNegativeInt,
    kegiatan_siskamling: nonNegativeInt,
    pos_kamling: nonNegativeInt,
}).transform((value) => ({
    ...value,
    jumlah: value.jumlah_linmas + value.jumlah_satgas + value.jumlah_fkdm,
}));

export const ketentramanResourceSchemas = {
    insiden: insidenPayloadSchema,
    bencana: bencanaPayloadSchema,
    kader: kaderPayloadSchema,
} as const;

export type KetentramanResource = keyof typeof ketentramanResourceSchemas;
