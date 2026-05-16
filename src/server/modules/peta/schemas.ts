import "server-only";

import { z } from "zod";
import { latitudeSchema, longitudeSchema, uuidSchema } from "@/server/validation/common";

const nullableText = (max = 1000) =>
    z.preprocess(
        (value) => (value === "" || value == null ? null : value),
        z.string().trim().max(max).nullable().optional()
    ).transform((value) => value ?? null);

const nullableUuid = z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    uuidSchema.nullable().optional()
).transform((value) => value ?? null);

const jsonObjectSchema = z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const mapLayerTypeSchema = z.enum(["boundary", "polygon", "point", "line"]);

export const mapLayerPayloadSchema = z.object({
    nama: z.string().trim().min(1, "Nama layer wajib diisi.").max(220),
    jenis: mapLayerTypeSchema.default("boundary"),
    geojson: jsonObjectSchema,
    style: jsonObjectSchema,
    is_visible: z.coerce.boolean().default(true),
    urutan: z.coerce.number().int().min(0).default(0),
});

export const mapPoiPayloadSchema = z.object({
    kelurahan_id: nullableUuid,
    nama: z.string().trim().min(1, "Nama lokasi wajib diisi.").max(220),
    kategori: z.string().trim().min(1, "Kategori wajib diisi.").max(120),
    deskripsi: nullableText(2000),
    alamat: nullableText(1000),
    foto: nullableText(1000),
    koordinat_lat: latitudeSchema,
    koordinat_lng: longitudeSchema,
});

export type MapLayerPayload = z.infer<typeof mapLayerPayloadSchema>;
export type MapPoiPayload = z.infer<typeof mapPoiPayloadSchema>;
