import "server-only";

import { pool } from "@/db/client";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

export type StuntingChildRow = {
    penduduk_id: string;
    nik: string;
    nama: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    nama_ibu_kandung: string | null;
    no_kk: string | null;
    alamat: string | null;
    rt: string | null;
    rw: string | null;
    kelurahan_id: string;
    kelurahan_nama?: string;
    // Summary fields
    total_pemeriksaan: number;
    latest_tanggal: string | null;
    latest_status_tbu: string | null;
    latest_status_bbu: string | null;
    latest_berat_badan: number | null;
    latest_tinggi_badan: number | null;
};

export type StuntingMeasurementRow = {
    id: string;
    penduduk_id: string;
    tenant_id: string;
    kelurahan_id: string;
    posyandu_id: string | null;
    nama_ortu: string | null;
    tanggal_pengukuran: string;
    berat_badan: number | null;
    tinggi_badan: number | null;
    status_tbu: string;
    status_bbu: string;
    intervensi_diterima: string[];
    created_at: string;
    updated_at: string;
};

export type PendudukSearchResult = {
    penduduk_id: string;
    nik: string;
    nama: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    nama_ibu_kandung: string | null;
    keluarga_id: string;
    no_kk: string | null;
    alamat: string | null;
    rt: string | null;
    rw: string | null;
    kelurahan_id: string;
} | null;

/* ═══════════════════════════════════════════
   List Stunting Children (grouped by penduduk_id)
   ═══════════════════════════════════════════ */

export async function listStuntingChildren(
    tenantId: string,
    kelurahanId?: string | null
) {
    const values: unknown[] = [tenantId];
    const whereExtra = kelurahanId
        ? (() => { values.push(kelurahanId); return `AND k.kelurahan_id = $${values.length}`; })()
        : "";

    const result = await pool.query<StuntingChildRow>(
        `WITH latest AS (
            SELECT DISTINCT ON (b.penduduk_id)
                b.penduduk_id,
                b.tanggal_pengukuran AS latest_tanggal,
                b.status_tbu AS latest_status_tbu,
                b.status_bbu AS latest_status_bbu,
                b.berat_badan AS latest_berat_badan,
                b.tinggi_badan AS latest_tinggi_badan
            FROM health_stunting_bnba b
            WHERE b.tenant_id = $1 AND b.penduduk_id IS NOT NULL
            ORDER BY b.penduduk_id, b.tanggal_pengukuran DESC
        ),
        counts AS (
            SELECT b.penduduk_id, count(*)::int AS total_pemeriksaan
            FROM health_stunting_bnba b
            WHERE b.tenant_id = $1 AND b.penduduk_id IS NOT NULL
            GROUP BY b.penduduk_id
        )
        SELECT
            p.id AS penduduk_id,
            p.nik,
            p.nama,
            p.jenis_kelamin,
            p.tanggal_lahir,
            p.nama_ibu_kandung,
            k.no_kk,
            k.alamat,
            k.rt,
            k.rw,
            k.kelurahan_id,
            COALESCE(c.total_pemeriksaan, 0) AS total_pemeriksaan,
            l.latest_tanggal,
            l.latest_status_tbu,
            l.latest_status_bbu,
            l.latest_berat_badan,
            l.latest_tinggi_badan
        FROM counts c
        JOIN penduduk p ON p.id = c.penduduk_id
        JOIN keluarga k ON k.id = p.keluarga_id
        LEFT JOIN latest l ON l.penduduk_id = p.id
        WHERE k.tenant_id = $1 ${whereExtra}
        ORDER BY l.latest_tanggal DESC NULLS LAST, p.nama ASC`,
        values
    );

    return result.rows;
}

/* ═══════════════════════════════════════════
   Get Measurements for a Single Child
   ═══════════════════════════════════════════ */

