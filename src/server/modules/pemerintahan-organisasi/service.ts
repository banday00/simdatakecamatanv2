import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import { organisasiPayloadSchema, type OrganisasiPayload } from "./schemas";
import {
    createOrganisasi,
    deleteOrganisasi,
    getOrganisasiById,
    kelurahanBelongsToTenant,
    listOrganisasiByTenant,
    updateOrganisasi,
} from "./repository";

async function normalizePayload(
    input: OrganisasiPayload,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>
) {
    const kelurahanId = profile.role === "admin_kelurahan" ? profile.kelurahan_id : input.kelurahan_id;
    if (profile.role === "admin_kelurahan" && !kelurahanId) {
        throw new AppError(403, "Kelurahan user tidak tersedia.", "FORBIDDEN_KELURAHAN");
    }

    requireKelurahanScope(profile, kelurahanId);

    if (kelurahanId && !(await kelurahanBelongsToTenant(kelurahanId, tenantId))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }

    return { ...input, kelurahan_id: kelurahanId ?? null };
}

export async function listAdminOrganisasi(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const kelurahanFilter = profile.role === "admin_kelurahan" ? profile.kelurahan_id : null;
    return listOrganisasiByTenant(tenant.id, kelurahanFilter);
}

export async function createAdminOrganisasi(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/organisasi", action: "create" });

    const payload = await normalizePayload(organisasiPayloadSchema.parse(await req.json()), tenant.id, profile);
    const row = await createOrganisasi(tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/organisasi",
        recordTable: "gov_organisasi",
        recordId: row.id,
        detail: `Tambah pejabat ${row.nama_pejabat}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminOrganisasi(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/organisasi", action: "update" });

    const target = await getOrganisasiById(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Data pejabat tidak ditemukan.", "ORGANISASI_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = await normalizePayload(organisasiPayloadSchema.parse(await req.json()), tenant.id, profile);
    const row = await updateOrganisasi(id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, "Data pejabat tidak ditemukan.", "ORGANISASI_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/organisasi",
        recordTable: "gov_organisasi",
        recordId: row.id,
        detail: `Update pejabat ${row.nama_pejabat}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminOrganisasi(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/organisasi", action: "delete" });

    const target = await getOrganisasiById(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Data pejabat tidak ditemukan.", "ORGANISASI_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteOrganisasi(id, tenant.id);
    if (!row) {
        throw new AppError(404, "Data pejabat tidak ditemukan.", "ORGANISASI_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/organisasi",
        recordTable: "gov_organisasi",
        recordId: row.id,
        detail: `Hapus pejabat ${row.nama_pejabat}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}
