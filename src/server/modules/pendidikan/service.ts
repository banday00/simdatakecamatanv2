import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    createPendidikanRow,
    deletePendidikanRow,
    getPendidikanRow,
    getSiswaSummary,
    kelurahanBelongsToTenant,
    listPendidikanRows,
    pendidikanResources,
    updatePendidikanRow,
} from "./repository";
import { pendidikanResourceSchemas, siswaSummaryQuerySchema, type PendidikanResource } from "./schemas";

const resourceLabels: Record<PendidikanResource, string> = {
    sarana: "pendidikan/sarana",
    partisipasi: "pendidikan/partisipasi",
};

const resourceNotFoundMessages: Record<PendidikanResource, string> = {
    sarana: "Sarana pendidikan tidak ditemukan.",
    partisipasi: "Data partisipasi pendidikan tidak ditemukan.",
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
    resource: PendidikanResource,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>,
    req: NextRequest
) {
    const parsed = pendidikanResourceSchemas[resource].parse(await req.json()) as Record<string, unknown>;
    const kelurahanId = await normalizeKelurahan(String(parsed.kelurahan_id), tenantId, profile);
    return { ...parsed, kelurahan_id: kelurahanId };
}

export async function listAdminPendidikanResource(tenantSlug: string, resource: PendidikanResource) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    return listPendidikanRows(resource, tenant.id, kelurahanFilterFor(profile));
}

export async function createAdminPendidikanResource(tenantSlug: string, resource: PendidikanResource, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "create" });

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await createPendidikanRow(resource, tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: pendidikanResources[resource].table,
        recordId: row.id,
        detail: `Tambah data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminPendidikanResource(
    tenantSlug: string,
    resource: PendidikanResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "update" });

    const target = await getPendidikanRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "PENDIDIKAN_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await updatePendidikanRow(resource, id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "PENDIDIKAN_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: pendidikanResources[resource].table,
        recordId: row.id,
        detail: `Update data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminPendidikanResource(
    tenantSlug: string,
    resource: PendidikanResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "delete" });

    const target = await getPendidikanRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "PENDIDIKAN_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deletePendidikanRow(resource, id, tenant.id);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "PENDIDIKAN_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: pendidikanResources[resource].table,
        recordId: row.id,
        detail: `Hapus data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function getAdminSiswaSummary(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const query = siswaSummaryQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const kelurahanId = await normalizeKelurahan(query.kelurahan_id, tenant.id, profile);
    return getSiswaSummary(tenant.id, kelurahanId, query.tahun, query.semester);
}
