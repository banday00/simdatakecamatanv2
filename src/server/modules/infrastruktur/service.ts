import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    createInfrastrukturRow,
    deleteInfrastrukturRow,
    getInfrastrukturRow,
    infrastrukturResources,
    kelurahanBelongsToTenant,
    listInfrastrukturRows,
    listRefJenisSaranaOlahraga,
    refJenisSaranaOlahragaExists,
    updateInfrastrukturRow,
} from "./repository";
import { infrastrukturResourceSchemas, type InfrastrukturResource } from "./schemas";

const resourceLabels: Record<InfrastrukturResource, string> = {
    pembangunan: "infrastruktur/pembangunan",
    sanitasi: "infrastruktur/sanitasi",
    olahraga: "infrastruktur/olahraga",
};

const resourceNotFoundMessages: Record<InfrastrukturResource, string> = {
    pembangunan: "Data pembangunan tidak ditemukan.",
    sanitasi: "Data sanitasi tidak ditemukan.",
    olahraga: "Data sarana olahraga tidak ditemukan.",
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
    resource: InfrastrukturResource,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>,
    req: NextRequest
) {
    const parsed = infrastrukturResourceSchemas[resource].parse(await req.json()) as Record<string, unknown>;
    const kelurahanId = await normalizeKelurahan(String(parsed.kelurahan_id), tenantId, profile);

    if (resource === "olahraga") {
        const jenisId = Number(parsed.jenis_id);
        if (!(await refJenisSaranaOlahragaExists(jenisId))) {
            throw new AppError(400, "Jenis sarana olahraga tidak valid.", "INVALID_JENIS_OLAHRAGA");
        }
    }

    return { ...parsed, kelurahan_id: kelurahanId };
}

export async function listAdminInfrastrukturResource(tenantSlug: string, resource: InfrastrukturResource) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const rows = await listInfrastrukturRows(resource, tenant.id, kelurahanFilterFor(profile));
    if (resource === "olahraga") {
        return {
            rows,
            refs: {
                jenisOlahraga: await listRefJenisSaranaOlahraga(),
            },
        };
    }

    return rows;
}

export async function createAdminInfrastrukturResource(
    tenantSlug: string,
    resource: InfrastrukturResource,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "create" });

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await createInfrastrukturRow(resource, tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: infrastrukturResources[resource].table,
        recordId: row.id,
        detail: `Tambah data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminInfrastrukturResource(
    tenantSlug: string,
    resource: InfrastrukturResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "update" });

    const target = await getInfrastrukturRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "INFRASTRUKTUR_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await updateInfrastrukturRow(resource, id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "INFRASTRUKTUR_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: infrastrukturResources[resource].table,
        recordId: row.id,
        detail: `Update data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminInfrastrukturResource(
    tenantSlug: string,
    resource: InfrastrukturResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "delete" });

    const target = await getInfrastrukturRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "INFRASTRUKTUR_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteInfrastrukturRow(resource, id, tenant.id);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "INFRASTRUKTUR_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: infrastrukturResources[resource].table,
        recordId: row.id,
        detail: `Hapus data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}
