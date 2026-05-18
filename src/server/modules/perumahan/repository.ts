import "server-only";

import { pool } from "@/db/client";

/* ─── Types ─── */
export type RtlhRow = {
    id: string;
    penduduk_id: string;
    nik: string;
    nama: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    no_kk: string | null;
    alamat: string | null;
    rt: string | null;
    rw: string | null;
    kelurahan_id: string;
    tahun: number;
    kategori: string;
    created_at: string;
};

/* ─── List Penerima RTLH (JOIN) ─── */
export async function listRtlhPersons(tenantId: string, kelurahanId?: string | null) {
    const values: unknown[] = [tenantId];
    const whereExtra = kelurahanId ? (() => { values.push(kelurahanId); return `AND k.kelurahan_id = $${values.length}`; })() : "";

    const result = await pool.query<RtlhRow>(
        `SELECT
            r.id,
            r.tahun,
            r.kategori,
            r.created_at,
            p.id   AS penduduk_id,
            p.nik,
            p.nama,
            p.jenis_kelamin,
            p.tanggal_lahir,
            k.no_kk,
            k.alamat,
            k.rt,
            k.rw,
            k.kelurahan_id
        FROM social_rtlh_recipients r
        JOIN penduduk p ON p.id = r.penduduk_id
        JOIN keluarga k ON k.id = p.keluarga_id
        WHERE k.tenant_id = $1 ${whereExtra}
        ORDER BY r.created_at DESC, r.tahun DESC`,
        values
    );

    return result.rows;
}

/* ─── Get Single ─── */
export async function getRtlhDetail(id: string, tenantId: string) {
    const result = await pool.query<RtlhRow>(
        `SELECT
            r.id,
            r.tahun,
            r.kategori,
            r.created_at,
            p.id   AS penduduk_id,
            p.nik,
            p.nama,
            p.jenis_kelamin,
            p.tanggal_lahir,
            p.tempat_lahir,
            k.no_kk,
            k.alamat,
            k.rt,
            k.rw,
            k.kelurahan_id
        FROM social_rtlh_recipients r
        JOIN penduduk p ON p.id = r.penduduk_id
        JOIN keluarga k ON k.id = p.keluarga_id
        WHERE r.id = $1 AND k.tenant_id = $2
        LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

/* ─── Search Penduduk by NIK ─── */
export async function searchPendudukByNIK(nik: string, tenantId: string) {
    const result = await pool.query(
        `SELECT
            p.id AS penduduk_id,
            p.nik,
            p.nama,
            p.jenis_kelamin,
            p.tanggal_lahir,
            p.tempat_lahir,
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

/* ─── Create Entry (transactional) ─── */
export async function createRtlhEntry(
    tenantId: string,
    payload: {
        penduduk_id?: string | null;
        nik: string;
        nama: string;
        jenis_kelamin: string;
        tanggal_lahir?: string | null;
        tempat_lahir?: string | null;
        no_kk?: string | null;
        alamat?: string | null;
        rt?: string | null;
        rw?: string | null;
        kelurahan_id: string;
        tahun: number;
        kategori: string;
    }
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let pendudukId = payload.penduduk_id;

        if (!pendudukId) {
            // Try to find existing penduduk by NIK
            const existing = await client.query(
                `SELECT p.id FROM penduduk p JOIN keluarga k ON k.id = p.keluarga_id WHERE p.nik = $1 AND k.tenant_id = $2 LIMIT 1`,
                [payload.nik, tenantId]
            );

            if (existing.rows[0]) {
                pendudukId = existing.rows[0].id;
            } else {
                // Create keluarga first (if no_kk provided, try to find existing)
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
                            payload.no_kk || payload.nik, // fallback to NIK if no KK
                            payload.alamat,
                            payload.rt,
                            payload.rw,
                        ]
                    );
                    keluargaId = kkResult.rows[0].id;
                }

                // Create penduduk
                const pendudukResult = await client.query(
                    `INSERT INTO penduduk (keluarga_id, nik, nama, jenis_kelamin, tanggal_lahir, tempat_lahir)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id`,
                    [
                        keluargaId,
                        payload.nik,
                        payload.nama,
                        payload.jenis_kelamin,
                        payload.tanggal_lahir || null,
                        payload.tempat_lahir || null,
                    ]
                );
                pendudukId = pendudukResult.rows[0].id;
            }
        }

        // Insert social_rtlh_recipients
        const rtlhResult = await client.query(
            `INSERT INTO social_rtlh_recipients (penduduk_id, tahun, kategori)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [pendudukId, payload.tahun, payload.kategori]
        );
        const rtlhId = rtlhResult.rows[0].id;

        await client.query("COMMIT");
        return rtlhId;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/* ─── Update Entry ─── */
export async function updateRtlhEntry(
    id: string,
    tenantId: string,
    payload: {
        tahun: number;
        kategori: string;
    }
) {
    const result = await pool.query(
        `UPDATE social_rtlh_recipients r
         SET tahun = $1, kategori = $2
         FROM penduduk p, keluarga k
         WHERE r.penduduk_id = p.id
           AND p.keluarga_id = k.id
           AND r.id = $3
           AND k.tenant_id = $4
         RETURNING r.id`,
        [payload.tahun, payload.kategori, id, tenantId]
    );

    return result.rows[0] ?? null;
}

/* ─── Delete Entry ─── */
export async function deleteRtlhEntry(id: string, tenantId: string) {
    const result = await pool.query(
        `DELETE FROM social_rtlh_recipients r
         USING penduduk p, keluarga k
         WHERE r.penduduk_id = p.id
           AND p.keluarga_id = k.id
           AND r.id = $1
           AND k.tenant_id = $2
         RETURNING r.id`,
        [id, tenantId]
    );
    return result.rows[0] ?? null;
}

/* ─── Agregat untuk Halaman Publik ─── */
export async function getRtlhAggregated(tenantId: string) {
    const result = await pool.query(
        `SELECT
            k.kelurahan_id,
            r.tahun,
            r.kategori,
            COUNT(*)::int AS jumlah_penerima
        FROM social_rtlh_recipients r
        JOIN penduduk p ON p.id = r.penduduk_id
        JOIN keluarga k ON k.id = p.keluarga_id
        WHERE k.tenant_id = $1
        GROUP BY k.kelurahan_id, r.tahun, r.kategori
        ORDER BY r.tahun DESC, r.kategori ASC, k.kelurahan_id ASC`,
        [tenantId]
    );
    return result.rows;
}
