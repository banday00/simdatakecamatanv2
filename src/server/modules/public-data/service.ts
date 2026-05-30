import "server-only";

import type { QueryResultRow } from "pg";
import { pool } from "@/db/client";
import { getTenantBySlug } from "@/server/db/tenant";

async function rows<T extends QueryResultRow = Record<string, unknown>>(sql: string, values: unknown[] = []) {
    const result = await pool.query<T>(sql, values);
    return result.rows;
}

async function one<T extends QueryResultRow = Record<string, unknown>>(sql: string, values: unknown[] = []) {
    const result = await pool.query<T>(sql, values);
    return result.rows[0] ?? null;
}

export async function getPublicKesehatanData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [facilities, stunting, posyandu, maternal, odfSummary, odfKelurahan] = await Promise.all([
        rows(
            `SELECT hf.*, COALESCE(rjfk.nama, 'Lainnya') AS jenis_nama
             FROM health_facilities hf
             LEFT JOIN ref_jenis_fasilitas_kesehatan rjfk ON rjfk.id = hf.jenis_id
             WHERE hf.tenant_id = $1
             ORDER BY hf.created_at DESC, hf.nama ASC`,
            [tenant.id]
        ),
        rows(
            `SELECT *
             FROM health_stunting_agregat_view
             WHERE tenant_id = $1
             ORDER BY tahun DESC, bulan DESC`,
            [tenant.id]
        ),
        rows(
            `SELECT *
             FROM health_posyandu
             WHERE tenant_id = $1
             ORDER BY created_at DESC, nama ASC`,
            [tenant.id]
        ),
        rows(
            `SELECT *
             FROM health_maternal
             WHERE tenant_id = $1
             ORDER BY created_at DESC, tahun DESC`,
            [tenant.id]
        ),
        // ODF data from rasajaga — no tenant_id filter
        rows(
            `SELECT * FROM odfsummary_rasajaga ORDER BY id DESC LIMIT 1`
        ),
        rows(
            `SELECT * FROM odfsummary_rasajaga_kelurahan ORDER BY village_name ASC`
        ),
    ]);

    return { facilities, stunting, posyandu, maternal, odfSummary, odfKelurahan };
}

export async function getPublicKelurahans(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    return rows(
        `SELECT *
         FROM kelurahans
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY nama ASC`,
        [tenant.id]
    );
}

export async function getPublicPendidikanData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [facilities, participation] = await Promise.all([
        rows(
            `SELECT *
             FROM edu_facilities
             WHERE tenant_id = $1
             ORDER BY created_at DESC, nama ASC`,
            [tenant.id]
        ),
        rows(
            `SELECT *
             FROM edu_participation
             WHERE tenant_id = $1
             ORDER BY created_at DESC, tahun DESC`,
            [tenant.id]
        ),
    ]);

    return { facilities, participation };
}

export async function getPublicEkonomiData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [sectors, facilities, potentials] = await Promise.all([
        rows(
            `SELECT ebs.*, COALESCE(rlu.nama, 'Lainnya') AS sektor
             FROM econ_business_sectors ebs
             LEFT JOIN ref_lapangan_usaha rlu ON rlu.id = ebs.sektor_id
             WHERE ebs.tenant_id = $1
             ORDER BY ebs.created_at DESC, ebs.tahun DESC`,
            [tenant.id]
        ),
        rows(
            `SELECT ef.*, COALESCE(res.nama, '-') AS jenis_nama
             FROM econ_facilities ef
             LEFT JOIN ref_ekonomi_sarana res ON res.id = ef.jenis_id
             WHERE ef.tenant_id = $1
             ORDER BY ef.created_at DESC, ef.nama ASC`,
            [tenant.id]
        ),
        rows(
            `SELECT ep.*, COALESCE(rlu.nama, '-') AS jenis_usaha
             FROM econ_potential ep
             LEFT JOIN ref_lapangan_usaha rlu ON rlu.id = ep.jenis_usaha_id
             WHERE ep.tenant_id = $1
             ORDER BY ep.created_at DESC, ep.nama_usaha ASC`,
            [tenant.id]
        ),
    ]);

    return { sectors, facilities, potentials };
}

