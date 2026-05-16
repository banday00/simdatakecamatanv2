import "server-only";

import { pool } from "@/db/client";
import type { InfrastrukturResource } from "./schemas";

type ResourceConfig = {
    table: string;
    columns: readonly string[];
    orderBy: string;
};

export type InfrastrukturRow = Record<string, unknown> & {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
};

export type RefJenisSaranaOlahraga = {
    id: number;
    nama: string;
    urut: number;
};

export const infrastrukturResources: Record<InfrastrukturResource, ResourceConfig> = {
    pembangunan: {
        table: "infra_development",
        columns: [
            "id", "tenant_id", "kelurahan_id", "tahun", "nama_proyek", "sumber_dana",
            "anggaran", "realisasi", "progress_persen", "status", "created_at",
            "volume", "satuan", "instansi_pelaksana", "keterangan", "lokasi",
        ],
        orderBy: "created_at DESC, tahun DESC, nama_proyek ASC",
    },
    sanitasi: {
        table: "infra_sanitation",
        columns: [
            "id", "tenant_id", "kelurahan_id", "tahun", "akses_air_bersih_persen",
            "akses_sanitasi_persen", "rumah_kumuh", "tps_jumlah", "created_at",
            "rt_jamban_sehat", "rt_tanpa_jamban", "rt_tanpa_septictank", "status_odf",
            "rt_ctps", "rt_air_minum_layak", "rt_tanpa_air_bersih", "rt_rentan_kekeringan",
            "rt_sampah_terpilah", "tps_sementara", "tempat_pengolahan_sampah",
            "rt_pemilahan_sampah", "rt_spal", "petugas_kebersihan",
        ],
        orderBy: "tahun DESC, created_at DESC",
    },
    olahraga: {
        table: "infra_sports",
        columns: [
            "id", "tenant_id", "kelurahan_id", "nama", "kondisi", "luas",
            "koordinat_lat", "koordinat_lng", "created_at", "status_kepemilikan",
            "jenis_id", "alamat",
        ],
        orderBy: "created_at DESC, nama ASC",
    },
};

function columnList(resource: InfrastrukturResource) {
    return infrastrukturResources[resource].columns.join(", ");
}

export async function listInfrastrukturRows(resource: InfrastrukturResource, tenantId: string, kelurahanId?: string | null) {
    const config = infrastrukturResources[resource];
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<InfrastrukturRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE ${where.join(" AND ")}
         ORDER BY ${config.orderBy}`,
        values
    );

    return result.rows;
}

export async function getInfrastrukturRow(resource: InfrastrukturResource, id: string, tenantId: string) {
    const config = infrastrukturResources[resource];
    const result = await pool.query<InfrastrukturRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createInfrastrukturRow(resource: InfrastrukturResource, tenantId: string, payload: Record<string, unknown>) {
    const config = infrastrukturResources[resource];
    const fields = Object.keys(payload);
    const columns = ["tenant_id", ...fields];
    const values = [tenantId, ...fields.map((field) => payload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<InfrastrukturRow>(
        `INSERT INTO ${config.table} (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0];
}

export async function updateInfrastrukturRow(
    resource: InfrastrukturResource,
    id: string,
    tenantId: string,
    payload: Record<string, unknown>
) {
    const config = infrastrukturResources[resource];
    const fields = Object.keys(payload);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => payload[field]);
    values.push(id, tenantId);

    const result = await pool.query<InfrastrukturRow>(
        `UPDATE ${config.table}
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteInfrastrukturRow(resource: InfrastrukturResource, id: string, tenantId: string) {
    const config = infrastrukturResources[resource];
    const result = await pool.query<InfrastrukturRow>(
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

export async function listRefJenisSaranaOlahraga() {
    const result = await pool.query<RefJenisSaranaOlahraga>(
        `SELECT id, nama, urut
         FROM ref_jenis_sarana_olahraga
         WHERE aktif = true
         ORDER BY urut ASC, nama ASC`
    );

    return result.rows;
}

export async function refJenisSaranaOlahragaExists(id: number) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM ref_jenis_sarana_olahraga WHERE id = $1 AND aktif = true
         ) AS exists`,
        [id]
    );

    return Boolean(result.rows[0]?.exists);
}
