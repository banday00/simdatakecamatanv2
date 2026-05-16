import "server-only";

import { z } from "zod";
import { pool } from "@/db/client";
import { canManageAdminData, requireAuth } from "@/server/auth/guards";
import { getTenantBySlug } from "@/server/db/tenant";

export async function getAdminDashboardData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const result = await pool.query<{
        total_penduduk: number;
        total_lembaga: number;
        total_fasilitas: number;
        total_berita: number;
    }>(
        `WITH latest_period AS (
            SELECT MAX(periode_id) AS id
            FROM gov_fact_populasi_summary
            WHERE tenant_id = $1
         )
         SELECT
            COALESCE((
                SELECT SUM(jml_penduduk_total)::int
                FROM gov_fact_populasi_summary
                WHERE tenant_id = $1 AND periode_id = (SELECT id FROM latest_period)
            ), 0) AS total_penduduk,
            (SELECT COUNT(*)::int FROM gov_institutions WHERE tenant_id = $1) AS total_lembaga,
            (SELECT COUNT(*)::int FROM health_facilities WHERE tenant_id = $1) AS total_fasilitas,
            (SELECT COUNT(*)::int FROM news_articles WHERE tenant_id = $1) AS total_berita`,
        [tenant.id]
    );

    return result.rows[0] ?? {
        total_penduduk: 0,
        total_lembaga: 0,
        total_fasilitas: 0,
        total_berita: 0,
    };
}

