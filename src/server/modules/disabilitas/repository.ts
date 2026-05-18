import "server-only";

import { pool } from "@/db/client";

/* ─── Types ─── */
export type DisabilitasRow = {
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
    disabilitas_id: string;
    nama_disabilitas: string;
    keterangan_disabilitas: string | null;
    bantuan_list: { bantuan_id: string; nama_bantuan: string; status_penerima: boolean; keterangan: string | null }[];
    created_at: string;
};

export type MasterRow = {
    id: string;
    [key: string]: unknown;
};

/* ─── List Penyandang Disabilitas (JOIN) ─── */
export async function listDisabilitasPersons(tenantId: string, kelurahanId?: string | null) {
    const values: unknown[] = [tenantId];
    const whereExtra = kelurahanId ? (() => { values.push(kelurahanId); return `AND k.kelurahan_id = $${values.length}`; })() : "";

    const result = await pool.query<DisabilitasRow>(
        `SELECT
            pd.id,
            pd.keterangan_disabilitas,
            pd.created_at,
            p.id   AS penduduk_id,
            p.nik,
            p.nama,
            p.jenis_kelamin,
            p.tanggal_lahir,
            k.no_kk,
            k.alamat,
            k.rt,
            k.rw,
            k.kelurahan_id,
            md.id  AS disabilitas_id,
            md.nama_disabilitas,
            COALESCE(
                (SELECT json_agg(json_build_object(
                    'bantuan_id', mb2.id,
                    'nama_bantuan', mb2.nama_bantuan,
                    'status_penerima', pb2.status_penerima,
                    'keterangan', pb2.keterangan
                ))
                FROM penduduk_bantuan pb2
                JOIN master_bantuan mb2 ON mb2.id = pb2.bantuan_id
                WHERE pb2.penduduk_id = p.id),
                '[]'
            ) AS bantuan_list
        FROM penduduk_disabilitas pd
        JOIN penduduk p ON p.id = pd.penduduk_id
        JOIN keluarga k ON k.id = p.keluarga_id
        JOIN master_disabilitas md ON md.id = pd.disabilitas_id
        WHERE k.tenant_id = $1 ${whereExtra}
        ORDER BY pd.created_at DESC`,
        values
    );

    return result.rows;
}