export async function getChildMeasurements(
    pendudukId: string,
    tenantId: string
) {
    const result = await pool.query<StuntingMeasurementRow>(
        `SELECT
            b.id,
            b.penduduk_id,
            b.tenant_id,
            b.kelurahan_id,
            b.posyandu_id,
            b.nama_ortu,
            b.tanggal_pengukuran,
            b.berat_badan,
            b.tinggi_badan,
            b.status_tbu,
            b.status_bbu,
            b.intervensi_diterima,
            b.created_at,
            b.updated_at
        FROM health_stunting_bnba b
        WHERE b.penduduk_id = $1 AND b.tenant_id = $2
        ORDER BY b.tanggal_pengukuran DESC`,
        [pendudukId, tenantId]
    );

    return result.rows;
}

/* ═══════════════════════════════════════════
   Search Penduduk by NIK (reuse pattern)
   ═══════════════════════════════════════════ */

export async function searchPendudukByNIK(
    nik: string,
    tenantId: string
): Promise<PendudukSearchResult> {
    const result = await pool.query(
        `SELECT
            p.id AS penduduk_id,
            p.nik,
            p.nama,
            p.jenis_kelamin,
            p.tanggal_lahir,
            p.nama_ibu_kandung,
            k.id AS keluarga_id,
            k.no_kk,
            k.alamat,
            k.rt,
            k.rw,
            k.kelurahan_id
        FROM penduduk p
        JOIN keluarga k ON k.id = p.keluarga_id
        WHERE p.nik = $1 AND k.tenant_id = $2
        LIMIT 1`,
        [nik, tenantId]
    );

    return result.rows[0] ?? null;
}

/* ═══════════════════════════════════════════
   Create Stunting Entry (transactional)
   Upsert penduduk/keluarga if new child
   ═══════════════════════════════════════════ */

