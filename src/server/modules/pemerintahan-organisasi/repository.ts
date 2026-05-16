import "server-only";

import { pool } from "@/db/client";
import type { OrganisasiPayload } from "./schemas";

export type OrganisasiRow = {
    id: string;
    tenant_id: string;
    kelurahan_id: string | null;
    jabatan: string;
    nama_pejabat: string;
    nip: string | null;
    foto: string | null;
    urutan: number;
    is_active: boolean;
    created_at: string | null;
    updated_at: string | null;
};

const ORGANISASI_COLUMNS = `
    id, tenant_id, kelurahan_id, jabatan, nama_pejabat, nip, foto,
    urutan, is_active, created_at, updated_at
`;

export async function listOrganisasiByTenant(tenantId: string, kelurahanId?: string | null) {
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<OrganisasiRow>(
        `SELECT ${ORGANISASI_COLUMNS}
         FROM gov_organisasi
         WHERE ${where.join(" AND ")}
         ORDER BY urutan ASC, created_at DESC`,
        values
    );

    return result.rows;
}

export async function getOrganisasiById(id: string, tenantId: string) {
    const result = await pool.query<OrganisasiRow>(
        `SELECT ${ORGANISASI_COLUMNS}
         FROM gov_organisasi
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

export async function createOrganisasi(tenantId: string, payload: OrganisasiPayload) {
    const result = await pool.query<OrganisasiRow>(
        `INSERT INTO gov_organisasi (
            tenant_id, kelurahan_id, jabatan, nama_pejabat, nip, foto, urutan, is_active
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING ${ORGANISASI_COLUMNS}`,
        [
            tenantId,
            payload.kelurahan_id,
            payload.jabatan,
            payload.nama_pejabat,
            payload.nip,
            payload.foto,
            payload.urutan,
            payload.is_active,
        ]
    );

    return result.rows[0];
}

export async function updateOrganisasi(id: string, tenantId: string, payload: OrganisasiPayload) {
    const result = await pool.query<OrganisasiRow>(
        `UPDATE gov_organisasi
         SET kelurahan_id = $1,
             jabatan = $2,
             nama_pejabat = $3,
             nip = $4,
             foto = $5,
             urutan = $6,
             is_active = $7,
             updated_at = now()
         WHERE id = $8 AND tenant_id = $9
         RETURNING ${ORGANISASI_COLUMNS}`,
        [
            payload.kelurahan_id,
            payload.jabatan,
            payload.nama_pejabat,
            payload.nip,
            payload.foto,
            payload.urutan,
            payload.is_active,
            id,
            tenantId,
        ]
    );

    return result.rows[0] ?? null;
}

export async function deleteOrganisasi(id: string, tenantId: string) {
    const result = await pool.query<OrganisasiRow>(
        `DELETE FROM gov_organisasi
         WHERE id = $1 AND tenant_id = $2
         RETURNING ${ORGANISASI_COLUMNS}`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}
