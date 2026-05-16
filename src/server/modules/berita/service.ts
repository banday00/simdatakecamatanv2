import "server-only";

import type { NextRequest } from "next/server";
import { requireAuth, canManageAdminData } from "@/server/auth/guards";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { logServerActivity } from "@/server/activity/log";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    beritaListQuerySchema,
    beritaPayloadSchema,
    beritaPatchSchema,
    normalizeBeritaSlug,
} from "./schemas";
import {
    createBerita,
    deleteBerita,
    getPublishedBeritaBySlug,
    listAdminBerita,
    listPublishedBerita,
    listRelatedPublishedBerita,
    updateBerita,
} from "./repository";

export async function listPublicBerita(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const query = beritaListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const rows = await listPublishedBerita(tenant.id, query);

    return {
        rows,
        pagination: {
            page: query.page,
            pageSize: query.pageSize,
            hasMore: rows.length === query.pageSize,
        },
    };
}

export async function getPublicBeritaDetail(tenantSlug: string, slug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const article = await getPublishedBeritaBySlug(tenant.id, slug);
    if (!article) {
        throw new AppError(404, "Artikel tidak ditemukan.", "NEWS_NOT_FOUND");
    }

    const related = await listRelatedPublishedBerita(tenant.id, article.id);
    return { article, related };
}

export async function listAdminBeritaForTenant(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return listAdminBerita(tenant.id);
}

export async function createAdminBerita(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "berita", action: "create" });

    const payload = beritaPayloadSchema.parse(await req.json());
    const slug = normalizeBeritaSlug(payload);
    if (!slug) {
        throw new AppError(400, "Slug tidak valid.", "INVALID_SLUG");
    }

    const row = await createBerita(tenant.id, profile.id, { ...payload, slug });
    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "berita",
        recordTable: "news_articles",
        recordId: row.id,
        detail: `Tambah berita: ${row.judul}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminBerita(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "berita", action: "update" });

    const payload = beritaPatchSchema.parse(await req.json());
    const normalized = payload.slug || payload.judul ? { ...payload, slug: normalizeBeritaSlug(payload) } : payload;
    const row = await updateBerita(id, tenant.id, normalized);
    if (!row) {
        throw new AppError(404, "Berita tidak ditemukan.", "NEWS_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "berita",
        recordTable: "news_articles",
        recordId: row.id,
        detail: `Update berita: ${row.judul}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminBerita(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "berita", action: "delete" });

    const row = await deleteBerita(id, tenant.id);
    if (!row) {
        throw new AppError(404, "Berita tidak ditemukan.", "NEWS_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "berita",
        recordTable: "news_articles",
        recordId: row.id,
        detail: `Hapus berita: ${row.judul}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}
