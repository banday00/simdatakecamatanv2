import "server-only";

import { pool } from "@/db/client";
import type { PendidikanResource } from "./schemas";

type ResourceConfig = {
    table: string;
    columns: readonly string[];
    orderBy: string;
};

export type PendidikanRow = Record<string, unknown> & {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
};

export const pendidikanResources: Record<PendidikanResource, ResourceConfig> = {
    sarana: {
        table: "edu_facilities",
        columns: [
            "id", "tenant_id", "kelurahan_id", "nama", "jenjang", "status", "npsn",
            "jumlah_guru", "jumlah_siswa", "akreditasi", "koordinat_lat", "koordinat_lng",
            "jumlah_rombel", "jumlah_siswa_perempuan", "jumlah_siswa_laki",
            "jumlah_siswa_dalam_kota", "jumlah_siswa_luar_kota", "jumlah_ruang_kelas",
            "semester", "tahun_ajaran", "partisipasi_bos", "created_at",
        ],
        orderBy: "created_at DESC, nama ASC",
    },
    partisipasi: {
        table: "edu_participation",
        columns: [
            "id", "tenant_id", "kelurahan_id", "tahun", "jenjang", "angka_partisipasi",
            "angka_putus_sekolah", "angka_melek_huruf", "jumlah_usia_7_12",
            "jumlah_usia_13_15", "jumlah_usia_16_18", "semester", "created_at",
        ],
        orderBy: "tahun DESC, semester DESC, created_at DESC",
    },
};

function columnList(resource: PendidikanResource) {
    return pendidikanResources[resource].columns.join(", ");
}

export async function listPendidikanRows(resource: PendidikanResource, tenantId: string, kelurahanId?: string | null) {
    const config = pendidikanResources[resource];
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<PendidikanRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE ${where.join(" AND ")}
         ORDER BY ${config.orderBy}`,
        values
    );

    return result.rows;
}

export async function getPendidikanRow(resource: PendidikanResource, id: string, tenantId: string) {
    const config = pendidikanResources[resource];
    const result = await pool.query<PendidikanRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createPendidikanRow(resource: PendidikanResource, tenantId: string, payload: Record<string, unknown>) {
    const config = pendidikanResources[resource];
    const fields = Object.keys(payload);
    const columns = ["tenant_id", ...fields];
    const values = [tenantId, ...fields.map((field) => payload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<PendidikanRow>(
        `INSERT INTO ${config.table} (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0];
}

export async function updatePendidikanRow(
    resource: PendidikanResource,
    id: string,
    tenantId: string,
    payload: Record<string, unknown>
) {
    const config = pendidikanResources[resource];
    const fields = Object.keys(payload);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => payload[field]);
    values.push(id, tenantId);

    const result = await pool.query<PendidikanRow>(
        `UPDATE ${config.table}
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deletePendidikanRow(resource: PendidikanResource, id: string, tenantId: string) {
    const config = pendidikanResources[resource];
    const result = await pool.query<PendidikanRow>(
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

export async function getSiswaSummary(tenantId: string, kelurahanId: string, tahun: number, semester: number) {
    const semesterCombined = tahun * 10 + semester;
    const result = await pool.query<{ sd: string; smp: string; sma: string }>(
        `SELECT
            COALESCE(SUM(jumlah_siswa) FILTER (WHERE jenjang IN ('SD', 'SPK SD')), 0)::text AS sd,
            COALESCE(SUM(jumlah_siswa) FILTER (WHERE jenjang IN ('SMP', 'SPK SMP')), 0)::text AS smp,
            COALESCE(SUM(jumlah_siswa) FILTER (WHERE jenjang IN ('SMA', 'SPK SMA', 'SMK')), 0)::text AS sma
         FROM edu_facilities
         WHERE tenant_id = $1
           AND kelurahan_id = $2
           AND tahun_ajaran = $3
           AND semester = $4`,
        [tenantId, kelurahanId, tahun, semesterCombined]
    );

    const row = result.rows[0] ?? { sd: "0", smp: "0", sma: "0" };
    return {
        sd: Number(row.sd) || 0,
        smp: Number(row.smp) || 0,
        sma: Number(row.sma) || 0,
    };
}
