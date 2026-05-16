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
const percentage = z.coerce.number().min(0).max(100).default(0);

export const sumberDanaSchema = z.enum(["APBD Kota", "APBD Provinsi", "APBN", "Dana Desa", "CSR", "Swadaya"]);
export const statusPembangunanSchema = z.enum(["Rencana", "Proses", "Selesai", "Bermasalah"]);
export const statusOdfSchema = z.enum(["ODF", "Belum ODF", "Proses Verifikasi"]);
export const kondisiOlahragaSchema = z.enum(["Baik", "Rusak Ringan", "Rusak Berat"]);
export const kepemilikanOlahragaSchema = z.enum([
    "PSU",
    "Pemerintah Kota",
    "Pemerintah Provinsi",
    "Pemerintah Pusat",
    "Swasta",
    "BUMN/BUMD",
    "LSM/Yayasan",
    "Perorangan",
    "Lainnya",
]);

export const pembangunanPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    nama_proyek: z.string().trim().min(1, "Nama proyek wajib diisi.").max(220),
    sumber_dana: sumberDanaSchema.default("APBD Kota"),
    anggaran: z.coerce.number().min(0).default(0),
    realisasi: z.coerce.number().min(0).default(0),
    progress_persen: percentage,
    status: statusPembangunanSchema.default("Rencana"),
    volume: nullableNumber(),
    satuan: nullableText(40),
    instansi_pelaksana: nullableText(180),
    keterangan: nullableText(2000),
    lokasi: nullableText(1000),
}).transform((value) => ({
    ...value,
    progress_persen: value.status === "Selesai" ? 100 : value.progress_persen,
}));

export const sanitasiPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    tahun: tahunSchema,
    akses_air_bersih_persen: percentage,
    akses_sanitasi_persen: percentage,
    rumah_kumuh: nonNegativeInt,
    tps_jumlah: nonNegativeInt,
    rt_jamban_sehat: nonNegativeInt,
    rt_tanpa_jamban: nonNegativeInt,
    rt_tanpa_septictank: nonNegativeInt,
    status_odf: statusOdfSchema.default("Belum ODF"),
    rt_ctps: nonNegativeInt,
    rt_air_minum_layak: nonNegativeInt,
    rt_tanpa_air_bersih: nonNegativeInt,
    rt_rentan_kekeringan: nonNegativeInt,
    rt_sampah_terpilah: nonNegativeInt,
    tps_sementara: nonNegativeInt,
    tempat_pengolahan_sampah: nonNegativeInt,
    rt_pemilahan_sampah: nonNegativeInt,
    rt_spal: nonNegativeInt,
    petugas_kebersihan: nonNegativeInt,
});

export const olahragaPayloadSchema = z.object({
    kelurahan_id: uuidSchema,
    nama: z.string().trim().min(1, "Nama fasilitas wajib diisi.").max(220),
    jenis_id: z.coerce.number().int().positive("Jenis sarana wajib dipilih."),
    kondisi: kondisiOlahragaSchema.default("Baik"),
    luas: nullableNumber(),
    koordinat_lat: nullableLatitude,
    koordinat_lng: nullableLongitude,
    status_kepemilikan: kepemilikanOlahragaSchema.default("PSU"),
    alamat: nullableText(1000),
});

export const infrastrukturResourceSchemas = {
    pembangunan: pembangunanPayloadSchema,
    sanitasi: sanitasiPayloadSchema,
    olahraga: olahragaPayloadSchema,
} as const;

export type InfrastrukturResource = keyof typeof infrastrukturResourceSchemas;
export type PembangunanPayload = z.infer<typeof pembangunanPayloadSchema>;
export type SanitasiPayload = z.infer<typeof sanitasiPayloadSchema>;
export type OlahragaPayload = z.infer<typeof olahragaPayloadSchema>;