export async function createStuntingEntry(
    tenantId: string,
    payload: {
        penduduk_id?: string | null;
        kelurahan_id: string;
        posyandu_id?: string | null;
        // Identity (for new child)
        nik_anak?: string | null;
        nama_anak?: string | null;
        jenis_kelamin?: string | null;
        tanggal_lahir?: string | null;
        nama_ortu?: string | null;
        no_kk?: string | null;
        alamat?: string | null;
        rt?: string | null;
        rw?: string | null;
        // Measurement
        tanggal_pengukuran: string;
        berat_badan?: number | null;
        tinggi_badan?: number | null;
        status_tbu: string;
        status_bbu: string;
        intervensi_diterima?: string[];
    }
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let pendudukId = payload.penduduk_id;

        if (!pendudukId && payload.nik_anak) {
            // Try to find existing penduduk by NIK
            const existing = await client.query(
                `SELECT p.id FROM penduduk p JOIN keluarga k ON k.id = p.keluarga_id WHERE p.nik = $1 AND k.tenant_id = $2 LIMIT 1`,
                [payload.nik_anak, tenantId]
            );

            if (existing.rows[0]) {
                pendudukId = existing.rows[0].id;
            } else {
                // Create keluarga first
                let keluargaId: string | null = null;

                if (payload.no_kk) {
                    const existingKK = await client.query(
                        `SELECT id FROM keluarga WHERE no_kk = $1 AND tenant_id = $2 LIMIT 1`,
                        [payload.no_kk, tenantId]
                    );
                    keluargaId = existingKK.rows[0]?.id ?? null;
                }

                if (!keluargaId) {
                    const kkResult = await client.query(
                        `INSERT INTO keluarga (tenant_id, kelurahan_id, no_kk, alamat, rt, rw)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         ON CONFLICT (no_kk) DO UPDATE SET alamat = EXCLUDED.alamat
                         RETURNING id`,
                        [
                            tenantId,
                            payload.kelurahan_id,
                            payload.no_kk || payload.nik_anak, // fallback to NIK
                            payload.alamat,
                            payload.rt,
                            payload.rw,
                        ]
                    );
                    keluargaId = kkResult.rows[0].id;
                }

                // Create penduduk
                const pendudukResult = await client.query(
                    `INSERT INTO penduduk (keluarga_id, nik, nama, jenis_kelamin, tanggal_lahir, nama_ibu_kandung)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id`,
                    [
                        keluargaId,
                        payload.nik_anak,
                        payload.nama_anak,
                        payload.jenis_kelamin,
                        payload.tanggal_lahir || null,
                        payload.nama_ortu || null,
                    ]
                );
                pendudukId = pendudukResult.rows[0].id;
            }
        }

        if (!pendudukId) {
            throw new Error("penduduk_id tidak tersedia dan NIK anak tidak diberikan.");
        }

        // Insert measurement
        const measResult = await client.query(
            `INSERT INTO health_stunting_bnba
                (tenant_id, kelurahan_id, posyandu_id, penduduk_id, nama_ortu,
                 tanggal_pengukuran, berat_badan, tinggi_badan, status_tbu, status_bbu, intervensi_diterima)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [
                tenantId,
                payload.kelurahan_id,
                payload.posyandu_id || null,
                pendudukId,
                payload.nama_ortu || null,
                payload.tanggal_pengukuran,
                payload.berat_badan ?? null,
                payload.tinggi_badan ?? null,
                payload.status_tbu,
                payload.status_bbu,
                payload.intervensi_diterima || [],
            ]
        );

        await client.query("COMMIT");
        return { id: measResult.rows[0].id, penduduk_id: pendudukId };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/* ═══════════════════════════════════════════
   Update Measurement
   ═══════════════════════════════════════════ */

export async function updateStuntingMeasurement(
    id: string,
    tenantId: string,
    payload: {
        posyandu_id?: string | null;
        nama_ortu?: string | null;
        tanggal_pengukuran: string;
        berat_badan?: number | null;
        tinggi_badan?: number | null;
        status_tbu: string;
        status_bbu: string;
        intervensi_diterima?: string[];
    }
) {
    const result = await pool.query(
        `UPDATE health_stunting_bnba
         SET posyandu_id = $1,
             nama_ortu = $2,
             tanggal_pengukuran = $3,
             berat_badan = $4,
             tinggi_badan = $5,
             status_tbu = $6,
             status_bbu = $7,
             intervensi_diterima = $8,
             updated_at = now()
         WHERE id = $9 AND tenant_id = $10
         RETURNING id`,
        [
            payload.posyandu_id || null,
            payload.nama_ortu || null,
            payload.tanggal_pengukuran,
            payload.berat_badan ?? null,
            payload.tinggi_badan ?? null,
            payload.status_tbu,
            payload.status_bbu,
            payload.intervensi_diterima || [],
            id,
            tenantId,
        ]
    );

    return result.rows[0] ?? null;
}

/* ═══════════════════════════════════════════
   Delete Measurement
   ═══════════════════════════════════════════ */

export async function deleteStuntingMeasurement(id: string, tenantId: string) {
    const result = await pool.query(
        `DELETE FROM health_stunting_bnba
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, penduduk_id`,
        [id, tenantId]
    );
    return result.rows[0] ?? null;
}

/* ═══════════════════════════════════════════
   Get Single Measurement Detail
   ═══════════════════════════════════════════ */

export async function getStuntingMeasurement(id: string, tenantId: string) {
    const result = await pool.query<StuntingMeasurementRow>(
        `SELECT
            b.id, b.penduduk_id, b.tenant_id, b.kelurahan_id, b.posyandu_id,
            b.nama_ortu, b.tanggal_pengukuran, b.berat_badan, b.tinggi_badan,
            b.status_tbu, b.status_bbu, b.intervensi_diterima, b.created_at, b.updated_at
         FROM health_stunting_bnba b
         WHERE b.id = $1 AND b.tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );
    return result.rows[0] ?? null;
}