export async function getPublicInfrastrukturData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [sanitation, development, sports] = await Promise.all([
        rows(
            `SELECT *
             FROM infra_sanitation
             WHERE tenant_id = $1
             ORDER BY created_at DESC, tahun DESC`,
            [tenant.id]
        ),
        rows(
            `SELECT
                ppb.id::text,
                ppb.tenant_id,
                ppb.kelurahan_id,
                ppb.kode_paket,
                ppb.nama_paket,
                ppb.ket_paket,
                ppb.tahun_paket AS tahun,
                ppb.nama_kecamatan,
                COALESCE(k.nama, ppb.nama_kelurahan, '-') AS nama_kelurahan,
                COALESCE(ppb.total_progress, 0)::int AS total_progress,
                ppb.status_paket,
                COALESCE(ppb.is_verify, 0)::int AS is_verify,
                ppb.created_at,
                ppb.updated_at,
                COALESCE(detail.detail_count, 0)::int AS detail_count,
                detail.jenis_pekerjaan,
                detail.volume_summary,
                detail.lokasi_summary,
                detail.rt_rw_summary,
                detail.tgl_mulai,
                detail.tgl_selesai,
                detail.durasi_kontrak_hari,
                detail.sisa_hari,
                detail.nama_kontraktor,
                NULLIF(REPLACE(COALESCE(detail.progress_status_label, ''), ' PPK', ''), '') AS progress_status_label,
                detail.detail_avg_progress
             FROM paket_pekerjaan_berjalan ppb
             LEFT JOIN kelurahans k ON k.id = ppb.kelurahan_id AND k.tenant_id = ppb.tenant_id
             LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::int AS detail_count,
                    STRING_AGG(DISTINCT NULLIF(d.jenis_pekerjaan, ''), ', ') AS jenis_pekerjaan,
                    STRING_AGG(
                        DISTINCT NULLIF(
                            CONCAT_WS(' ', NULLIF(d.volume_nilai::text, ''), NULLIF(d.volume_satuan, '')),
                            ''
                        ),
                        ', '
                    ) AS volume_summary,
                    STRING_AGG(DISTINCT NULLIF(d.lokasi_keterangan, ''), '; ') AS lokasi_summary,
                    STRING_AGG(
                        DISTINCT NULLIF(
                            CONCAT_WS(
                                ' ',
                                NULLIF(CONCAT('RT ', NULLIF(NULLIF(BTRIM(d.rt), ''), '-')), 'RT '),
                                NULLIF(CONCAT('RW ', NULLIF(NULLIF(BTRIM(d.rw), ''), '-')), 'RW ')
                            ),
                            ''
                        ),
                        ', '
                    ) AS rt_rw_summary,
                    MIN(d.tgl_mulai) AS tgl_mulai,
                    MAX(d.tgl_selesai) AS tgl_selesai,
                    MAX(d.durasi_kontrak_hari)::int AS durasi_kontrak_hari,
                    MIN(d.sisa_hari)::int AS sisa_hari,
                    STRING_AGG(DISTINCT NULLIF(d.nama_kontraktor, ''), ', ') AS nama_kontraktor,
                    MAX(d.progress_status_label) AS progress_status_label,
                    ROUND(AVG(d.progress_persen))::int AS detail_avg_progress
                FROM paket_pekerjaan_detail d
                WHERE d.kode_paket = ppb.kode_paket
                  AND (d.tahun_paket = ppb.tahun_paket OR d.tahun_paket IS NULL OR ppb.tahun_paket IS NULL)
             ) detail ON true
             WHERE ppb.tenant_id = $1
             ORDER BY ppb.tahun_paket DESC NULLS LAST, ppb.updated_at DESC NULLS LAST, ppb.created_at DESC NULLS LAST, ppb.nama_paket ASC`,
            [tenant.id]
        ),
        rows(
            `SELECT ios.*, COALESCE(rjso.nama, '-') AS jenis_nama
             FROM infra_sports ios
             LEFT JOIN ref_jenis_sarana_olahraga rjso ON rjso.id = ios.jenis_id
             WHERE ios.tenant_id = $1
             ORDER BY ios.created_at DESC, ios.nama ASC`,
            [tenant.id]
        ),
    ]);

    return { sanitation, development, sports };
}

export async function getPublicSosialData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [assistance, disability, housing, religious] = await Promise.all([
        rows(`SELECT * FROM social_assistance WHERE tenant_id = $1 ORDER BY created_at DESC, tahun DESC`, [tenant.id]),
        rows(`SELECT
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
        ORDER BY md.nama_disabilitas, k.kelurahan_id`, [tenant.id]),
        rows(
            `SELECT k.kelurahan_id, r.tahun, r.kategori, COUNT(*)::int AS jumlah_penerima
             FROM social_rtlh_recipients r
             JOIN penduduk p ON p.id = r.penduduk_id
             JOIN keluarga k ON k.id = p.keluarga_id
             WHERE k.tenant_id = $1
             GROUP BY k.kelurahan_id, r.tahun, r.kategori
             ORDER BY r.tahun DESC, r.kategori ASC, k.kelurahan_id ASC`,
            [tenant.id]
        ),
        rows(`SELECT * FROM social_religious WHERE tenant_id = $1 ORDER BY created_at DESC, nama ASC`, [tenant.id]),
    ]);

    return { assistance, disability, housing, religious };
}

