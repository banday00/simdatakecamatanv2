import "server-only";

import { z } from "zod";
import { uuidSchema } from "@/server/validation/common";

/* ─── Helpers ─── */
const nullableText = (max = 500) =>
    z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.string().trim().max(max).nullable().optional()
    ).transform((v) => v ?? null);

const nullableNumber = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
    z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.coerce.number().min(min).max(max).nullable().optional()
    ).transform((v) => v ?? null);

const nullableUuid = z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    uuidSchema.nullable().optional()
).transform((v) => v ?? null);

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid.");

const stringArray = z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.string().trim().max(120)).default([])
).transform((v) => v.map((item) => item.trim()).filter(Boolean));

/* ─── Payload untuk tambah pengukuran ─── */
export const stuntingMeasurementSchema = z.object({
    // Referensi penduduk (null jika anak baru)
    penduduk_id: nullableUuid,
    kelurahan_id: uuidSchema,
    posyandu_id: nullableUuid,

    // Identitas anak — hanya wajib jika penduduk_id kosong (anak baru)
    nik_anak: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.string().regex(/^\d{16}$/, "NIK anak harus 16 digit angka.").nullable().optional()
    ).transform((v) => v ?? null),
    nama_anak: nullableText(160),
    jenis_kelamin: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.enum(["L", "P"]).nullable().optional()
    ).transform((v) => v ?? null),
    tanggal_lahir: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        dateOnly.nullable().optional()
    ).transform((v) => v ?? null),
    nama_ortu: nullableText(160),

    // Info keluarga — hanya untuk anak baru
    no_kk: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.string().regex(/^\d{16}$/, "No KK harus 16 digit.").nullable().optional()
    ).transform((v) => v ?? null),
    alamat: nullableText(1000),
    rt: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.string().regex(/^\d{1,3}$/).nullable().optional()
    ).transform((v) => v ?? null),
    rw: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.string().regex(/^\d{1,3}$/).nullable().optional()
    ).transform((v) => v ?? null),

    // Data pengukuran (selalu wajib)
    tanggal_pengukuran: dateOnly,
    berat_badan: nullableNumber(0, 300),
    tinggi_badan: nullableNumber(0, 300),
    status_tbu: z.enum(["Normal", "Pendek", "Sangat Pendek", "Tinggi"]),
    status_bbu: z.enum(["Normal", "Risiko Lebih", "Gizi Lebih", "Obesitas", "Gizi Kurang", "Gizi Buruk"]),
    intervensi_diterima: stringArray,
});

export type StuntingMeasurementPayload = z.infer<typeof stuntingMeasurementSchema>;
