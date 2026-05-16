import "server-only";

import { pool } from "@/db/client";
import type { BeritaListQuery, BeritaPatch, BeritaPayload } from "./schemas";

export type BeritaRow = {
    id: string;
    tenant_id: string;
    judul: string;
    slug: string;
    konten: string | null;
    ringkasan: string | null;
    gambar: string | null;
    kategori: string | null;
    tags: string[] | null;
    status: "draft" | "published" | "archived";
    author_id: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
};

const NEWS_COLUMNS = `
    id, tenant_id, judul, slug, konten, ringkasan, gambar, kategori, tags,
    status, author_id, published_at, created_at, updated_at
`;

export async function listPublishedBerita(tenantId: string, query: BeritaListQuery) {
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1", "status = 'published'"];

    if (query.q) {
        values.push(`%${query.q}%`);
        where.push(`judul ILIKE $${values.length}`);
    }

    if (query.category && query.category !== "all") {
        values.push(query.category);
        where.push(`kategori = $${values.length}`);
    }

    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);

    const result = await pool.query<BeritaRow>(
        `SELECT ${NEWS_COLUMNS}
         FROM news_articles
         WHERE ${where.join(" AND ")}
         ORDER BY published_at DESC NULLS LAST, created_at DESC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values
    );

    return result.rows;
}

export async function getPublishedBeritaBySlug(tenantId: string, slug: string) {
    const result = await pool.query<BeritaRow>(
        `SELECT ${NEWS_COLUMNS}
         FROM news_articles
         WHERE tenant_id = $1 AND slug = $2 AND status = 'published'
         LIMIT 1`,
        [tenantId, slug]
    );

    return result.rows[0] ?? null;
}

export async function listRelatedPublishedBerita(tenantId: string, excludeId: string, limit = 4) {
    const result = await pool.query<BeritaRow>(
        `SELECT ${NEWS_COLUMNS}
         FROM news_articles
         WHERE tenant_id = $1 AND status = 'published' AND id <> $2
         ORDER BY published_at DESC NULLS LAST, created_at DESC
         LIMIT $3`,
        [tenantId, excludeId, limit]
    );

    return result.rows;
}

export async function listAdminBerita(tenantId: string) {
    const result = await pool.query<BeritaRow>(
        `SELECT ${NEWS_COLUMNS}
         FROM news_articles
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [tenantId]
    );

    return result.rows;
}

export async function createBerita(tenantId: string, authorId: string, payload: BeritaPayload & { slug: string }) {
    const result = await pool.query<BeritaRow>(
        `INSERT INTO news_articles (
            tenant_id, judul, slug, konten, ringkasan, gambar, kategori, tags,
            status, author_id, published_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $9 = 'published' THEN now() ELSE NULL END)
         RETURNING ${NEWS_COLUMNS}`,
        [
            tenantId,
            payload.judul,
            payload.slug,
            payload.konten,
            payload.ringkasan,
            payload.gambar,
            payload.kategori,
            payload.tags ?? null,
            payload.status,
            authorId,
        ]
    );

    return result.rows[0];
}

export async function updateBerita(id: string, tenantId: string, payload: BeritaPatch & { slug?: string }) {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(payload)) {
        if (!["judul", "slug", "konten", "ringkasan", "gambar", "kategori", "tags", "status"].includes(key)) continue;
        values.push(value);
        fields.push(`${key} = $${values.length}`);
    }

    if (!fields.length) return null;

    values.push(id, tenantId);
    const result = await pool.query<BeritaRow>(
        `UPDATE news_articles
         SET ${fields.join(", ")},
             published_at = CASE
                WHEN status = 'published' AND published_at IS NULL THEN now()
                WHEN status <> 'published' THEN NULL
                ELSE published_at
             END,
             updated_at = now()
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${NEWS_COLUMNS}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteBerita(id: string, tenantId: string) {
    const result = await pool.query<BeritaRow>(
        `DELETE FROM news_articles
         WHERE id = $1 AND tenant_id = $2
         RETURNING ${NEWS_COLUMNS}`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

