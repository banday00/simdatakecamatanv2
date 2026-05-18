import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    listDisabilitasPersons,
    getDisabilitasDetail,
    searchPendudukByNIK,
    createDisabilitasEntry,
    updateDisabilitasEntry,
    deleteDisabilitasEntry,
    listMasterDisabilitas,
    listMasterBantuan,
    createMasterDisabilitas,
    updateMasterDisabilitas,
    deleteMasterDisabilitas,
    createMasterBantuan,
    updateMasterBantuan,
    deleteMasterBantuan,
    getDisabilitasAggregated,
} from "./repository";
import {
    disabilitasRegistrasiSchema,
    masterDisabilitasSchema,
    masterBantuanSchema,
} from "./schemas";

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
   Disabilitas Persons
   ──────────────────────────────────────────────── */

export async function listAdminDisabilitas(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return listDisabilitasPersons(tenant.id, kelurahanFilterFor(profile));
}

export async function createAdminDisabilitas(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/disabilitas", action: "create" });

    const payload = disabilitasRegistrasiSchema.parse(await req.json());

    // Business-rule guards
    if (!payload.disabilitas_id) {
        throw new AppError(400, "Jenis disabilitas wajib dipilih.", "VALIDATION_ERROR");
    }

    // Scope check
    const kelurahanId = profile.role === "admin_kelurahan" ? profile.kelurahan_id : payload.kelurahan_id;
    if (!kelurahanId) throw new AppError(403, "Kelurahan user tidak tersedia.", "FORBIDDEN_KELURAHAN");
    requireKelurahanScope(profile, kelurahanId);
    if (!(await kelurahanBelongsToTenant(kelurahanId, tenant.id))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }

    const pdId = await createDisabilitasEntry(tenant.id, {
        ...payload,
        kelurahan_id: kelurahanId,
        disabilitas_id: payload.disabilitas_id!, // guarded above
    });

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "sosial/disabilitas",
        recordTable: "penduduk_disabilitas",
        recordId: pdId,
        detail: `Registrasi disabilitas: ${payload.nama} (NIK: ${payload.nik})`,
        userAgent: req.headers.get("user-agent"),
    });

    return pdId;
}

export async function updateAdminDisabilitas(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/disabilitas", action: "update" });

    const target = await getDisabilitasDetail(id, tenant.id);
    if (!target) throw new AppError(404, "Data disabilitas tidak ditemukan.", "DISABILITAS_NOT_FOUND");
    requireKelurahanScope(profile, target.kelurahan_id);

    const body = await req.json();
    const payload = {
        disabilitas_id: body.disabilitas_id,
        keterangan_disabilitas: body.keterangan_disabilitas ?? null,
        bantuan_ids: body.bantuan_ids ?? [],
        bantuan_keterangan: body.bantuan_keterangan ?? {},
    };

    const result = await updateDisabilitasEntry(id, tenant.id, payload);
    if (!result) throw new AppError(404, "Data disabilitas tidak ditemukan.", "DISABILITAS_NOT_FOUND");

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "sosial/disabilitas",
        recordTable: "penduduk_disabilitas",
        recordId: id,
        detail: `Update data disabilitas: ${target.nama}`,
        userAgent: req.headers.get("user-agent"),
    });

    return result;
}

export async function deleteAdminDisabilitas(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/disabilitas", action: "delete" });

    const target = await getDisabilitasDetail(id, tenant.id);
    if (!target) throw new AppError(404, "Data disabilitas tidak ditemukan.", "DISABILITAS_NOT_FOUND");
    requireKelurahanScope(profile, target.kelurahan_id);

    const result = await deleteDisabilitasEntry(id, tenant.id);
    if (!result) throw new AppError(404, "Data disabilitas tidak ditemukan.", "DISABILITAS_NOT_FOUND");

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "sosial/disabilitas",
        recordTable: "penduduk_disabilitas",
        recordId: id,
        detail: `Hapus data disabilitas: ${target.nama}`,
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

export async function getMasterData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const [masterDisabilitas, masterBantuan] = await Promise.all([
        listMasterDisabilitas(),
        listMasterBantuan(),
    ]);

    return { masterDisabilitas, masterBantuan };
}

