import "server-only";

import { pool } from "@/db/client";
import { requireAuth } from "@/server/auth/guards";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";

/* ═══════════════════════════════════════════
   Guard
   ═══════════════════════════════════════════ */

const ALLOWED_ROLES = ["super_admin", "admin_kecamatan", "executive_dashboard"] as const;

async function guardExecutive(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();

    if (profile.role !== "super_admin" && profile.tenant_id !== tenant.id) {
        throw new AppError(403, "Forbidden tenant", "FORBIDDEN_TENANT");
    }

    return { tenant, profile };
}

/* ═══════════════════════════════════════════
   Main Data Fetcher
   ═══════════════════════════════════════════ */

export async function getExecutiveDashboardData(
    tenantSlug: string,
    opts: { kelurahanId?: string | null; tahun?: number | null } = {}
) {
    const { tenant, profile } = await guardExecutive(tenantSlug);
    const tenantId = tenant.id;

    // Auto-detect perspective: if user has kelurahan_id, scope to it
    const kelurahanId = opts.kelurahanId || profile.kelurahan_id || null;

    // Parallel fetch all sections
    const [
        statCards,
        piramida,
        stuntingPerKel,
        sanitasiPerKel,
        bansosDistribusi,
        rtlhPerKel,
        dtsenStats,
        putusSekolahPerKel,
        scoreboard,
        kelurahanList,
        periodeList,
    ] = await Promise.all([
        fetchStatCards(tenantId, kelurahanId, opts.tahun),
        fetchPiramidaPenduduk(tenantId, kelurahanId),
        fetchStuntingPerKelurahan(tenantId, kelurahanId),
        fetchSanitasiPerKelurahan(tenantId, kelurahanId, opts.tahun),
        fetchBansosDistribusi(tenantId, kelurahanId, opts.tahun),
        fetchRtlhPerKelurahan(tenantId, kelurahanId),
        fetchDtsenStats(tenantId, kelurahanId),
        fetchPutusSekolahPerKelurahan(tenantId, kelurahanId, opts.tahun),
        fetchScoreboard(tenantId),
        fetchKelurahanList(tenantId),
        fetchPeriodeList(),
    ]);

    return {
        tenant_nama: tenant.nama,
        perspective: kelurahanId ? "kelurahan" : "kecamatan",
        kelurahan_id: kelurahanId,
        stat_cards: statCards,
        piramida_penduduk: piramida,
        stunting_per_kelurahan: stuntingPerKel,
        sanitasi_per_kelurahan: sanitasiPerKel,
        bansos_distribusi: bansosDistribusi,
        rtlh_per_kelurahan: rtlhPerKel,
        dtsen: dtsenStats,
        putus_sekolah_per_kelurahan: putusSekolahPerKel,
        scoreboard,
        kelurahans: kelurahanList,
        periodes: periodeList,
    };
}

/* ═══════════════════════════════════════════
   1. Stat Cards (8 KPIs)
   ═══════════════════════════════════════════ */

