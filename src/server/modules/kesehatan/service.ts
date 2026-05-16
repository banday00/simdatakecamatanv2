import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    createHealthRow,
    deleteHealthRow,
    getHealthRow,
    healthResources,
    jenisFasilitasExists,
    kelurahanBelongsToTenant,
    listHealthRows,
    listJenisFasilitas,
    listStuntingAgregat,
    posyanduBelongsToTenant,
    updateHealthRow,
} from "./repository";
import { healthResourceSchemas, type HealthResource } from "./schemas";

const resourceLabels: Record<HealthResource, string> = {
    fasilitas: "kesehatan/fasilitas",
    maternal: "kesehatan/maternal",
    posyandu: "kesehatan/posyandu",
    stuntingBnba: "kesehatan/stunting-bnba",
};

const resourceNotFoundMessages: Record<HealthResource, string> = {
    fasilitas: "Fasilitas kesehatan tidak ditemukan.",
    maternal: "Data KIA tidak ditemukan.",
    posyandu: "Posyandu tidak ditemukan.",
    stuntingBnba: "Data stunting BNBA tidak ditemukan.",
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

async function validateReferences(resource: HealthResource, tenantId: string, payload: Record<string, unknown>) {
    if (resource === "fasilitas" && payload.jenis_id) {
        const exists = await jenisFasilitasExists(Number(payload.jenis_id));
        if (!exists) {
            throw new AppError(400, "Jenis fasilitas tidak valid.", "INVALID_JENIS_FASILITAS");
        }
    }

    if (resource === "stuntingBnba" && payload.posyandu_id) {
        const exists = await posyanduBelongsToTenant(
            String(payload.posyandu_id),
            tenantId,
            String(payload.kelurahan_id)
        );
        if (!exists) {
            throw new AppError(400, "Posyandu tidak valid untuk kelurahan ini.", "INVALID_POSYANDU");
        }
    }
}

async function parseAndNormalizePayload(
    resource: HealthResource,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>,
    req: NextRequest
) {
    const parsed = healthResourceSchemas[resource].parse(await req.json()) as Record<string, unknown>;
    const kelurahanId = await normalizeKelurahan(String(parsed.kelurahan_id), tenantId, profile);
    const payload = { ...parsed, kelurahan_id: kelurahanId };
    await validateReferences(resource, tenantId, payload);
    return payload;
}

export async function listAdminHealthResource(tenantSlug: string, resource: HealthResource) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const rows = await listHealthRows(resource, tenant.id, kelurahanFilterFor(profile));
    if (resource === "fasilitas") {
        return {
            rows,
            refs: {
                jenisFasilitas: await listJenisFasilitas(),
            },
        };
    }

    return rows;
}

export async function createAdminHealthResource(tenantSlug: string, resource: HealthResource, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "create" });

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await createHealthRow(resource, tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: healthResources[resource].table,
        recordId: row.id,
        detail: `Tambah data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminHealthResource(
    tenantSlug: string,
    resource: HealthResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "update" });

    const target = await getHealthRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "HEALTH_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await updateHealthRow(resource, id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "HEALTH_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: healthResources[resource].table,
        recordId: row.id,
        detail: `Update data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminHealthResource(
    tenantSlug: string,
    resource: HealthResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "delete" });

    const target = await getHealthRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "HEALTH_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteHealthRow(resource, id, tenant.id);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "HEALTH_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: healthResources[resource].table,
        recordId: row.id,
        detail: `Hapus data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function listAdminStuntingAgregat(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    return listStuntingAgregat(tenant.id, kelurahanFilterFor(profile));
}
