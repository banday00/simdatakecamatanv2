import "server-only";

import { z } from "zod";

/* ─── Registrasi Penerima RTLH ─── */
export const rtlhRegistrasiSchema = z.object({
    // Identitas Penduduk
    penduduk_id: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.string().uuid().nullable().optional()
    ).transform((v) => v ?? null),
    nik: z.coerce
        .string()
        .trim()
        .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka."),
    nama: z.string().trim().min(1, "Nama wajib diisi.").max(200),
    jenis_kelamin: z.enum(["Laki-laki", "Perempuan"], {
        message: "Jenis kelamin wajib dipilih.",
    }),
    tanggal_lahir: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z.string().nullable().optional()
        )
        .transform((v) => v ?? null),
    tempat_lahir: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z.string().max(200).nullable().optional()
        )
        .transform((v) => v ?? null),

    // Info Keluarga
    no_kk: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z
                .string()
                .regex(/^\d{16}$/, "No KK harus terdiri dari 16 digit angka.")
                .nullable()
                .optional()
        )
        .transform((v) => v ?? null),
    alamat: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z.string().max(1000).nullable().optional()
        )
        .transform((v) => v ?? null),
    rt: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z
                .string()
                .regex(/^\d{1,3}$/, "RT harus 1-3 digit.")
                .nullable()
                .optional()
        )
        .transform((v) => v ?? null),
    rw: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z
                .string()
                .regex(/^\d{1,3}$/, "RW harus 1-3 digit.")
                .nullable()
                .optional()
        )
        .transform((v) => v ?? null),
    kelurahan_id: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.string().uuid("ID kelurahan tidak valid.").nullable().optional()
    ).transform((v) => v ?? null),

    // RTLH-specific
    tahun: z.coerce.number().int().min(1900).max(2200),
    kategori: z.enum(["Bantuan Sosial Tunai", "Bantuan Sosial Tidak Terencana"], {
        message: "Kategori bantuan wajib dipilih.",
    }),
});

export type RtlhRegistrasiPayload = z.infer<typeof rtlhRegistrasiSchema>;
