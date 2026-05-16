import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope, requireRole } from "@/server/auth/guards";
import { logServerActivity } from "@/server/activity/log";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import {
    createMapLayer,
    createMapPoi,
    deleteMapLayer,
    deleteMapPoi,
    getMapLayer,
    getMapPoi,
    kelurahanBelongsToTenant,
    listMapFacilities,
    listMapLayers,
    listMapPoi,
    updateMapLayer,
    updateMapPoi,
} from "./repository";
import { mapLayerPayloadSchema, mapPoiPayloadSchema, type MapPoiPayload } from "./schemas";

type Profile = Awaited<ReturnType<typeof requireAuth>>;

function kelurahanFilterFor(profile: Profile) {
    return profile.role === "admin_kelurahan" ? profile.kelurahan_id : null;
}

function requireLayerManager(profile: Profile) {
    requireRole(profile, ["super_admin", "admin_kecamatan"]);
}

async function normalizePoiPayload(payload: MapPoiPayload, tenantId: string, profile: Profile) {
    const kelurahanId = profile.role === "admin_kelurahan" ? profile.kelurahan_id : payload.kelurahan_id;

    if (profile.role === "admin_kelurahan" && !kelurahanId) {
        throw new AppError(403, "Kelurahan user tidak tersedia.", "FORBIDDEN_KELURAHAN");
    }

    requireKelurahanScope(profile, kelurahanId);

    if (kelurahanId && !(await kelurahanBelongsToTenant(kelurahanId, tenantId))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }

    return { ...payload, kelurahan_id: kelurahanId };
}

export async function getPublicPetaData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const [layers, facilities] = await Promise.all([
        listMapLayers(tenant.id, true),
        listMapFacilities(tenant.id),
    ]);

    return { layers, facilities };
}

export async function getAdminPetaData(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const [layers, poi, facilities] = await Promise.all([
        listMapLayers(tenant.id),
        listMapPoi(tenant.id, kelurahanFilterFor(profile)),
        listMapFacilities(tenant.id),
    ]);

    return { layers, poi, facilities };
}

export async function listAdminMapLayers(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    return listMapLayers(tenant.id);
}

export async function createAdminMapLayer(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    requireLayerManager(profile);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "peta/layers", action: "create" });

    const payload = mapLayerPayloadSchema.parse(await req.json());
    const row = await createMapLayer(tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "peta/layers",
        recordTable: "gis_layers",
        recordId: row.id,
        detail: "Tambah layer peta",
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminMapLayer(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    requireLayerManager(profile);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "peta/layers", action: "update" });

    if (!(await getMapLayer(id, tenant.id))) {
        throw new AppError(404, "Layer peta tidak ditemukan.", "MAP_LAYER_NOT_FOUND");
    }

    const payload = mapLayerPayloadSchema.parse(await req.json());
    const row = await updateMapLayer(id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, "Layer peta tidak ditemukan.", "MAP_LAYER_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "peta/layers",
        recordTable: "gis_layers",
        recordId: row.id,
        detail: "Update layer peta",
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminMapLayer(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    requireLayerManager(profile);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "peta/layers", action: "delete" });

    const row = await deleteMapLayer(id, tenant.id);
    if (!row) {
        throw new AppError(404, "Layer peta tidak ditemukan.", "MAP_LAYER_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "peta/layers",
        recordTable: "gis_layers",
        recordId: row.id,
        detail: "Hapus layer peta",
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function listAdminMapPoi(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    return listMapPoi(tenant.id, kelurahanFilterFor(profile));
}

export async function createAdminMapPoi(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "peta/poi", action: "create" });

    const parsed = mapPoiPayloadSchema.parse(await req.json());
    const payload = await normalizePoiPayload(parsed, tenant.id, profile);
    const row = await createMapPoi(tenant.id, payload);

    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "peta/poi",
        recordTable: "gis_poi",
        recordId: row.id,
        detail: "Tambah titik penting peta",
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminMapPoi(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "peta/poi", action: "update" });

    const target = await getMapPoi(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Titik peta tidak ditemukan.", "MAP_POI_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const parsed = mapPoiPayloadSchema.parse(await req.json());
    const payload = await normalizePoiPayload(parsed, tenant.id, profile);
    const row = await updateMapPoi(id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, "Titik peta tidak ditemukan.", "MAP_POI_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "peta/poi",
        recordTable: "gis_poi",
        recordId: row.id,
        detail: "Update titik penting peta",
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminMapPoi(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "peta/poi", action: "delete" });

    const target = await getMapPoi(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Titik peta tidak ditemukan.", "MAP_POI_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteMapPoi(id, tenant.id);
    if (!row) {
        throw new AppError(404, "Titik peta tidak ditemukan.", "MAP_POI_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "peta/poi",
        recordTable: "gis_poi",
        recordId: row.id,
        detail: "Hapus titik penting peta",
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}