async function fetchStatCards(tenantId: string, kelurahanId: string | null, tahun?: number | null) {
    const kelFilter = kelurahanId ? "AND kelurahan_id = $2" : "";
    const params: unknown[] = [tenantId];
    if (kelurahanId) params.push(kelurahanId);

    // 1. Penduduk & KK
    const popQ = await pool.query(
        `WITH latest AS (SELECT MAX(periode_id) AS id FROM gov_fact_populasi_summary WHERE tenant_id = $1 ${kelFilter})
         SELECT COALESCE(SUM(jml_penduduk_total),0)::int AS total_penduduk,
                COALESCE(SUM(jml_kk_total),0)::int AS total_kk,
                COALESCE(SUM(jml_penduduk_lk),0)::int AS penduduk_lk,
                COALESCE(SUM(jml_penduduk_pr),0)::int AS penduduk_pr
         FROM gov_fact_populasi_summary
         WHERE tenant_id = $1 ${kelFilter} AND periode_id = (SELECT id FROM latest)`,
        params
    );

    // 2. Stunting prevalence
    const stuntQ = await pool.query(
        `SELECT COALESCE(SUM(balita_total),0)::int AS balita_total,
                COALESCE(SUM(balita_stunting),0)::int AS balita_stunting
         FROM health_stunting_agregat_view
         WHERE tenant_id = $1 ${kelFilter}`,
        params
    );

    // 3. Sanitasi avg
    const sanQ = await pool.query(
        `SELECT COALESCE(AVG(akses_sanitasi_persen),0)::numeric(5,1) AS avg_sanitasi,
                COALESCE(AVG(akses_air_bersih_persen),0)::numeric(5,1) AS avg_air_bersih
         FROM (SELECT DISTINCT ON (kelurahan_id) kelurahan_id, akses_sanitasi_persen, akses_air_bersih_persen
               FROM infra_sanitation WHERE tenant_id = $1 ${kelFilter}
               ORDER BY kelurahan_id, tahun DESC, created_at DESC) latest`,
        params
    );

    // 4. Bansos
    const yearFilter = tahun ? (kelurahanId ? "AND tahun = $3" : "AND tahun = $2") : "";
    const bansosParams = [...params];
    if (tahun) bansosParams.push(tahun);

    const bansosQ = await pool.query(
        `SELECT COALESCE(SUM(jumlah_penerima),0)::int AS total_penerima,
                COALESCE(SUM(total_anggaran),0)::bigint AS total_anggaran
         FROM social_assistance WHERE tenant_id = $1 ${kelFilter} ${yearFilter}`,
        bansosParams
    );

    // 5. Disabilitas
    const disQ = await pool.query(
        `SELECT COUNT(*)::int AS total_disabilitas
         FROM penduduk_disabilitas pd
         JOIN penduduk p ON p.id = pd.penduduk_id
         JOIN keluarga k ON k.id = p.keluarga_id
         WHERE k.tenant_id = $1 ${kelurahanId ? "AND k.kelurahan_id = $2" : ""}`,
        params
    );

    // 6. Putus sekolah
    const putusQ = await pool.query(
        `SELECT COALESCE(SUM(angka_putus_sekolah),0)::int AS total_putus_sekolah
         FROM (SELECT DISTINCT ON (kelurahan_id, jenjang) kelurahan_id, angka_putus_sekolah
               FROM edu_participation WHERE tenant_id = $1 ${kelFilter}
               ORDER BY kelurahan_id, jenjang, tahun DESC, semester DESC) latest`,
        params
    );

    // 7. DTSEN - warga miskin desil 1-2
    const kelNames = await getKelurahanNames(tenantId, kelurahanId);
    let dtsenMiskin = 0;
    let dtsenTotal = 0;
    if (kelNames.length > 0) {
        const dtsenQ = await pool.query(
            `SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE desil_nasional <= 2)::int AS miskin
             FROM dtsen WHERE LOWER(nama_kelurahan) = ANY($1::text[])`,
            [kelNames.map(n => n.toLowerCase())]
        );
        dtsenTotal = dtsenQ.rows[0]?.total ?? 0;
        dtsenMiskin = dtsenQ.rows[0]?.miskin ?? 0;
    }

    const pop = popQ.rows[0] ?? { total_penduduk: 0, total_kk: 0, penduduk_lk: 0, penduduk_pr: 0 };
    const stunt = stuntQ.rows[0] ?? { balita_total: 0, balita_stunting: 0 };
    const san = sanQ.rows[0] ?? { avg_sanitasi: 0, avg_air_bersih: 0 };
    const bansos = bansosQ.rows[0] ?? { total_penerima: 0, total_anggaran: 0 };

    return {
        total_penduduk: pop.total_penduduk,
        total_kk: pop.total_kk,
        penduduk_lk: pop.penduduk_lk,
        penduduk_pr: pop.penduduk_pr,
        prevalensi_stunting: stunt.balita_total > 0
            ? Math.round((stunt.balita_stunting / stunt.balita_total) * 1000) / 10
            : 0,
        balita_stunting: stunt.balita_stunting,
        balita_total: stunt.balita_total,
        avg_sanitasi: Number(san.avg_sanitasi),
        avg_air_bersih: Number(san.avg_air_bersih),
        total_penerima_bansos: bansos.total_penerima,
        total_anggaran_bansos: Number(bansos.total_anggaran),
        total_disabilitas: disQ.rows[0]?.total_disabilitas ?? 0,
        total_putus_sekolah: putusQ.rows[0]?.total_putus_sekolah ?? 0,
        dtsen_miskin: dtsenMiskin,
        dtsen_total: dtsenTotal,
    };
}

/* ═══════════════════════════════════════════
   2. Piramida Penduduk
   ═══════════════════════════════════════════ */

