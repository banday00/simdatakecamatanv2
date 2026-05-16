import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { logServerActivity } from "@/server/activity/log";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import { lembagaPayloadSchema, type LembagaPayload } from "./schemas";
import {
    createLembaga,
    deleteLembaga,
    getLembagaById,
    kelurahanBelongsToTenant,
    listLembagaByTenant,
    updateLembaga,
} from "./repository";

async function normalizePayload(
    input: LembagaPayload,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>
) {
    const kelurahanId = profile.role === "admin_kelurahan" ? profile.kelurahan_id : input.kelurahan_id;
    if (!kelurahanId) {
        throw new AppError(403, "Kelurahan user tidak tersedia.", "FORBIDDEN_KELURAHAN");
    }

    requireKelurahanScope(profile, kelurahanId);

    if (!(await kelurahanBelongsToTenant(kelurahanId, tenantId))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }

    return { ...input, kelurahan_id: kelurahanId };
}

export async function listAdminLembaga(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const kelurahanFilter = profile.role === "admin_kelurahan" ? profile.kelurahan_id : null;
    return listLembagaByTenant(tenant.id, kelurahanFilter);
}

export async function createAdminLembaga(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/lembaga", action: "create" });

    const payload = await normalizePayload(lembagaPayloadSchema.parse(await req.json()), tenant.id, profile);
    const row = await createLembaga(tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/lembaga",
        recordTable: "gov_institutions",
        recordId: row.id,
        detail: `Tambah lembaga ${row.nama}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminLembaga(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/lembaga", action: "update" });

    const target = await getLembagaById(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Data lembaga tidak ditemukan.", "LEMBAGA_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = await normalizePayload(lembagaPayloadSchema.parse(await req.json()), tenant.id, profile);
    const row = await updateLembaga(id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, "Data lembaga tidak ditemukan.", "LEMBAGA_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/lembaga",
        recordTable: "gov_institutions",
        recordId: row.id,
        detail: `Update lembaga ${row.nama}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminLembaga(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/lembaga", action: "delete" });

    const target = await getLembagaById(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Data lembaga tidak ditemukan.", "LEMBAGA_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteLembaga(id, tenant.id);
    if (!row) {
        throw new AppError(404, "Data lembaga tidak ditemukan.", "LEMBAGA_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/lembaga",
        recordTable: "gov_institutions",
        recordId: row.id,
        detail: `Hapus lembaga ${row.nama}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}
