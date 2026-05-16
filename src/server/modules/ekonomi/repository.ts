import "server-only";

import { pool } from "@/db/client";
import type { EkonomiResource } from "./schemas";

type ResourceConfig = {
    table: string;
    columns: readonly string[];
    orderBy: string;
};

export type EkonomiRow = Record<string, unknown> & {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
};

export type RefEkonomiSarana = {
    id: number;
    nama: string;
    urut: number;
    aktif: boolean;
};

export type RefLapanganUsaha = {
    id: number;
    nama: string;
};

export const ekonomiResources: Record<EkonomiResource, ResourceConfig> = {
    sarana: {
        table: "econ_facilities",
        columns: [
            "id", "tenant_id", "kelurahan_id", "nama", "alamat", "koordinat_lat",
            "koordinat_lng", "jenis_id", "created_at",
        ],
        orderBy: "created_at DESC, nama ASC",
    },
    potensi: {
        table: "econ_potential",
        columns: [
            "id", "tenant_id", "kelurahan_id", "nama_usaha", "pemilik",
            "jumlah_tenaga_kerja", "omzet_per_bulan", "status", "jenis_usaha_id",
            "alamat_usaha", "created_at",
        ],
        orderBy: "created_at DESC, nama_usaha ASC",
    },
    sektorUsaha: {
        table: "econ_business_sectors",
        columns: [
            "id", "tenant_id", "kelurahan_id", "tahun", "jumlah_usaha",
            "jumlah_tenaga_kerja", "sektor_id", "created_at",
        ],
        orderBy: "created_at DESC, tahun DESC",
    },
};

function columnList(resource: EkonomiResource) {
    return ekonomiResources[resource].columns.join(", ");
}

export async function listEkonomiRows(resource: EkonomiResource, tenantId: string, kelurahanId?: string | null) {
    const config = ekonomiResources[resource];
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<EkonomiRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE ${where.join(" AND ")}
         ORDER BY ${config.orderBy}`,
        values
    );

    return result.rows;
}

export async function getEkonomiRow(resource: EkonomiResource, id: string, tenantId: string) {
    const config = ekonomiResources[resource];
    const result = await pool.query<EkonomiRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createEkonomiRow(resource: EkonomiResource, tenantId: string, payload: Record<string, unknown>) {
    const config = ekonomiResources[resource];
    const fields = Object.keys(payload);
    const columns = ["tenant_id", ...fields];
    const values = [tenantId, ...fields.map((field) => payload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<EkonomiRow>(
        `INSERT INTO ${config.table} (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0];
}

export async function updateEkonomiRow(
    resource: EkonomiResource,
    id: string,
    tenantId: string,
    payload: Record<string, unknown>
) {
    const config = ekonomiResources[resource];
    const fields = Object.keys(payload);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => payload[field]);
    values.push(id, tenantId);

    const result = await pool.query<EkonomiRow>(
        `UPDATE ${config.table}
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteEkonomiRow(resource: EkonomiResource, id: string, tenantId: string) {
    const config = ekonomiResources[resource];
    const result = await pool.query<EkonomiRow>(
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

export async function refEkonomiSaranaExists(id: number) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM ref_ekonomi_sarana WHERE id = $1 AND aktif = true
         ) AS exists`,
        [id]
    );

    return Boolean(result.rows[0]?.exists);
}

export async function refLapanganUsahaExists(id: number) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM ref_lapangan_usaha WHERE id = $1
         ) AS exists`,
        [id]
    );

    return Boolean(result.rows[0]?.exists);
}

export async function listRefEkonomiSarana() {
    const result = await pool.query<RefEkonomiSarana>(
        `SELECT id, nama, urut, aktif
         FROM ref_ekonomi_sarana
         WHERE aktif = true
         ORDER BY urut ASC, nama ASC`
    );

    return result.rows;
}

export async function listRefLapanganUsaha() {
    const result = await pool.query<RefLapanganUsaha>(
        `SELECT id, nama
         FROM ref_lapangan_usaha
         ORDER BY id ASC`
    );

    return result.rows;
}