export async function getPublicKetentramanData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [incidents, disasters, cadres] = await Promise.all([
        rows(`SELECT * FROM security_incidents WHERE tenant_id = $1 ORDER BY created_at DESC, tanggal DESC`, [tenant.id]),
        rows(`SELECT * FROM security_disaster_zones WHERE tenant_id = $1 ORDER BY created_at DESC, tahun_data DESC`, [tenant.id]),
        rows(`SELECT * FROM security_cadres WHERE tenant_id = $1 ORDER BY created_at DESC, tahun DESC`, [tenant.id]),
    ]);

    return { incidents, disasters, cadres };
}

export async function getPublicPemerintahanData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [
        periodes, summary,
        agama, refAgama,
        goldar, refGoldar,
        pendidikan, refPendidikan,
        pekerjaan, refPekerjaan,
        statusKawin, refStatusKawin,
        kelompokUmur, refKelompokUmur,
        umurTunggal,
        dokumenKtp, dokumenKia, dokumenAkta,
        lembaga, profiles, organisasi,
    ] = await Promise.all([
        rows(`SELECT id, tahun, semester, keterangan FROM gov_ref_periode ORDER BY tahun, semester`),
        rows(`SELECT id, kelurahan_id, periode_id, jml_penduduk_lk, jml_penduduk_pr, jml_penduduk_total, jml_kk_lk, jml_kk_pr, jml_kk_total FROM gov_fact_populasi_summary WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, kelurahan_id, periode_id, agama_id AS dim_id, jml_lk, jml_pr, total FROM gov_fact_populasi_agama WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, nama_agama AS nama FROM ref_agama ORDER BY id`),
        rows(`SELECT id, kelurahan_id, periode_id, goldar_id AS dim_id, jml_lk, jml_pr, total FROM gov_fact_populasi_golongan_darah WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, nama_goldar AS nama FROM ref_golongan_darah ORDER BY id`),
        rows(`SELECT id, kelurahan_id, periode_id, pendidikan_id AS dim_id, jml_lk, jml_pr, total FROM gov_fact_populasi_pendidikan WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, jenjang_pendidikan AS nama FROM ref_pendidikan ORDER BY id`),
        rows(`SELECT id, kelurahan_id, periode_id, pekerjaan_id AS dim_id, jml_lk, jml_pr, total FROM gov_fact_populasi_pekerjaan WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, jenis_pekerjaan AS nama FROM ref_pekerjaan ORDER BY id`),
        rows(`SELECT id, kelurahan_id, periode_id, status_kawin_id AS dim_id, jml_lk, jml_pr, total FROM gov_fact_populasi_status_kawin WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, status AS nama FROM ref_status_kawin ORDER BY id`),
        rows(`SELECT id, kelurahan_id, periode_id, kelompok_umur_id, jml_lk, jml_pr, total FROM gov_fact_populasi_kelompok_umur WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, rentang_umur FROM ref_kelompok_umur ORDER BY id`),
        rows(`SELECT id, kelurahan_id, periode_id, umur, jml_lk, jml_pr, total FROM gov_fact_populasi_umur_tunggal WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, kelurahan_id, periode_id, wajib_ktp_lk, wajib_ktp_pr, wajib_ktp_total, punya_ktp_lk, punya_ktp_pr, punya_ktp_total FROM gov_fact_dokumen_ktp WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, kelurahan_id, periode_id, wajib_kia_lk, wajib_kia_pr, wajib_kia_total, punya_kia_lk, punya_kia_pr, punya_kia_total FROM gov_fact_dokumen_kia WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT id, kelurahan_id, periode_id, penduduk_0_18_lk, penduduk_0_18_pr, penduduk_0_18_total, punya_akta_lk, punya_akta_pr, punya_akta_total FROM gov_fact_dokumen_akta_lahir WHERE tenant_id = $1`, [tenant.id]),
        rows(`SELECT * FROM gov_institutions WHERE tenant_id = $1 ORDER BY jenis, nama`, [tenant.id]),
        rows(`SELECT * FROM gov_profiles WHERE tenant_id = $1 ORDER BY tahun DESC`, [tenant.id]),
        rows(`SELECT * FROM gov_organisasi WHERE tenant_id = $1 AND is_active = true ORDER BY urutan, id`, [tenant.id]),
    ]);

    return {
        kData: {
            periodes, summary,
            agama, refAgama,
            goldar, refGoldar,
            pendidikan, refPendidikan,
            pekerjaan, refPekerjaan,
            statusKawin, refStatusKawin,
            kelompokUmur, refKelompokUmur,
            umurTunggal,
            dokumenKtp, dokumenKia, dokumenAkta,
        },
        lembaga,
        profiles,
        organisasi,
    };
}

