import "server-only";

import { pool } from "@/db/client";
import type { KependudukanResource } from "./schemas";

type ResourceConfig = {
    table: string;
    columns: readonly string[];
    writeColumns: readonly string[];
    ref?: {
        key: string;
        table: string;
        labelColumn: string;
    };
};

export type KependudukanRow = Record<string, unknown> & {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
    periode_id: number;
};

export type PeriodeRow = {
    id: number;
    tahun: number;
    semester: number;
    keterangan: string | null;
};

export type RefOptionRow = {
    id: number;
    label: string;
};

export const kependudukanResources: Record<KependudukanResource, ResourceConfig> = {
    summary: {
        table: "gov_fact_populasi_summary",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id",
            "jml_penduduk_lk", "jml_penduduk_pr", "jml_penduduk_total",
            "jml_kk_lk", "jml_kk_pr", "jml_kk_total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "jml_penduduk_lk", "jml_penduduk_pr", "jml_kk_lk", "jml_kk_pr"],
    },
    kelompok_umur: {
        table: "gov_fact_populasi_kelompok_umur",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id", "kelompok_umur_id",
            "jml_lk", "jml_pr", "total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "kelompok_umur_id", "jml_lk", "jml_pr"],
        ref: { key: "kelompok_umur_id", table: "ref_kelompok_umur", labelColumn: "rentang_umur" },
    },
    umur_tunggal: {
        table: "gov_fact_populasi_umur_tunggal",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id", "umur",
            "jml_lk", "jml_pr", "total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "umur", "jml_lk", "jml_pr"],
    },
    agama: {
        table: "gov_fact_populasi_agama",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id", "agama_id",
            "jml_lk", "jml_pr", "total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "agama_id", "jml_lk", "jml_pr"],
        ref: { key: "agama_id", table: "ref_agama", labelColumn: "nama_agama" },
    },
    pendidikan: {
        table: "gov_fact_populasi_pendidikan",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id", "pendidikan_id",
            "jml_lk", "jml_pr", "total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "pendidikan_id", "jml_lk", "jml_pr"],
        ref: { key: "pendidikan_id", table: "ref_pendidikan", labelColumn: "jenjang_pendidikan" },
    },
    pekerjaan: {
        table: "gov_fact_populasi_pekerjaan",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id", "pekerjaan_id",
            "jml_lk", "jml_pr", "total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "pekerjaan_id", "jml_lk", "jml_pr"],
        ref: { key: "pekerjaan_id", table: "ref_pekerjaan", labelColumn: "jenis_pekerjaan" },
    },
    status_kawin: {
        table: "gov_fact_populasi_status_kawin",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id", "status_kawin_id",
            "jml_lk", "jml_pr", "total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "status_kawin_id", "jml_lk", "jml_pr"],
        ref: { key: "status_kawin_id", table: "ref_status_kawin", labelColumn: "status" },
    },
    golongan_darah: {
        table: "gov_fact_populasi_golongan_darah",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id", "goldar_id",
            "jml_lk", "jml_pr", "total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "goldar_id", "jml_lk", "jml_pr"],
        ref: { key: "goldar_id", table: "ref_golongan_darah", labelColumn: "nama_goldar" },
    },
    ktp: {
        table: "gov_fact_dokumen_ktp",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id",
            "wajib_ktp_lk", "wajib_ktp_pr", "wajib_ktp_total",
            "punya_ktp_lk", "punya_ktp_pr", "punya_ktp_total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "wajib_ktp_lk", "wajib_ktp_pr", "punya_ktp_lk", "punya_ktp_pr"],
    },
    kia: {
        table: "gov_fact_dokumen_kia",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id",
            "wajib_kia_lk", "wajib_kia_pr", "wajib_kia_total",
            "punya_kia_lk", "punya_kia_pr", "punya_kia_total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "wajib_kia_lk", "wajib_kia_pr", "punya_kia_lk", "punya_kia_pr"],
    },
    akta: {
        table: "gov_fact_dokumen_akta_lahir",
        columns: [
            "id", "tenant_id", "kelurahan_id", "periode_id",
            "penduduk_0_18_lk", "penduduk_0_18_pr", "penduduk_0_18_total",
            "punya_akta_lk", "punya_akta_pr", "punya_akta_total", "created_at", "updated_at",
        ],
        writeColumns: ["kelurahan_id", "periode_id", "penduduk_0_18_lk", "penduduk_0_18_pr", "punya_akta_lk", "punya_akta_pr"],
    },
};

