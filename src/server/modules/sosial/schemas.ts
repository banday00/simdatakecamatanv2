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
const percentage = z.coerce.number().min(0).max(100).default(0);

export const bantuanPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    bulan: z.coerce.number().int().min(1).max(12),
    jenis_bantuan: z.string().trim().min(1, "Jenis bantuan wajib diisi.").max(120),
    sumber: nullableText(120),
    jumlah_penerima: nonNegativeInt,
    nominal: money,
    jumlah_kk_penerima: nonNegativeInt,
    total_anggaran: money,
    sumber_anggaran: nullableText(160),
    status_penyaluran: z.enum(["Belum", "Proses", "Tersalurkan"]).default("Belum"),
    pct_tersalurkan: percentage,
}).transform((value) => ({
    ...value,
    pct_tersalurkan: value.status_penyaluran === "Tersalurkan"
        ? 100
        : value.status_penyaluran === "Belum"
            ? 0
            : value.pct_tersalurkan,
}));

export const disabilitasPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    jenis_disabilitas: z.string().trim().min(1, "Jenis disabilitas wajib diisi.").max(120),
    jumlah: nonNegativeInt,
    mendapat_bantuan: nonNegativeInt,
    laki_laki: nonNegativeInt,
    perempuan: nonNegativeInt,
    usia_anak: nonNegativeInt,
    usia_dewasa: nonNegativeInt,
    usia_lansia: nonNegativeInt,
    penerima_bantuan: nonNegativeInt,
}).transform((value) => ({
    ...value,
    jumlah: value.laki_laki + value.perempuan > 0 ? value.laki_laki + value.perempuan : value.jumlah,
    mendapat_bantuan: value.penerima_bantuan,
}));

export const keagamaanPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    jenis: z.string().trim().min(1, "Jenis tempat ibadah wajib diisi.").max(80),
    nama: z.string().trim().min(1, "Nama tempat ibadah wajib diisi.").max(220),
    lokasi: nullableText(1000),
    alamat: nullableText(1000),
    kapasitas: nonNegativeInt,
    koordinat_lat: nullableLatitude,
    koordinat_lng: nullableLongitude,
    kondisi: z.string().trim().min(1).max(80).default("Baik"),
    status_tanah: nullableText(80),
    tahun_berdiri: z.coerce.number().int().min(1800).max(2200).nullable().optional().transform((value) => value ?? null),
    tahun_data: tahunSchema,
}).transform((value) => ({
    ...value,
    lokasi: value.lokasi ?? value.alamat,
}));

export const perumahanPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    rtlh_total: nonNegativeInt,
    rtlh_diperbaiki: nonNegativeInt,
    anggaran: nullableNumber(),
    jumlah_rtlh: nonNegativeInt,
    sudah_direhabilitasi: nonNegativeInt,
    belum_direhabilitasi: nonNegativeInt,
    anggaran_rehabilitasi: money,
    sumber_dana: z.string().trim().min(1, "Sumber dana wajib diisi.").max(120),
}).transform((value) => {
    const belum = Math.max(0, value.jumlah_rtlh - value.sudah_direhabilitasi);
    return {
        ...value,
        belum_direhabilitasi: belum,
        rtlh_total: value.jumlah_rtlh,
        rtlh_diperbaiki: value.sudah_direhabilitasi,
        anggaran: value.anggaran_rehabilitasi,
    };
});

export const sosialResourceSchemas = {
    bantuan: bantuanPayloadSchema,
    disabilitas: disabilitasPayloadSchema,
    keagamaan: keagamaanPayloadSchema,
    perumahan: perumahanPayloadSchema,
} as const;

export type SosialResource = keyof typeof sosialResourceSchemas;