export async function getPublicHomeData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [
        counts,
        populationRows,
        latestStuntingPeriod,
        news,
        latestPopPeriod,
    ] = await Promise.all([
        one<{
            health_count: number;
            edu_count: number;
            umkm_count: number;
            posyandu_count: number;
            ibadah_count: number;
            olahraga_count: number;
            proyek_count: number;
        }>(
            `SELECT
                (SELECT COUNT(*)::int FROM health_facilities WHERE tenant_id = $1) AS health_count,
                (SELECT COUNT(*)::int FROM edu_facilities WHERE tenant_id = $1) AS edu_count,
                (SELECT COUNT(*)::int FROM econ_potential WHERE tenant_id = $1 AND status = 'aktif') AS umkm_count,
                (SELECT COUNT(*)::int FROM health_posyandu WHERE tenant_id = $1) AS posyandu_count,
                (SELECT COUNT(*)::int FROM social_religious WHERE tenant_id = $1) AS ibadah_count,
                (SELECT COUNT(*)::int FROM infra_sports WHERE tenant_id = $1) AS olahraga_count,
                (SELECT COUNT(*)::int FROM paket_pekerjaan_berjalan WHERE tenant_id = $1 AND status_paket = 'SEDANG_DIPROSES') AS proyek_count`,
            [tenant.id]
        ),
        rows<{
            kelurahan_id: string;
            jml_penduduk_lk: number;
            jml_penduduk_pr: number;
        }>(
            `SELECT DISTINCT ON (kelurahan_id)
                    kelurahan_id, jml_penduduk_lk, jml_penduduk_pr
             FROM gov_fact_populasi_summary
             WHERE tenant_id = $1
             ORDER BY kelurahan_id, periode_id DESC`,
            [tenant.id]
        ),
        one<{ tahun: number; bulan: number }>(
            `SELECT tahun, bulan
             FROM health_stunting_agregat_view
             WHERE tenant_id = $1
             ORDER BY tahun DESC, bulan DESC
             LIMIT 1`,
            [tenant.id]
        ),
        rows(
            `SELECT id, judul, slug, ringkasan, gambar, published_at, kategori
             FROM news_articles
             WHERE tenant_id = $1 AND status = 'published'
             ORDER BY published_at DESC
             LIMIT 3`,
            [tenant.id]
        ),
        one<{ tahun: number; semester: number }>(
            `SELECT p.tahun, p.semester
             FROM gov_ref_periode p
             WHERE p.id = (
                 SELECT periode_id FROM gov_fact_populasi_summary
                 WHERE tenant_id = $1
                 ORDER BY periode_id DESC
                 LIMIT 1
             )`,
            [tenant.id]
        ),
    ]);

    let stuntingTotal = 0;
    let stuntingPct = 0;
    if (latestStuntingPeriod) {
        const stuntingRows = await rows<{ balita_total: number; balita_stunting: number }>(
            `SELECT balita_total, balita_stunting
             FROM health_stunting_agregat_view
             WHERE tenant_id = $1 AND tahun = $2 AND bulan = $3`,
            [tenant.id, latestStuntingPeriod.tahun, latestStuntingPeriod.bulan]
        );
        const totalBalita = stuntingRows.reduce((sum, row) => sum + (Number(row.balita_total) || 0), 0);
        stuntingTotal = stuntingRows.reduce((sum, row) => sum + (Number(row.balita_stunting) || 0), 0);
        const rawPct = totalBalita > 0 ? Math.round((stuntingTotal / totalBalita) * 1000) / 10 : 0;
        stuntingPct = rawPct < 95 ? rawPct : 0;
    }

    const stats = {
        penduduk: populationRows.reduce((sum, row) => sum + (row.jml_penduduk_lk || 0) + (row.jml_penduduk_pr || 0), 0),
        fasilitas_kesehatan: counts?.health_count ?? 0,
        sarana_pendidikan: counts?.edu_count ?? 0,
        umkm: counts?.umkm_count ?? 0,
        stunting_pct: stuntingPct,
        stunting_kasus: stuntingTotal,
        posyandu: counts?.posyandu_count ?? 0,
        tempat_ibadah: counts?.ibadah_count ?? 0,
        sarana_olahraga: counts?.olahraga_count ?? 0,
        proyek_berjalan: counts?.proyek_count ?? 0,
    };

    const populationPeriod = latestPopPeriod
        ? { tahun: latestPopPeriod.tahun, semester: latestPopPeriod.semester }
        : null;

    return { stats, populationRows, news, populationPeriod };
}
