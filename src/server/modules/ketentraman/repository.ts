import "server-only";

import { pool } from "@/db/client";
import type { KetentramanResource } from "./schemas";

type ResourceConfig = {
    table: string;
    columns: readonly string[];
    orderBy: string;
};

export type KetentramanRow = Record<string, unknown> & {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
};

export const ketentramanResources: Record<KetentramanResource, ResourceConfig> = {
    insiden: {
        table: "security_incidents",
        columns: [
            "id", "tenant_id", "kelurahan_id", "jenis", "deskripsi", "tanggal", "lokasi",
            "korban", "kerugian", "created_at", "jenis_kejadian", "korban_meninggal",
            "korban_luka", "pengungsi", "kerusakan_rumah", "kerugian_material",
            "penanganan", "status",
        ],
        orderBy: "created_at DESC, tanggal DESC",
    },
    bencana: {
        table: "security_disaster_zones",
        columns: [
            "id", "tenant_id", "kelurahan_id", "jenis_bencana", "tingkat_risiko",
            "lokasi", "koordinat_lat", "koordinat_lng", "created_at",
            "jumlah_kk_terdampak", "jalur_evakuasi", "posko_bencana", "tahun_data",
        ],
        orderBy: "created_at DESC, tahun_data DESC",
    },
    kader: {
        table: "security_cadres",
        columns: [
            "id", "tenant_id", "kelurahan_id", "jenis", "jumlah", "tahun", "created_at",
            "jumlah_linmas", "jumlah_satgas", "jumlah_fkdm", "pelatihan_dilaksanakan",
            "kegiatan_siskamling", "pos_kamling",
        ],
        orderBy: "created_at DESC, tahun DESC",
    },
};

function columnList(resource: KetentramanResource) {
    return ketentramanResources[resource].columns.join(", ");
}

export async function listKetentramanRows(resource: KetentramanResource, tenantId: string, kelurahanId?: string | null) {
    const config = ketentramanResources[resource];
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<KetentramanRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE ${where.join(" AND ")}
         ORDER BY ${config.orderBy}`,
        values
    );

    return result.rows;
}

export async function getKetentramanRow(resource: KetentramanResource, id: string, tenantId: string) {
    const config = ketentramanResources[resource];
    const result = await pool.query<KetentramanRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createKetentramanRow(resource: KetentramanResource, tenantId: string, payload: Record<string, unknown>) {
    const config = ketentramanResources[resource];
    const fields = Object.keys(payload);
    const columns = ["tenant_id", ...fields];
    const values = [tenantId, ...fields.map((field) => payload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<KetentramanRow>(
        `INSERT INTO ${config.table} (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0];
}

export async function updateKetentramanRow(
    resource: KetentramanResource,
    id: string,
    tenantId: string,
    payload: Record<string, unknown>
) {
    const config = ketentramanResources[resource];
    const fields = Object.keys(payload);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => payload[field]);
    values.push(id, tenantId);

    const result = await pool.query<KetentramanRow>(
        `UPDATE ${config.table}
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteKetentramanRow(resource: KetentramanResource, id: string, tenantId: string) {
    const config = ketentramanResources[resource];
    const result = await pool.query<KetentramanRow>(
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
