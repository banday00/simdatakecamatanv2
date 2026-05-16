import "server-only";

import { pool } from "@/db/client";
import type { HealthResource } from "./schemas";

type ResourceConfig = {
    table: string;
    columns: readonly string[];
    orderBy: string;
    updateTimestamp?: boolean;
};

export type HealthRow = Record<string, unknown> & {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
};

export type JenisFasilitasRow = {
    id: number;
    nama: string;
};

export type StuntingAgregatRow = {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
    tahun: number;
    bulan: number;
    balita_total: number;
    balita_stunting: number;
    balita_gizi_buruk: number;
    balita_gizi_kurang: number;
};

export const healthResources: Record<HealthResource, ResourceConfig> = {
    fasilitas: {
        table: "health_facilities",
        columns: [
            "id", "tenant_id", "kelurahan_id", "nama", "alamat", "penanggung_jawab",
            "jumlah_tenaga_medis", "koordinat_lat", "koordinat_lng", "jenis_id", "created_at",
        ],
        orderBy: "created_at DESC, nama ASC",
    },
    maternal: {
        table: "health_maternal",
        columns: [
            "id", "tenant_id", "kelurahan_id", "tahun", "ibu_hamil", "ibu_bersalin",
            "bayi_lahir_hidup", "kematian_ibu", "kematian_bayi", "kb_aktif", "created_at",
        ],
        orderBy: "tahun DESC, created_at DESC",
    },
    posyandu: {
        table: "health_posyandu",
        columns: [
            "id", "tenant_id", "kelurahan_id", "nama", "strata", "jumlah_kader", "jumlah_balita",
            "jumlah_lansia", "alamat", "ketua", "anggota_kader", "rt_rw", "frekuensi_kegiatan",
            "tahun", "jumlah_ibu_hamil", "jumlah_wus_pus", "cakupan_gizi", "cakupan_kia",
            "cakupan_kb", "cakupan_imunisasi", "created_at",
        ],
        orderBy: "nama ASC, created_at DESC",
    },
    stuntingBnba: {
        table: "health_stunting_bnba",
        columns: [
            "id", "tenant_id", "kelurahan_id", "posyandu_id", "nik_anak", "nama_anak",
            "jenis_kelamin", "tanggal_lahir", "nama_ortu", "alamat", "rt_rw", "tanggal_pengukuran",
            "berat_badan", "tinggi_badan", "status_tbu", "status_bbu", "intervensi_diterima",
            "created_at", "updated_at",
        ],
        orderBy: "tanggal_pengukuran DESC, nama_anak ASC",
        updateTimestamp: true,
    },
};

function columnList(resource: HealthResource) {
    return healthResources[resource].columns.join(", ");
}

export async function listHealthRows(resource: HealthResource, tenantId: string, kelurahanId?: string | null) {
    const config = healthResources[resource];
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<HealthRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE ${where.join(" AND ")}
         ORDER BY ${config.orderBy}`,
        values
    );

    return result.rows;
}

export async function getHealthRow(resource: HealthResource, id: string, tenantId: string) {
    const config = healthResources[resource];
    const result = await pool.query<HealthRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createHealthRow(
    resource: HealthResource,
    tenantId: string,
    payload: Record<string, unknown>
) {
    const config = healthResources[resource];
    const fields = Object.keys(payload);
    const columns = ["tenant_id", ...fields.map(String)];
    const values = [tenantId, ...fields.map((field) => payload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<HealthRow>(
        `INSERT INTO ${config.table} (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0];
}

export async function updateHealthRow(
    resource: HealthResource,
    id: string,
    tenantId: string,
    payload: Record<string, unknown>
) {
    const config = healthResources[resource];
    const fields = Object.keys(payload);
    const assignments = fields.map((field, index) => `${String(field)} = $${index + 1}`);
    const values = fields.map((field) => payload[field]);

    if (config.updateTimestamp) {
        assignments.push("updated_at = now()");
    }

    values.push(id, tenantId);

    const result = await pool.query<HealthRow>(
        `UPDATE ${config.table}
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteHealthRow(resource: HealthResource, id: string, tenantId: string) {
    const config = healthResources[resource];
    const result = await pool.query<HealthRow>(
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

export async function jenisFasilitasExists(jenisId: number) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM ref_jenis_fasilitas_kesehatan WHERE id = $1
         ) AS exists`,
        [jenisId]
    );

    return Boolean(result.rows[0]?.exists);
}

export async function listJenisFasilitas() {
    const result = await pool.query<JenisFasilitasRow>(
        `SELECT id, nama
         FROM ref_jenis_fasilitas_kesehatan
         ORDER BY nama`,
    );

    return result.rows;
}

export async function posyanduBelongsToTenant(posyanduId: string, tenantId: string, kelurahanId: string) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1
            FROM health_posyandu
            WHERE id = $1 AND tenant_id = $2 AND kelurahan_id = $3
         ) AS exists`,
        [posyanduId, tenantId, kelurahanId]
    );

    return Boolean(result.rows[0]?.exists);
}

export async function listStuntingAgregat(tenantId: string, kelurahanId?: string | null) {
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<StuntingAgregatRow>(
        `SELECT
            concat(kelurahan_id, '-', tahun, '-', bulan) AS id,
            tenant_id,
            kelurahan_id,
            tahun,
            bulan,
            balita_total::integer AS balita_total,
            balita_stunting::integer AS balita_stunting,
            balita_gizi_buruk::integer AS balita_gizi_buruk,
            balita_gizi_kurang::integer AS balita_gizi_kurang
         FROM health_stunting_agregat_view
         WHERE ${where.join(" AND ")}
         ORDER BY tahun DESC, bulan DESC`,
        values
    );

    return result.rows;
}
