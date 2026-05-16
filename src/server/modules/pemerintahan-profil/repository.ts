import "server-only";

import { pool } from "@/db/client";
import type { ProfilPatch, ProfilPayload } from "./schemas";

export type ProfilRow = {
    id: string;
    tenant_id: string;
    kelurahan_id: string | null;
    tahun: number;
    visi: string | null;
    misi: string | null;
    tentang_wilayah: string | null;
    peta_wilayah: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type OrgLeaderRow = {
    kelurahan_id: string | null;
    nama_pejabat: string;
    nip: string | null;
    foto: string | null;
    jabatan: string;
};

const PROFIL_COLUMNS = `
    id, tenant_id, kelurahan_id, tahun, visi, misi, tentang_wilayah,
    peta_wilayah, created_at, updated_at
`;

export async function listProfilByTenant(tenantId: string, kelurahanId?: string | null) {
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<ProfilRow>(
        `SELECT ${PROFIL_COLUMNS}
         FROM gov_profiles
         WHERE ${where.join(" AND ")}
         ORDER BY tahun DESC, created_at DESC`,
        values
    );

    return result.rows;
}

export async function listProfilLeaders(tenantId: string) {
    const result = await pool.query<OrgLeaderRow>(
        `SELECT kelurahan_id, nama_pejabat, nip, foto, jabatan
         FROM gov_organisasi
         WHERE tenant_id = $1 AND urutan = 1 AND is_active = true
         ORDER BY kelurahan_id NULLS FIRST, nama_pejabat`,
        [tenantId]
    );

    return result.rows;
}

export async function getProfilById(id: string, tenantId: string) {
    const result = await pool.query<ProfilRow>(
        `SELECT ${PROFIL_COLUMNS}
         FROM gov_profiles
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

export async function createProfil(tenantId: string, payload: ProfilPayload) {
    const result = await pool.query<ProfilRow>(
        `INSERT INTO gov_profiles (
            tenant_id, kelurahan_id, tahun, visi, misi, tentang_wilayah, peta_wilayah
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING ${PROFIL_COLUMNS}`,
        [
            tenantId,
            payload.kelurahan_id ?? null,
            payload.tahun,
            payload.visi,
            payload.misi,
            payload.tentang_wilayah,
            payload.peta_wilayah,
        ]
    );

    return result.rows[0];
}

export async function updateProfil(id: string, tenantId: string, payload: ProfilPatch) {
    const result = await pool.query<ProfilRow>(
        `UPDATE gov_profiles
         SET tahun = $1,
             visi = $2,
             misi = $3,
             tentang_wilayah = $4,
             peta_wilayah = $5,
             updated_at = now()
         WHERE id = $6 AND tenant_id = $7
         RETURNING ${PROFIL_COLUMNS}`,
        [
            payload.tahun,
            payload.visi,
            payload.misi,
            payload.tentang_wilayah,
            payload.peta_wilayah,
            id,
            tenantId,
        ]
    );

    return result.rows[0] ?? null;
}

export async function deleteProfil(id: string, tenantId: string) {
    const result = await pool.query<ProfilRow>(
        `DELETE FROM gov_profiles
         WHERE id = $1 AND tenant_id = $2
         RETURNING ${PROFIL_COLUMNS}`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