function columnList(resource: KependudukanResource) {
    return kependudukanResources[resource].columns.join(", ");
}

function buildWritePayload(resource: KependudukanResource, payload: Record<string, unknown>) {
    const config = kependudukanResources[resource];
    return Object.fromEntries(config.writeColumns.map((column) => [column, payload[column]]));
}

export async function listKependudukanRows(resource: KependudukanResource, tenantId: string, kelurahanId?: string | null) {
    const config = kependudukanResources[resource];
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<KependudukanRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE ${where.join(" AND ")}
         ORDER BY created_at DESC`,
        values
    );

    return result.rows;
}

export async function getKependudukanRow(resource: KependudukanResource, id: string, tenantId: string) {
    const config = kependudukanResources[resource];
    const result = await pool.query<KependudukanRow>(
        `SELECT ${columnList(resource)}
         FROM ${config.table}
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createKependudukanRow(resource: KependudukanResource, tenantId: string, payload: Record<string, unknown>) {
    const config = kependudukanResources[resource];
    const writePayload = buildWritePayload(resource, payload);
    const fields = Object.keys(writePayload);
    const columns = ["tenant_id", ...fields];
    const values = [tenantId, ...fields.map((field) => writePayload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<KependudukanRow>(
        `INSERT INTO ${config.table} (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0];
}

export async function updateKependudukanRow(resource: KependudukanResource, id: string, tenantId: string, payload: Record<string, unknown>) {
    const config = kependudukanResources[resource];
    const writePayload = buildWritePayload(resource, payload);
    const fields = Object.keys(writePayload);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => writePayload[field]);

    assignments.push("updated_at = now()");
    values.push(id, tenantId);

    const result = await pool.query<KependudukanRow>(
        `UPDATE ${config.table}
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${columnList(resource)}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteKependudukanRow(resource: KependudukanResource, id: string, tenantId: string) {
    const config = kependudukanResources[resource];
    const result = await pool.query<KependudukanRow>(
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

export async function periodeExists(periodeId: number) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM gov_ref_periode WHERE id = $1) AS exists`,
        [periodeId]
    );

    return Boolean(result.rows[0]?.exists);
}

export async function refExists(resource: KependudukanResource, refId: number) {
    const ref = kependudukanResources[resource].ref;
    if (!ref) return true;

    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM ${ref.table} WHERE id = $1) AS exists`,
        [refId]
    );

    return Boolean(result.rows[0]?.exists);
}

export async function listPeriodes() {
    const result = await pool.query<PeriodeRow>(
        `SELECT id, tahun, semester, keterangan
         FROM gov_ref_periode
         ORDER BY tahun DESC, semester DESC`
    );

    return result.rows;
}

export async function listRefOptions() {
    const entries = Object.entries(kependudukanResources)
        .filter((entry): entry is [KependudukanResource, ResourceConfig & { ref: NonNullable<ResourceConfig["ref"]> }] => Boolean(entry[1].ref));

    const results = await Promise.all(
        entries.map(async ([resource, config]) => {
            const result = await pool.query<RefOptionRow>(
                `SELECT id, ${config.ref.labelColumn}::text AS label
                 FROM ${config.ref.table}
                 ORDER BY id`
            );
            return [config.ref.key, result.rows] as const;
        })
    );

    return Object.fromEntries(results);
}
