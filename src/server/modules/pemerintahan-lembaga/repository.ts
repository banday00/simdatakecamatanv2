import "server-only";

import { pool } from "@/db/client";
import type { LembagaPayload } from "./schemas";

export type LembagaRow = {
    id: string;
    tenant_id: string;
    kelurahan_id: string;
    nama: string;
    jenis: string;
    ketua: string | null;
    jumlah_anggota: number;
    status: string;
    created_at: string | null;
};

const LEMBAGA_COLUMNS = `
    id, tenant_id, kelurahan_id, nama, jenis, ketua, jumlah_anggota, status, created_at
`;

export async function listLembagaByTenant(tenantId: string, kelurahanId?: string | null) {
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<LembagaRow>(
        `SELECT ${LEMBAGA_COLUMNS}
         FROM gov_institutions
         WHERE ${where.join(" AND ")}
         ORDER BY created_at DESC, jenis ASC, nama ASC`,
        values
    );

    return result.rows;
}

export async function getLembagaById(id: string, tenantId: string) {
    const result = await pool.query<LembagaRow>(
        `SELECT ${LEMBAGA_COLUMNS}
         FROM gov_institutions
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
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

export async function createLembaga(tenantId: string, payload: LembagaPayload) {
    const result = await pool.query<LembagaRow>(
        `INSERT INTO gov_institutions (
            tenant_id, kelurahan_id, nama, jenis, ketua, jumlah_anggota, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING ${LEMBAGA_COLUMNS}`,
        [
            tenantId,
            payload.kelurahan_id,
            payload.nama,
            payload.jenis,
            payload.ketua,
            payload.jumlah_anggota,
            payload.status,
        ]
    );

    return result.rows[0];
}

export async function updateLembaga(id: string, tenantId: string, payload: LembagaPayload) {
    const result = await pool.query<LembagaRow>(
        `UPDATE gov_institutions
         SET kelurahan_id = $1,
             nama = $2,
             jenis = $3,
             ketua = $4,
             jumlah_anggota = $5,
             status = $6
         WHERE id = $7 AND tenant_id = $8
         RETURNING ${LEMBAGA_COLUMNS}`,
        [
            payload.kelurahan_id,
            payload.nama,
            payload.jenis,
            payload.ketua,
            payload.jumlah_anggota,
            payload.status,
            id,
            tenantId,
        ]
    );

    return result.rows[0] ?? null;
}

export async function deleteLembaga(id: string, tenantId: string) {
    const result = await pool.query<LembagaRow>(
        `DELETE FROM gov_institutions
         WHERE id = $1 AND tenant_id = $2
         RETURNING ${LEMBAGA_COLUMNS}`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}
