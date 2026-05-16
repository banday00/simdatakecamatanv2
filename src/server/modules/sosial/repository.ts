import "server-only";

import { pool } from "@/db/client";
import type { SosialResource } from "./schemas";

type ResourceConfig = {
    table: string;
    columns: readonly string[];
    orderBy: string;
};

export type SosialRow = Record<string, unknown> & {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
};

export const sosialResources: Record<SosialResource, ResourceConfig> = {
    bantuan: {
        table: "social_assistance",
        columns: [
            "id", "tenant_id", "kelurahan_id", "tahun", "jenis_bantuan", "sumber",
            "jumlah_penerima", "nominal", "created_at", "bulan", "jumlah_kk_penerima",
            "total_anggaran", "sumber_anggaran", "status_penyaluran", "pct_tersalurkan",
        ],
        orderBy: "created_at DESC, tahun DESC, bulan DESC",
    },
    disabilitas: {
        table: "social_disability",
        columns: [
            "id", "tenant_id", "kelurahan_id", "tahun", "jenis_disabilitas", "jumlah",
            "mendapat_bantuan", "created_at", "laki_laki", "perempuan", "usia_anak",
            "usia_dewasa", "usia_lansia", "penerima_bantuan",
        ],
        orderBy: "created_at DESC, tahun DESC, jenis_disabilitas ASC",
    },
    keagamaan: {
        table: "social_religious",
        columns: [
            "id", "tenant_id", "kelurahan_id", "jenis", "nama", "lokasi", "kapasitas",
            "koordinat_lat", "koordinat_lng", "created_at", "alamat", "kondisi",
            "status_tanah", "tahun_berdiri", "tahun_data",
        ],
        orderBy: "created_at DESC, nama ASC",
    },
    perumahan: {
        table: "social_rtlh",
        columns: [
            "id", "tenant_id", "kelurahan_id", "tahun", "rtlh_total", "rtlh_diperbaiki",
            "anggaran", "created_at", "jumlah_rtlh", "sudah_direhabilitasi",
            "belum_direhabilitasi", "anggaran_rehabilitasi", "sumber_dana",
        ],
        orderBy: "created_at DESC, tahun DESC",
    },
};

function columnList(resource: SosialResource) {
    return sosialResources[resource].columns.join(", ");
}

export async function listSosialRows(resource: SosialResource, tenantId: string, kelurahanId?: string | null) {
    const config = sosialResources[resource];
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<SosialRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE ${where.join(" AND ")}
         ORDER BY ${config.orderBy}`,
        values
    );

    return result.rows;
}

export async function getSosialRow(resource: SosialResource, id: string, tenantId: string) {
    const config = sosialResources[resource];
    const result = await pool.query<SosialRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createSosialRow(resource: SosialResource, tenantId: string, payload: Record<string, unknown>) {
    const config = sosialResources[resource];
    const fields = Object.keys(payload);
    const columns = ["tenant_id", ...fields];
    const values = [tenantId, ...fields.map((field) => payload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<SosialRow>(
        `INSERT INTO ${config.table} (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0];
}

export async function updateSosialRow(resource: SosialResource, id: string, tenantId: string, payload: Record<string, unknown>) {
    const config = sosialResources[resource];
    const fields = Object.keys(payload);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => payload[field]);
    values.push(id, tenantId);

    const result = await pool.query<SosialRow>(
        `UPDATE ${config.table}
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteSosialRow(resource: SosialResource, id: string, tenantId: string) {
    const config = sosialResources[resource];
    const result = await pool.query<SosialRow>(
        `DELETE FROM ${config.table}
         WHERE id = $1 AND tenant_id = $2
         RETURNING ${columnList(resource)}`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function kelurahanBelongsToTenant(kelurahanId: string, tenantId: string) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM kelurahans WHERE id = $1 AND tenant_id = $2 AND is_active = true
         ) AS exists`,
        [kelurahanId, tenantId]
    );

    return Boolean(result.rows[0]?.exists);
}
