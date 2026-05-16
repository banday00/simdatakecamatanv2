import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    createEkonomiRow,
    deleteEkonomiRow,
    ekonomiResources,
    getEkonomiRow,
    kelurahanBelongsToTenant,
    listEkonomiRows,
    listRefEkonomiSarana,
    listRefLapanganUsaha,
    refEkonomiSaranaExists,
    refLapanganUsahaExists,
    updateEkonomiRow,
} from "./repository";
import { ekonomiResourceSchemas, type EkonomiResource } from "./schemas";

const resourceLabels: Record<EkonomiResource, string> = {
    sarana: "ekonomi/sarana",
    potensi: "ekonomi/potensi",
    sektorUsaha: "ekonomi/sektor-usaha",
};

const resourceNotFoundMessages: Record<EkonomiResource, string> = {
    sarana: "Sarana ekonomi tidak ditemukan.",
    potensi: "Data potensi usaha tidak ditemukan.",
    sektorUsaha: "Data sektor usaha tidak ditemukan.",
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

async function validateReferences(resource: EkonomiResource, payload: Record<string, unknown>) {
    if (resource === "sarana") {
        const exists = await refEkonomiSaranaExists(Number(payload.jenis_id));
        if (!exists) {
            throw new AppError(400, "Jenis sarana ekonomi tidak valid.", "INVALID_JENIS_SARANA");
        }
    }

    if (resource === "potensi") {
        const exists = await refLapanganUsahaExists(Number(payload.jenis_usaha_id));
        if (!exists) {
            throw new AppError(400, "Bidang usaha tidak valid.", "INVALID_JENIS_USAHA");
        }
    }

    if (resource === "sektorUsaha") {
        const exists = await refLapanganUsahaExists(Number(payload.sektor_id));
        if (!exists) {
            throw new AppError(400, "Sektor usaha tidak valid.", "INVALID_SEKTOR_USAHA");
        }
    }
}

async function parseAndNormalizePayload(
    resource: EkonomiResource,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>,
    req: NextRequest
) {
    const parsed = ekonomiResourceSchemas[resource].parse(await req.json()) as Record<string, unknown>;
    const kelurahanId = await normalizeKelurahan(String(parsed.kelurahan_id), tenantId, profile);
    const payload = { ...parsed, kelurahan_id: kelurahanId };
    await validateReferences(resource, payload);
    return payload;
}

export async function listAdminEkonomiResource(tenantSlug: string, resource: EkonomiResource) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const rows = await listEkonomiRows(resource, tenant.id, kelurahanFilterFor(profile));
    if (resource === "sarana") {
        return {
            rows,
            refs: {
                jenisSarana: await listRefEkonomiSarana(),
            },
        };
    }

    if (resource === "potensi" || resource === "sektorUsaha") {
        return {
            rows,
            refs: {
                lapanganUsaha: await listRefLapanganUsaha(),
            },
        };
    }

    return rows;
}

export async function createAdminEkonomiResource(tenantSlug: string, resource: EkonomiResource, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "create" });

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await createEkonomiRow(resource, tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: ekonomiResources[resource].table,
        recordId: row.id,
        detail: `Tambah data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminEkonomiResource(
    tenantSlug: string,
    resource: EkonomiResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "update" });

    const target = await getEkonomiRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "EKONOMI_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = await parseAndNormalizePayload(resource, tenant.id, profile, req);
    const row = await updateEkonomiRow(resource, id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "EKONOMI_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: ekonomiResources[resource].table,
        recordId: row.id,
        detail: `Update data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminEkonomiResource(
    tenantSlug: string,
    resource: EkonomiResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: resourceLabels[resource], action: "delete" });

    const target = await getEkonomiRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, resourceNotFoundMessages[resource], "EKONOMI_ROW_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteEkonomiRow(resource, id, tenant.id);
    if (!row) {
        throw new AppError(404, resourceNotFoundMessages[resource], "EKONOMI_ROW_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: resourceLabels[resource],
        recordTable: ekonomiResources[resource].table,
        recordId: row.id,
        detail: `Hapus data ${resourceLabels[resource]}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}