async function fetchPiramidaPenduduk(tenantId: string, kelurahanId: string | null) {
    const kelFilter = kelurahanId ? "AND f.kelurahan_id = $2" : "";
    const params: unknown[] = [tenantId];
    if (kelurahanId) params.push(kelurahanId);

    const result = await pool.query(
        `WITH latest AS (SELECT MAX(periode_id) AS id FROM gov_fact_populasi_kelompok_umur WHERE tenant_id = $1 ${kelFilter})
         SELECT r.rentang_umur AS label,
                COALESCE(SUM(f.jml_lk),0)::int AS lk,
                COALESCE(SUM(f.jml_pr),0)::int AS pr
         FROM gov_fact_populasi_kelompok_umur f
         JOIN ref_kelompok_umur r ON r.id = f.kelompok_umur_id
         WHERE f.tenant_id = $1 ${kelFilter} AND f.periode_id = (SELECT id FROM latest)
         GROUP BY r.id, r.rentang_umur
         ORDER BY r.id ASC`,
        params
    );
    return result.rows;
}

/* ═══════════════════════════════════════════
   3. Stunting per Kelurahan
   ═══════════════════════════════════════════ */

async function fetchStuntingPerKelurahan(tenantId: string, kelurahanId: string | null) {
    const kelFilter = kelurahanId ? "AND s.kelurahan_id = $2" : "";
    const params: unknown[] = [tenantId];
    if (kelurahanId) params.push(kelurahanId);

    const result = await pool.query(
        `SELECT k.nama AS kelurahan,
                COALESCE(SUM(s.balita_total),0)::int AS balita_total,
                COALESCE(SUM(s.balita_stunting),0)::int AS balita_stunting,
                COALESCE(SUM(s.balita_gizi_buruk),0)::int AS gizi_buruk,
                COALESCE(SUM(s.balita_gizi_kurang),0)::int AS gizi_kurang,
                CASE WHEN SUM(s.balita_total) > 0
                     THEN ROUND(SUM(s.balita_stunting)::numeric / SUM(s.balita_total) * 100, 1)
                     ELSE 0 END AS prevalensi
         FROM health_stunting_agregat_view s
         JOIN kelurahans k ON k.id = s.kelurahan_id
         WHERE s.tenant_id = $1 ${kelFilter}
         GROUP BY k.id, k.nama
         ORDER BY prevalensi DESC`,
        params
    );
    return result.rows;
}

/* ═══════════════════════════════════════════
   4. Sanitasi per Kelurahan
   ═══════════════════════════════════════════ */

async function fetchSanitasiPerKelurahan(tenantId: string, kelurahanId: string | null, tahun?: number | null) {
    const kelFilter = kelurahanId ? "AND kelurahan_id = $2" : "";
    const params: unknown[] = [tenantId];
    if (kelurahanId) params.push(kelurahanId);

    const result = await pool.query(
        `SELECT k.nama AS kelurahan,
                s.akses_air_bersih_persen::numeric(5,1) AS air_bersih,
                s.akses_sanitasi_persen::numeric(5,1) AS sanitasi,
                s.rumah_kumuh::int AS rumah_kumuh,
                s.tahun
         FROM (SELECT DISTINCT ON (kelurahan_id) *
               FROM infra_sanitation WHERE tenant_id = $1 ${kelFilter}
               ORDER BY kelurahan_id, tahun DESC, created_at DESC) s
         JOIN kelurahans k ON k.id = s.kelurahan_id
         ORDER BY k.nama ASC`,
        params
    );
    return result.rows.map(r => ({
        ...r,
        air_bersih: Number(r.air_bersih),
        sanitasi: Number(r.sanitasi),
    }));
}

/* ═══════════════════════════════════════════
   5. Bansos Distribusi
   ═══════════════════════════════════════════ */

async function fetchBansosDistribusi(tenantId: string, kelurahanId: string | null, tahun?: number | null) {
    const kelFilter = kelurahanId ? "AND kelurahan_id = $2" : "";
    const params: unknown[] = [tenantId];
    if (kelurahanId) params.push(kelurahanId);

    const yearFilter = tahun
        ? (kelurahanId ? "AND tahun = $3" : "AND tahun = $2")
        : "";
    if (tahun) params.push(tahun);

    const result = await pool.query(
        `SELECT jenis_bantuan,
                COALESCE(SUM(jumlah_penerima),0)::int AS penerima,
                COALESCE(SUM(total_anggaran),0)::bigint AS anggaran,
                COALESCE(AVG(pct_tersalurkan),0)::numeric(5,1) AS pct_tersalur
         FROM social_assistance
         WHERE tenant_id = $1 ${kelFilter} ${yearFilter}
         GROUP BY jenis_bantuan
         ORDER BY penerima DESC`,
        params
    );
    return result.rows.map(r => ({
        ...r,
        anggaran: Number(r.anggaran),
        pct_tersalur: Number(r.pct_tersalur),
    }));
}