/* ────────────────────────────────────────────────
   Master Disabilitas CRUD
   ──────────────────────────────────────────────── */

export async function listAdminMasterDisabilitas(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return listMasterDisabilitas();
}

export async function createAdminMasterDisabilitas(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/master-disabilitas", action: "create" });

    const payload = masterDisabilitasSchema.parse(await req.json());
    const row = await createMasterDisabilitas(payload);

    await logServerActivity({
        action: "create", tenantId: tenant.id, profile,
        module: "sosial/master-disabilitas", recordTable: "master_disabilitas", recordId: row.id,
        detail: `Tambah jenis disabilitas: ${payload.nama_disabilitas}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminMasterDisabilitas(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/master-disabilitas", action: "update" });

    const payload = masterDisabilitasSchema.parse(await req.json());
    const row = await updateMasterDisabilitas(id, payload);
    if (!row) throw new AppError(404, "Jenis disabilitas tidak ditemukan.", "MASTER_NOT_FOUND");

    await logServerActivity({
        action: "update", tenantId: tenant.id, profile,
        module: "sosial/master-disabilitas", recordTable: "master_disabilitas", recordId: id,
        detail: `Update jenis disabilitas: ${payload.nama_disabilitas}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminMasterDisabilitas(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/master-disabilitas", action: "delete" });

    const row = await deleteMasterDisabilitas(id);
    if (!row) throw new AppError(404, "Jenis disabilitas tidak ditemukan.", "MASTER_NOT_FOUND");

    await logServerActivity({
        action: "delete", tenantId: tenant.id, profile,
        module: "sosial/master-disabilitas", recordTable: "master_disabilitas", recordId: id,
        detail: `Hapus jenis disabilitas: ${(row as any).nama_disabilitas}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

/* ────────────────────────────────────────────────
   Master Bantuan CRUD
   ──────────────────────────────────────────────── */

export async function listAdminMasterBantuan(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    return listMasterBantuan();
}

export async function createAdminMasterBantuan(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/master-bantuan", action: "create" });

    const payload = masterBantuanSchema.parse(await req.json());
    const row = await createMasterBantuan(payload);

    await logServerActivity({
        action: "create", tenantId: tenant.id, profile,
        module: "sosial/master-bantuan", recordTable: "master_bantuan", recordId: row.id,
        detail: `Tambah jenis bantuan: ${payload.nama_bantuan}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminMasterBantuan(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/master-bantuan", action: "update" });

    const payload = masterBantuanSchema.parse(await req.json());
    const row = await updateMasterBantuan(id, payload);
    if (!row) throw new AppError(404, "Jenis bantuan tidak ditemukan.", "MASTER_NOT_FOUND");

    await logServerActivity({
        action: "update", tenantId: tenant.id, profile,
        module: "sosial/master-bantuan", recordTable: "master_bantuan", recordId: id,
        detail: `Update jenis bantuan: ${payload.nama_bantuan}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminMasterBantuan(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "sosial/master-bantuan", action: "delete" });

    const row = await deleteMasterBantuan(id);
    if (!row) throw new AppError(404, "Jenis bantuan tidak ditemukan.", "MASTER_NOT_FOUND");

    await logServerActivity({
        action: "delete", tenantId: tenant.id, profile,
        module: "sosial/master-bantuan", recordTable: "master_bantuan", recordId: id,
        detail: `Hapus jenis bantuan: ${(row as any).nama_bantuan}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

/* ────────────────────────────────────────────────
   Public Aggregation
   ──────────────────────────────────────────────── */

export async function getPublicDisabilitasAggregated(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    return getDisabilitasAggregated(tenant.id);
}
