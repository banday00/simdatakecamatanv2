import "server-only";

import { z } from "zod";



/* ─── Registrasi Penduduk Disabilitas ─── */
export const disabilitasRegistrasiSchema = z.object({
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

    // Disabilitas
    disabilitas_id: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        z.string().uuid("ID jenis disabilitas tidak valid.").nullable().optional()
    ).transform((v) => v ?? null),
    keterangan_disabilitas: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z.string().max(1000).nullable().optional()
        )
        .transform((v) => v ?? null),

    // Bantuan (multiple)
    bantuan_ids: z.array(z.string().uuid()).default([]),
    bantuan_keterangan: z.record(z.string(), z.string()).optional().default({}),
});

export type DisabilitasRegistrasiPayload = z.infer<typeof disabilitasRegistrasiSchema>;

/* ─── Master Disabilitas CRUD ─── */
export const masterDisabilitasSchema = z.object({
    nama_disabilitas: z.string().trim().min(1, "Nama disabilitas wajib diisi.").max(200),
    keterangan: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z.string().max(1000).nullable().optional()
        )
        .transform((v) => v ?? null),
});

export type MasterDisabilitasPayload = z.infer<typeof masterDisabilitasSchema>;

/* ─── Master Bantuan CRUD ─── */
export const masterBantuanSchema = z.object({
    nama_bantuan: z.string().trim().min(1, "Nama bantuan wajib diisi.").max(200),
    keterangan: z
        .preprocess(
            (v) => (v === "" || v == null ? null : v),
            z.string().max(1000).nullable().optional()
        )
        .transform((v) => v ?? null),
});

export type MasterBantuanPayload = z.infer<typeof masterBantuanSchema>;
