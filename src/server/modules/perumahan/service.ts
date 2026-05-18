import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    listRtlhPersons,
    getRtlhDetail,
    searchPendudukByNIK,
    createRtlhEntry,
    updateRtlhEntry,
    deleteRtlhEntry,
    getRtlhAggregated,
} from "./repository";
import { rtlhRegistrasiSchema } from "./schemas";

/* ────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────── */

function kelurahanFilterFor(profile: Awaited<ReturnType<typeof requireAuth>>) {
    return profile.role === "admin_kelurahan" ? profile.kelurahan_id : null;
}

async function kelurahanBelongsToTenant(kelurahanId: string, tenantId: string) {
    const { pool } = await import("@/db/client");
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM kelurahans WHERE id = $1 AND tenant_id = $2 AND is_active = true) AS exists`,
        [kelurahanId, tenantId]
    );
    return Boolean(result.rows[0]?.exists);
}

/* ────────────────────────────────────────────────
   RTLH Persons
   ──────────────────────────────────────────────── */

export async function listAdminRtlh(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return listRtlhPersons(tenant.id, kelurahanFilterFor(profile));
}

export async function createAdminRtlh(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/perumahan", action: "create" });

    const payload = rtlhRegistrasiSchema.parse(await req.json());

    // Scope check
    const kelurahanId = profile.role === "admin_kelurahan" ? profile.kelurahan_id : payload.kelurahan_id;
    if (!kelurahanId) throw new AppError(403, "Kelurahan user tidak tersedia.", "FORBIDDEN_KELURAHAN");
    requireKelurahanScope(profile, kelurahanId);
    if (!(await kelurahanBelongsToTenant(kelurahanId, tenant.id))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }

    const rtlhId = await createRtlhEntry(tenant.id, {
        ...payload,
        kelurahan_id: kelurahanId,
    });

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "sosial/perumahan",
        recordTable: "social_rtlh_recipients",
        recordId: rtlhId,
        detail: `Registrasi penerima RTLH: ${payload.nama} (NIK: ${payload.nik})`,
        userAgent: req.headers.get("user-agent"),
    });

    return rtlhId;
}

export async function updateAdminRtlh(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/perumahan", action: "update" });

    const target = await getRtlhDetail(id, tenant.id);
    if (!target) throw new AppError(404, "Data penerima RTLH tidak ditemukan.", "RTLH_NOT_FOUND");
    requireKelurahanScope(profile, target.kelurahan_id);

    const body = await req.json();
    const updatePayload = {
        tahun: Number(body.tahun),
        kategori: String(body.kategori),
    };

    const result = await updateRtlhEntry(id, tenant.id, updatePayload);
    if (!result) throw new AppError(404, "Data penerima RTLH tidak ditemukan.", "RTLH_NOT_FOUND");

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "sosial/perumahan",
        recordTable: "social_rtlh_recipients",
        recordId: id,
        detail: `Update data penerima RTLH: ${target.nama}`,
        userAgent: req.headers.get("user-agent"),
    });

    return result;
}

export async function deleteAdminRtlh(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/perumahan", action: "delete" });

    const target = await getRtlhDetail(id, tenant.id);
    if (!target) throw new AppError(404, "Data penerima RTLH tidak ditemukan.", "RTLH_NOT_FOUND");
    requireKelurahanScope(profile, target.kelurahan_id);

    const result = await deleteRtlhEntry(id, tenant.id);
    if (!result) throw new AppError(404, "Data penerima RTLH tidak ditemukan.", "RTLH_NOT_FOUND");

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "sosial/perumahan",
        recordTable: "social_rtlh_recipients",
        recordId: id,
        detail: `Hapus data penerima RTLH: ${target.nama}`,
        userAgent: req.headers.get("user-agent"),
    });

    return result;
}

export async function searchNIK(tenantSlug: string, nik: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return searchPendudukByNIK(nik, tenant.id);
}

/* ────────────────────────────────────────────────
   Public Aggregation
   ──────────────────────────────────────────────── */

export async function getPublicRtlhAggregated(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    return getRtlhAggregated(tenant.id);
}