/* ═══════════════════════════════════════════
   6. RTLH per Kelurahan
   ═══════════════════════════════════════════ */

async function fetchRtlhPerKelurahan(tenantId: string, kelurahanId: string | null) {
    const kelFilter = kelurahanId ? "AND k.kelurahan_id = $2" : "";
    const params: unknown[] = [tenantId];
    if (kelurahanId) params.push(kelurahanId);

    const result = await pool.query(
        `SELECT kl.nama AS kelurahan, COUNT(*)::int AS jumlah_rtlh
         FROM social_rtlh_recipients r
         JOIN penduduk p ON p.id = r.penduduk_id
         JOIN keluarga k ON k.id = p.keluarga_id
         JOIN kelurahans kl ON kl.id = k.kelurahan_id
         WHERE k.tenant_id = $1 ${kelFilter}
         GROUP BY kl.id, kl.nama
         ORDER BY jumlah_rtlh DESC`,
        params
    );
    return result.rows;
}

/* ═══════════════════════════════════════════
   7. DTSEN Stats
   ═══════════════════════════════════════════ */

async function fetchDtsenStats(tenantId: string, kelurahanId: string | null) {
    const kelNames = await getKelurahanNames(tenantId, kelurahanId);
    if (kelNames.length === 0) {
        return { distribusi_desil: [], pbi_jk: 0, bansos_pkh: 0, bansos_sembako: 0, total: 0, per_kelurahan: [] };
    }

    const lowerNames = kelNames.map(n => n.toLowerCase());

    const [desilQ, summaryQ, perKelQ] = await Promise.all([
        pool.query(
            `SELECT desil_nasional AS desil, COUNT(*)::int AS jumlah
             FROM dtsen WHERE LOWER(nama_kelurahan) = ANY($1::text[])
             GROUP BY desil_nasional ORDER BY desil_nasional`,
            [lowerNames]
        ),
        pool.query(
            `SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE UPPER(pbi_jk) = 'YA')::int AS pbi_jk,
                    COUNT(*) FILTER (WHERE UPPER(bansos_pkh) = 'YA')::int AS bansos_pkh,
                    COUNT(*) FILTER (WHERE UPPER(bansos_sembako) = 'YA')::int AS bansos_sembako
             FROM dtsen WHERE LOWER(nama_kelurahan) = ANY($1::text[])`,
            [lowerNames]
        ),
        pool.query(
            `SELECT nama_kelurahan AS kelurahan,
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE desil_nasional <= 2)::int AS miskin
             FROM dtsen WHERE LOWER(nama_kelurahan) = ANY($1::text[])
             GROUP BY nama_kelurahan ORDER BY miskin DESC`,
            [lowerNames]
        ),
    ]);

    const summary = summaryQ.rows[0] ?? { total: 0, pbi_jk: 0, bansos_pkh: 0, bansos_sembako: 0 };

    return {
        distribusi_desil: desilQ.rows,
        pbi_jk: summary.pbi_jk,
        bansos_pkh: summary.bansos_pkh,
        bansos_sembako: summary.bansos_sembako,
        total: summary.total,
        per_kelurahan: perKelQ.rows,
    };
}

/* ═══════════════════════════════════════════
   8. Putus Sekolah per Kelurahan
   ═══════════════════════════════════════════ */

async function fetchPutusSekolahPerKelurahan(tenantId: string, kelurahanId: string | null, tahun?: number | null) {
    const kelFilter = kelurahanId ? "AND e.kelurahan_id = $2" : "";
    const params: unknown[] = [tenantId];
    if (kelurahanId) params.push(kelurahanId);

    const result = await pool.query(
        `SELECT k.nama AS kelurahan,
                COALESCE(SUM(e.angka_putus_sekolah),0)::int AS putus_sekolah,
                COALESCE(AVG(e.angka_melek_huruf),0)::numeric(5,1) AS melek_huruf
         FROM (SELECT DISTINCT ON (kelurahan_id, jenjang) *
               FROM edu_participation WHERE tenant_id = $1 ${kelFilter}
               ORDER BY kelurahan_id, jenjang, tahun DESC, semester DESC) e
         JOIN kelurahans k ON k.id = e.kelurahan_id
         GROUP BY k.id, k.nama
         ORDER BY putus_sekolah DESC`,
        params
    );
    return result.rows.map(r => ({ ...r, melek_huruf: Number(r.melek_huruf) }));
}

