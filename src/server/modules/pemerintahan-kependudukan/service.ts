import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { logServerActivity } from "@/server/activity/log";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    kependudukanResourceSchemas,
    type KependudukanPayload,
    type KependudukanResource,
} from "./schemas";
import {
    createKependudukanRow,
    deleteKependudukanRow,
    getKependudukanRow,
    kelurahanBelongsToTenant,
    kependudukanResources,
    listKependudukanRows,
    listPeriodes,
    listRefOptions,
    periodeExists,
    refExists,
    updateKependudukanRow,
} from "./repository";

function kelurahanFilterFor(profile: Awaited<ReturnType<typeof requireAuth>>) {
    return profile.role === "admin_kelurahan" ? profile.kelurahan_id : null;
}

async function normalizePayload(
    resource: KependudukanResource,
    input: KependudukanPayload,
    tenantId: string,
    profile: Awaited<ReturnType<typeof requireAuth>>
) {
    const payload = input as Record<string, unknown>;
    const kelurahanId = profile.role === "admin_kelurahan" ? profile.kelurahan_id : String(payload.kelurahan_id);

    if (!kelurahanId) {
        throw new AppError(403, "Kelurahan user tidak tersedia.", "FORBIDDEN_KELURAHAN");
    }

    requireKelurahanScope(profile, kelurahanId);

    if (!(await kelurahanBelongsToTenant(kelurahanId, tenantId))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }

    if (!(await periodeExists(Number(payload.periode_id)))) {
        throw new AppError(400, "Periode tidak valid.", "INVALID_PERIODE");
    }

    const ref = kependudukanResources[resource].ref;
    if (ref && !(await refExists(resource, Number(payload[ref.key])))) {
        throw new AppError(400, "Referensi tidak valid.", "INVALID_REFERENCE");
    }

    return { ...payload, kelurahan_id: kelurahanId };
}

async function parsePayload(resource: KependudukanResource, req: NextRequest) {
    return kependudukanResourceSchemas[resource].parse(await req.json()) as KependudukanPayload;
}

export async function listAdminKependudukanResource(tenantSlug: string, resource: KependudukanResource) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    return listKependudukanRows(resource, tenant.id, kelurahanFilterFor(profile));
}

export async function createAdminKependudukanResource(tenantSlug: string, resource: KependudukanResource, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: `pemerintahan/kependudukan/${resource}`, action: "create" });

    const payload = await normalizePayload(resource, await parsePayload(resource, req), tenant.id, profile);
    const row = await createKependudukanRow(resource, tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: `pemerintahan/kependudukan/${resource}`,
        recordTable: kependudukanResources[resource].table,
        recordId: row.id,
        detail: `Tambah data kependudukan ${resource}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminKependudukanResource(
    tenantSlug: string,
    resource: KependudukanResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: `pemerintahan/kependudukan/${resource}`, action: "update" });

    const target = await getKependudukanRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, "Data kependudukan tidak ditemukan.", "KEPENDUDUKAN_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = await normalizePayload(resource, await parsePayload(resource, req), tenant.id, profile);
    const row = await updateKependudukanRow(resource, id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, "Data kependudukan tidak ditemukan.", "KEPENDUDUKAN_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: `pemerintahan/kependudukan/${resource}`,
        recordTable: kependudukanResources[resource].table,
        recordId: row.id,
        detail: `Update data kependudukan ${resource}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminKependudukanResource(
    tenantSlug: string,
    resource: KependudukanResource,
    id: string,
    req: NextRequest
) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: `pemerintahan/kependudukan/${resource}`, action: "delete" });

    const target = await getKependudukanRow(resource, id, tenant.id);
    if (!target) {
        throw new AppError(404, "Data kependudukan tidak ditemukan.", "KEPENDUDUKAN_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteKependudukanRow(resource, id, tenant.id);
    if (!row) {
        throw new AppError(404, "Data kependudukan tidak ditemukan.", "KEPENDUDUKAN_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: `pemerintahan/kependudukan/${resource}`,
        recordTable: kependudukanResources[resource].table,
        recordId: row.id,
        detail: `Hapus data kependudukan ${resource}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function listAdminKependudukanRefs(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const [periodes, refs] = await Promise.all([listPeriodes(), listRefOptions()]);
    return { periodes, refs };
}