const activityLogQuerySchema = z.object({
    page: z.coerce.number().int().min(0).default(0),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    action: z.enum(["login", "logout", "create", "update", "delete"]).optional(),
    search: z.string().trim().max(120).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const trendIndicatorConfigs = {
    penduduk: { table: "gov_fact_populasi_summary", yearCol: "periode_id" },
    kk: { table: "gov_fact_populasi_summary", yearCol: "periode_id" },
    stunting: { table: "health_stunting", yearCol: "tahun" },
    balita: { table: "health_stunting", yearCol: "tahun" },
    prevalensi: { table: "health_stunting", yearCol: "tahun" },
    sanitasi: { table: "infra_sanitation", yearCol: "tahun" },
    air_bersih: { table: "infra_sanitation", yearCol: "tahun" },
    rtlh: { table: "social_rtlh", yearCol: "tahun" },
    bantuan: { table: "social_assistance", yearCol: "tahun" },
} as const;

const trendQuerySchema = z.object({
    indicator: z.enum([
        "penduduk",
        "kk",
        "stunting",
        "balita",
        "prevalensi",
        "sanitasi",
        "air_bersih",
        "rtlh",
        "bantuan",
    ]),
});

const comparisonIndicatorConfigs = {
    penduduk: {
        column: "jml_penduduk_total",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, jml_penduduk_total AS value
              FROM gov_fact_populasi_summary
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, periode_id DESC`,
    },
    kk: {
        column: "jml_kk_total",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, jml_kk_total AS value
              FROM gov_fact_populasi_summary
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, periode_id DESC`,
    },
    laki: {
        column: "jml_penduduk_lk",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, jml_penduduk_lk AS value
              FROM gov_fact_populasi_summary
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, periode_id DESC`,
    },
    perempuan: {
        column: "jml_penduduk_pr",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, jml_penduduk_pr AS value
              FROM gov_fact_populasi_summary
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, periode_id DESC`,
    },
    stunting: {
        column: "balita_stunting",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, balita_stunting AS value
              FROM health_stunting
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, tahun DESC, bulan DESC NULLS LAST`,
    },
    balita: {
        column: "balita_total",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, balita_total AS value
              FROM health_stunting
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, tahun DESC, bulan DESC NULLS LAST`,
    },
    sanitasi: {
        column: "akses_sanitasi_persen",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, akses_sanitasi_persen AS value
              FROM infra_sanitation
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, tahun DESC, created_at DESC`,
    },
    air_bersih: {
        column: "akses_air_bersih_persen",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, akses_air_bersih_persen AS value
              FROM infra_sanitation
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, tahun DESC, created_at DESC`,
    },
    rtlh: {
        column: "jumlah_rtlh",
        sql: `SELECT DISTINCT ON (kelurahan_id) kelurahan_id, jumlah_rtlh AS value
              FROM social_rtlh
              WHERE tenant_id = $1 AND kelurahan_id = ANY($2::uuid[])
              ORDER BY kelurahan_id, tahun DESC, created_at DESC`,
    },
} as const;

const comparisonIndicatorSchema = z.enum([
    "penduduk",
    "kk",
    "laki",
    "perempuan",
    "stunting",
    "balita",
    "sanitasi",
    "air_bersih",
    "rtlh",
]);

const comparisonQuerySchema = z.object({
    indicators: z
        .string()
        .min(1)
        .transform((value) => value.split(",").filter(Boolean))
        .pipe(z.array(comparisonIndicatorSchema).min(1).max(9)),
    kelurahanIds: z
        .string()
        .min(1)
        .transform((value) => value.split(",").filter(Boolean))
        .pipe(z.array(z.uuid()).min(1).max(6)),
});

export async function listAdminActivityLogs(tenantSlug: string, rawQuery: Record<string, string | undefined>) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const query = activityLogQuerySchema.parse(rawQuery);
    const values: unknown[] = [tenant.id];
    const where = ["tenant_id = $1"];

    if (query.action) {
        values.push(query.action);
        where.push(`action = $${values.length}`);
    }

    if (query.dateFrom) {
        values.push(`${query.dateFrom}T00:00:00`);
        where.push(`created_at >= $${values.length}`);
    }

    if (query.dateTo) {
        values.push(`${query.dateTo}T23:59:59`);
        where.push(`created_at <= $${values.length}`);
    }

    if (query.search) {
        values.push(`%${query.search}%`);
        where.push(`(
            user_name ILIKE $${values.length}
            OR user_email ILIKE $${values.length}
            OR detail ILIKE $${values.length}
            OR module ILIKE $${values.length}
        )`);
    }

    const whereSql = where.join(" AND ");
    const countResult = await pool.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total
         FROM activity_logs
         WHERE ${whereSql}`,
        values
    );

    const rowsResult = await pool.query(
        `SELECT id, tenant_id, user_id, user_email, user_name, action, module,
                record_table, record_id, detail, ip_address::text AS ip_address,
                user_agent, created_at
         FROM activity_logs
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT $${values.length + 1}
         OFFSET $${values.length + 2}`,
        [...values, query.pageSize, query.page * query.pageSize]
    );

    const statsResult = await pool.query<{
        total: number;
        login: number;
        crud: number;
        unique_users: number;
    }>(
        `SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE action = 'login')::int AS login,
            COUNT(*) FILTER (WHERE action IN ('create', 'update', 'delete'))::int AS crud,
            COUNT(DISTINCT user_id)::int AS unique_users
         FROM activity_logs
         WHERE tenant_id = $1`,
        [tenant.id]
    );

    return {
        rows: rowsResult.rows,
        totalCount: countResult.rows[0]?.total ?? 0,
        stats: statsResult.rows[0] ?? { total: 0, login: 0, crud: 0, unique_users: 0 },
    };
}

export async function getAdminTrendData(tenantSlug: string, rawQuery: Record<string, string | undefined>) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const query = trendQuerySchema.parse(rawQuery);
    const config = trendIndicatorConfigs[query.indicator];

    const [rowsResult, periodesResult] = await Promise.all([
        pool.query(
            `SELECT *
             FROM ${config.table}
             WHERE tenant_id = $1`,
            [tenant.id]
        ),
        config.yearCol === "periode_id"
            ? pool.query<{ id: number; tahun: number }>(
                `SELECT id, tahun
                 FROM gov_ref_periode`
            )
            : Promise.resolve({ rows: [] as { id: number; tahun: number }[] }),
    ]);

    const periodeMap = Object.fromEntries(
        periodesResult.rows.map((periode) => [periode.id, periode.tahun])
    );

    return {
        rows: rowsResult.rows,
        periodeMap,
    };
}

export async function getAdminComparisonData(tenantSlug: string, rawQuery: Record<string, string | undefined>) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const query = comparisonQuerySchema.parse(rawQuery);

    const kelurahansResult = await pool.query<{ id: string; nama: string }>(
        `SELECT id, nama
         FROM kelurahans
         WHERE tenant_id = $1 AND is_active = true AND id = ANY($2::uuid[])
         ORDER BY nama ASC`,
        [tenant.id, query.kelurahanIds]
    );

    const allowedKelurahanIds = new Set(kelurahansResult.rows.map((row) => row.id));
    const data = query.kelurahanIds
        .filter((id) => allowedKelurahanIds.has(id))
        .map((id) => {
            const kelurahan = kelurahansResult.rows.find((row) => row.id === id);
            return {
                kelurahan_id: id,
                kelurahan_nama: kelurahan?.nama ?? "-",
            } as Record<string, unknown>;
        });

    const dataByKelurahan = new Map(data.map((row) => [String(row.kelurahan_id), row]));

    await Promise.all(query.indicators.map(async (indicator) => {
        const config = comparisonIndicatorConfigs[indicator];
        const result = await pool.query<{ kelurahan_id: string; value: number | string | null }>(
            config.sql,
            [tenant.id, query.kelurahanIds]
        );

        for (const row of result.rows) {
            const target = dataByKelurahan.get(row.kelurahan_id);
            if (target) {
                target[indicator] = Number(row.value) || 0;
            }
        }
    }));

    for (const row of data) {
        for (const indicator of query.indicators) {
            if (row[indicator] == null) row[indicator] = 0;
        }
    }

    return { rows: data };
}
