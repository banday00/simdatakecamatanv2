import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    listStuntingChildren,
    getChildMeasurements,
    searchPendudukByNIK,
    createStuntingEntry,
    updateStuntingMeasurement,
    deleteStuntingMeasurement,
    getStuntingMeasurement,
} from "./stunting-repository";
import { kelurahanBelongsToTenant, posyanduBelongsToTenant, listStuntingAgregat } from "./repository";
import { stuntingMeasurementSchema } from "./stunting-schemas";

/* ────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────── */

function kelurahanFilterFor(profile: Awaited<ReturnType<typeof requireAuth>>) {
    return profile.role === "admin_kelurahan" ? profile.kelurahan_id : null;
}

async function normalizeKelurahan(
    inputKelurahanId: string,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>
) {
    const kelurahanId = profile.role === "admin_kelurahan" ? profile.kelurahan_id : inputKelurahanId;
    if (!kelurahanId) {
        throw new AppError(403, "Kelurahan user tidak tersedia.", "FORBIDDEN_KELURAHAN");
    }
    requireKelurahanScope(profile, kelurahanId);
    if (!(await kelurahanBelongsToTenant(kelurahanId, tenantId))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }
    return kelurahanId;
}

/* ────────────────────────────────────────────────
   List Children (card view)
   ──────────────────────────────────────────────── */

export async function listAdminStuntingChildren(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return listStuntingChildren(tenant.id, kelurahanFilterFor(profile));
}

/* ────────────────────────────────────────────────
   Get Measurements for a child
   ──────────────────────────────────────────────── */

export async function listAdminChildMeasurements(tenantSlug: string, pendudukId: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return getChildMeasurements(pendudukId, tenant.id);
}

/* ────────────────────────────────────────────────
   Search NIK
   ──────────────────────────────────────────────── */

export async function searchStuntingNIK(tenantSlug: string, nik: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return searchPendudukByNIK(nik, tenant.id);
}

/* ────────────────────────────────────────────────
   Create Measurement
   ──────────────────────────────────────────────── */

export async function createAdminStuntingMeasurement(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "kesehatan/stunting-bnba", action: "create" });

    const parsed = stuntingMeasurementSchema.parse(await req.json());
    const kelurahanId = await normalizeKelurahan(String(parsed.kelurahan_id), tenant.id, profile);

    // Validate posyandu
    if (parsed.posyandu_id) {
        const valid = await posyanduBelongsToTenant(parsed.posyandu_id, tenant.id, kelurahanId);
        if (!valid) {
            throw new AppError(400, "Posyandu tidak valid untuk kelurahan ini.", "INVALID_POSYANDU");
        }
    }

    const result = await createStuntingEntry(tenant.id, {
        ...parsed,
        kelurahan_id: kelurahanId,
    });

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "kesehatan/stunting-bnba",
        recordTable: "health_stunting_bnba",
        recordId: result.id,
        detail: `Tambah pengukuran stunting BNBA (penduduk: ${result.penduduk_id})`,
        userAgent: req.headers.get("user-agent"),
    });

    return result;
}

/* ────────────────────────────────────────────────
   Update Measurement
   ──────────────────────────────────────────────── */

export async function updateAdminStuntingMeasurement(
    tenantSlug: string,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "kesehatan/stunting-bnba", action: "update" });

    const target = await getStuntingMeasurement(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Data pengukuran stunting tidak ditemukan.", "STUNTING_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const parsed = stuntingMeasurementSchema.parse(await req.json());
    const result = await updateStuntingMeasurement(id, tenant.id, {
        posyandu_id: parsed.posyandu_id,
        nama_ortu: parsed.nama_ortu,
        tanggal_pengukuran: parsed.tanggal_pengukuran,
        berat_badan: parsed.berat_badan,
        tinggi_badan: parsed.tinggi_badan,
        status_tbu: parsed.status_tbu,
        status_bbu: parsed.status_bbu,
        intervensi_diterima: parsed.intervensi_diterima,
    });
    if (!result) {
        throw new AppError(404, "Data pengukuran stunting tidak ditemukan.", "STUNTING_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "kesehatan/stunting-bnba",
        recordTable: "health_stunting_bnba",
        recordId: id,
        detail: `Update pengukuran stunting BNBA`,
        userAgent: req.headers.get("user-agent"),
    });

    return result;
}

/* ────────────────────────────────────────────────
   Delete Measurement
   ──────────────────────────────────────────────── */

export async function deleteAdminStuntingMeasurement(
    tenantSlug: string,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "kesehatan/stunting-bnba", action: "delete" });

    const target = await getStuntingMeasurement(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Data pengukuran stunting tidak ditemukan.", "STUNTING_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const result = await deleteStuntingMeasurement(id, tenant.id);
    if (!result) {
        throw new AppError(404, "Data pengukuran stunting tidak ditemukan.", "STUNTING_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "kesehatan/stunting-bnba",
        recordTable: "health_stunting_bnba",
        recordId: id,
        detail: `Hapus pengukuran stunting BNBA`,
        userAgent: req.headers.get("user-agent"),
    });

    return result;
}

/* ────────────────────────────────────────────────
   Aggregat (unchanged, re-export)
   ──────────────────────────────────────────────── */

export async function listAdminStuntingAgregatFromService(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return listStuntingAgregat(tenant.id, kelurahanFilterFor(profile));
}