/* ─── Get Single ─── */
export async function getDisabilitasDetail(id: string, tenantId: string) {
    const result = await pool.query<DisabilitasRow>(
        `SELECT
            pd.id,
            pd.keterangan_disabilitas,
            pd.created_at,
            p.id   AS penduduk_id,
            p.nik,
            p.nama,
            p.jenis_kelamin,
            p.tanggal_lahir,
            p.tempat_lahir,
            p.status_perkawinan,
            p.hubungan_keluarga,
            p.nama_ibu_kandung,
            k.no_kk,
            k.alamat,
            k.rt,
            k.rw,
            k.kelurahan_id,
            k.desil_nasional,
            md.id  AS disabilitas_id,
            md.nama_disabilitas,
            COALESCE(
                (SELECT json_agg(json_build_object(
                    'bantuan_id', mb2.id,
                    'nama_bantuan', mb2.nama_bantuan,
                    'status_penerima', pb2.status_penerima,
                    'keterangan', pb2.keterangan
                ))
                FROM penduduk_bantuan pb2
                JOIN master_bantuan mb2 ON mb2.id = pb2.bantuan_id
                WHERE pb2.penduduk_id = p.id),
                '[]'
            ) AS bantuan_list
        FROM penduduk_disabilitas pd
        JOIN penduduk p ON p.id = pd.penduduk_id
        JOIN keluarga k ON k.id = p.keluarga_id
        JOIN master_disabilitas md ON md.id = pd.disabilitas_id
        WHERE pd.id = $1 AND k.tenant_id = $2
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
export async function createDisabilitasEntry(
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
        disabilitas_id: string;
        keterangan_disabilitas?: string | null;
        bantuan_ids: string[];
        bantuan_keterangan?: Record<string, string>;
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

        // Insert penduduk_disabilitas
        const pdResult = await client.query(
            `INSERT INTO penduduk_disabilitas (penduduk_id, disabilitas_id, keterangan_disabilitas)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [pendudukId, payload.disabilitas_id, payload.keterangan_disabilitas || null]
        );
        const pdId = pdResult.rows[0].id;

        // Insert bantuan entries
        for (const bantuanId of payload.bantuan_ids) {
            const ket = payload.bantuan_keterangan?.[bantuanId] || null;
            await client.query(
                `INSERT INTO penduduk_bantuan (penduduk_id, bantuan_id, status_penerima, keterangan)
                 VALUES ($1, $2, true, $3)
                 ON CONFLICT (penduduk_id, bantuan_id) DO UPDATE SET status_penerima = true, keterangan = EXCLUDED.keterangan`,
                [pendudukId, bantuanId, ket]
            );
        }

        await client.query("COMMIT");
        return pdId;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/* ─── Update Entry ─── */
export async function updateDisabilitasEntry(
    id: string,
    tenantId: string,
    payload: {
        disabilitas_id: string;
        keterangan_disabilitas?: string | null;
        bantuan_ids: string[];
        bantuan_keterangan?: Record<string, string>;
    }
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Verify ownership
        const target = await client.query(
            `SELECT pd.id, p.id AS penduduk_id
             FROM penduduk_disabilitas pd
             JOIN penduduk p ON p.id = pd.penduduk_id
             JOIN keluarga k ON k.id = p.keluarga_id
             WHERE pd.id = $1 AND k.tenant_id = $2`,
            [id, tenantId]
        );
        if (!target.rows[0]) return null;

        const pendudukId = target.rows[0].penduduk_id;

        // Update penduduk_disabilitas
        await client.query(
            `UPDATE penduduk_disabilitas SET disabilitas_id = $1, keterangan_disabilitas = $2 WHERE id = $3`,
            [payload.disabilitas_id, payload.keterangan_disabilitas || null, id]
        );

        // Sync bantuan: delete all, re-insert
        await client.query(`DELETE FROM penduduk_bantuan WHERE penduduk_id = $1`, [pendudukId]);

        for (const bantuanId of payload.bantuan_ids) {
            const ket = payload.bantuan_keterangan?.[bantuanId] || null;
            await client.query(
                `INSERT INTO penduduk_bantuan (penduduk_id, bantuan_id, status_penerima, keterangan)
                 VALUES ($1, $2, true, $3)`,
                [pendudukId, bantuanId, ket]
            );
        }

        await client.query("COMMIT");
        return id;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/* ─── Delete Entry ─── */
export async function deleteDisabilitasEntry(id: string, tenantId: string) {
    const result = await pool.query(
        `DELETE FROM penduduk_disabilitas pd
         USING penduduk p, keluarga k
         WHERE pd.penduduk_id = p.id
           AND p.keluarga_id = k.id
           AND pd.id = $1
           AND k.tenant_id = $2
         RETURNING pd.id`,
        [id, tenantId]
    );
    return result.rows[0] ?? null;
}

/* ─── Master Disabilitas ─── */
export async function listMasterDisabilitas() {
    const result = await pool.query<MasterRow>(
        `SELECT id, nama_disabilitas, keterangan, created_at FROM master_disabilitas ORDER BY nama_disabilitas ASC`
    );
    return result.rows;
}

export async function createMasterDisabilitas(payload: { nama_disabilitas: string; keterangan?: string | null }) {
    const result = await pool.query<MasterRow>(
        `INSERT INTO master_disabilitas (nama_disabilitas, keterangan) VALUES ($1, $2) RETURNING id, nama_disabilitas, keterangan, created_at`,
        [payload.nama_disabilitas, payload.keterangan || null]
    );
    return result.rows[0];
}

export async function updateMasterDisabilitas(id: string, payload: { nama_disabilitas: string; keterangan?: string | null }) {
    const result = await pool.query<MasterRow>(
        `UPDATE master_disabilitas SET nama_disabilitas = $1, keterangan = $2 WHERE id = $3 RETURNING id, nama_disabilitas, keterangan, created_at`,
        [payload.nama_disabilitas, payload.keterangan || null, id]
    );
    return result.rows[0] ?? null;
}

export async function deleteMasterDisabilitas(id: string) {
    const result = await pool.query<MasterRow>(
        `DELETE FROM master_disabilitas WHERE id = $1 RETURNING id, nama_disabilitas`,
        [id]
    );
    return result.rows[0] ?? null;
}

/* ─── Master Bantuan ─── */
export async function listMasterBantuan() {
    const result = await pool.query<MasterRow>(
        `SELECT id, nama_bantuan, keterangan, created_at FROM master_bantuan ORDER BY nama_bantuan ASC`
    );
    return result.rows;
}

export async function createMasterBantuan(payload: { nama_bantuan: string; keterangan?: string | null }) {
    const result = await pool.query<MasterRow>(
        `INSERT INTO master_bantuan (nama_bantuan, keterangan) VALUES ($1, $2) RETURNING id, nama_bantuan, keterangan, created_at`,
        [payload.nama_bantuan, payload.keterangan || null]
    );
    return result.rows[0];
}

export async function updateMasterBantuan(id: string, payload: { nama_bantuan: string; keterangan?: string | null }) {
    const result = await pool.query<MasterRow>(
        `UPDATE master_bantuan SET nama_bantuan = $1, keterangan = $2 WHERE id = $3 RETURNING id, nama_bantuan, keterangan, created_at`,
        [payload.nama_bantuan, payload.keterangan || null, id]
    );
    return result.rows[0] ?? null;
}

export async function deleteMasterBantuan(id: string) {
    const result = await pool.query<MasterRow>(
        `DELETE FROM master_bantuan WHERE id = $1 RETURNING id, nama_bantuan`,
        [id]
    );
    return result.rows[0] ?? null;
}

/* ─── Agregat untuk Halaman Publik ─── */
export async function getDisabilitasAggregated(tenantId: string) {
    const result = await pool.query(
        `SELECT
            k.kelurahan_id,
            md.nama_disabilitas AS jenis_disabilitas,
            COUNT(*)::int AS jumlah,
            COUNT(*) FILTER (WHERE lower(p.jenis_kelamin) IN ('l','laki-laki'))::int AS laki_laki,
            COUNT(*) FILTER (WHERE lower(p.jenis_kelamin) IN ('p','perempuan'))::int AS perempuan,
            COUNT(DISTINCT pb.penduduk_id)::int AS penerima_bantuan
        FROM penduduk_disabilitas pd
        JOIN penduduk p ON p.id = pd.penduduk_id
        JOIN keluarga k ON k.id = p.keluarga_id
        JOIN master_disabilitas md ON md.id = pd.disabilitas_id
        LEFT JOIN penduduk_bantuan pb ON pb.penduduk_id = p.id
        WHERE k.tenant_id = $1
        GROUP BY k.kelurahan_id, md.nama_disabilitas
        ORDER BY md.nama_disabilitas, k.kelurahan_id`,
        [tenantId]
    );
    return result.rows;
}
