import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    createKetentramanRow,
    deleteKetentramanRow,
    getKetentramanRow,
    kelurahanBelongsToTenant,
    ketentramanResources,
    listKetentramanRows,
    updateKetentramanRow,
} from "./repository";
import { ketentramanResourceSchemas, type KetentramanResource } from "./schemas";

const resourceLabels: Record<KetentramanResource, string> = {
    insiden: "ketentraman/insiden",
    bencana: "ketentraman/bencana",
    kader: "ketentraman/kader",
};

const resourceNotFoundMessages: Record<KetentramanResource, string> = {
    insiden: "Data insiden tidak ditemukan.",
    bencana: "Data zona bencana tidak ditemukan.",
    kader: "Data kader keamanan tidak ditemukan.",
};

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

async function parseAndNormalizePayload(
    resource: KetentramanResource,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>,
    req: NextRequest
) {
    const parsed = ketentramanResourceSchemas[resource].parse(await req.json()) as Record<string, unknown>;
    const kelurahanId = await normalizeKelurahan(String(parsed.kelurahan_id), tenantId, profile);
    return { ...parsed, kelurahan_id: kelurahanId };
}

export async function listAdminKetentramanResource(tenantSlug: string, resource: KetentramanResource) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    return listKetentramanRows(resource, tenant.id, kelurahanFilterFor(profile));
}

export async function createAdminKetentramanResource(tenantSlug: string, resource: KetentramanResource, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "create" });

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await createKetentramanRow(resource, tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: ketentramanResources[resource].table,
        recordId: row.id,
        detail: `Tambah data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminKetentramanResource(
    tenantSlug: string,
    resource: KetentramanResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "update" });

    const target = await getKetentramanRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "KETENTRAMAN_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await updateKetentramanRow(resource, id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "KETENTRAMAN_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: ketentramanResources[resource].table,
        recordId: row.id,
        detail: `Update data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminKetentramanResource(
    tenantSlug: string,
    resource: KetentramanResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "delete" });

    const target = await getKetentramanRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "KETENTRAMAN_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteKetentramanRow(resource, id, tenant.id);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "KETENTRAMAN_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: ketentramanResources[resource].table,
        recordId: row.id,
        detail: `Hapus data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}