/* ═══════════════════════════════════════════
   9. Scoreboard Kelurahan
   ═══════════════════════════════════════════ */

async function fetchScoreboard(tenantId: string) {
    // Get all kelurahans for this tenant
    const kelResult = await pool.query<{ id: string; nama: string }>(
        `SELECT id, nama FROM kelurahans WHERE tenant_id = $1 AND is_active = true ORDER BY nama`,
        [tenantId]
    );

    const rows: { kelurahan: string; penduduk: number; stunting_pct: number; sanitasi: number; air_bersih: number; rtlh: number; putus_sekolah: number }[] = [];
    for (const kel of kelResult.rows) {
        const q = await pool.query(
            `SELECT
                (SELECT COALESCE(SUM(jml_penduduk_total),0)::int
                 FROM gov_fact_populasi_summary
                 WHERE tenant_id = $1 AND kelurahan_id = $2
                   AND periode_id = (SELECT MAX(periode_id) FROM gov_fact_populasi_summary WHERE tenant_id = $1 AND kelurahan_id = $2)
                ) AS penduduk,
                (SELECT CASE WHEN SUM(balita_total) > 0
                    THEN ROUND(SUM(balita_stunting)::numeric / SUM(balita_total) * 100, 1)
                    ELSE 0 END
                 FROM health_stunting_agregat_view WHERE tenant_id = $1 AND kelurahan_id = $2
                ) AS stunting_pct,
                (SELECT COALESCE(akses_sanitasi_persen, 0)::numeric(5,1)
                 FROM infra_sanitation WHERE tenant_id = $1 AND kelurahan_id = $2
                 ORDER BY tahun DESC, created_at DESC LIMIT 1
                ) AS sanitasi,
                (SELECT COALESCE(akses_air_bersih_persen, 0)::numeric(5,1)
                 FROM infra_sanitation WHERE tenant_id = $1 AND kelurahan_id = $2
                 ORDER BY tahun DESC, created_at DESC LIMIT 1
                ) AS air_bersih,
                (SELECT COUNT(*)::int
                 FROM social_rtlh_recipients r JOIN penduduk p ON p.id = r.penduduk_id JOIN keluarga k ON k.id = p.keluarga_id
                 WHERE k.tenant_id = $1 AND k.kelurahan_id = $2
                ) AS rtlh,
                (SELECT COALESCE(SUM(angka_putus_sekolah),0)::int
                 FROM (SELECT DISTINCT ON (jenjang) angka_putus_sekolah
                       FROM edu_participation WHERE tenant_id = $1 AND kelurahan_id = $2
                       ORDER BY jenjang, tahun DESC, semester DESC) x
                ) AS putus_sekolah`,
            [tenantId, kel.id]
        );

        const r = q.rows[0] ?? {};
        rows.push({
            kelurahan: kel.nama,
            penduduk: r.penduduk ?? 0,
            stunting_pct: Number(r.stunting_pct ?? 0),
            sanitasi: Number(r.sanitasi ?? 0),
            air_bersih: Number(r.air_bersih ?? 0),
            rtlh: r.rtlh ?? 0,
            putus_sekolah: r.putus_sekolah ?? 0,
        });
    }

    return rows;
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

async function getKelurahanNames(tenantId: string, kelurahanId: string | null): Promise<string[]> {
    const params: unknown[] = [tenantId];
    const kelFilter = kelurahanId ? "AND id = $2" : "";
    if (kelurahanId) params.push(kelurahanId);

    const result = await pool.query<{ nama: string }>(
        `SELECT nama FROM kelurahans WHERE tenant_id = $1 AND is_active = true ${kelFilter}`,
        params
    );
    return result.rows.map(r => r.nama);
}

async function fetchKelurahanList(tenantId: string) {
    const result = await pool.query<{ id: string; nama: string }>(
        `SELECT id, nama FROM kelurahans WHERE tenant_id = $1 AND is_active = true ORDER BY nama`,
        [tenantId]
    );
    return result.rows;
}

async function fetchPeriodeList() {
    const result = await pool.query<{ id: number; tahun: number; semester: number }>(
        `SELECT id, tahun, semester FROM gov_ref_periode ORDER BY tahun DESC, semester DESC`
    );
    return result.rows;
}
