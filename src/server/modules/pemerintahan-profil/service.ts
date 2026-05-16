import "server-only";

import type { NextRequest } from "next/server";
import { canManageAdminData, requireAuth, requireKelurahanScope } from "@/server/auth/guards";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { logServerActivity } from "@/server/activity/log";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import { profilPatchSchema, profilPayloadSchema, type ProfilPayload } from "./schemas";
import {
    createProfil,
    deleteProfil,
    getProfilById,
    kelurahanBelongsToTenant,
    listProfilByTenant,
    listProfilLeaders,
    updateProfil,
    type ProfilRow,
} from "./repository";

function splitProfil(rows: ProfilRow[]) {
    return {
        kecamatan: rows.filter((row) => row.kelurahan_id === null),
        kelurahan: rows.filter((row) => row.kelurahan_id !== null),
    };
}

async function normalizeCreatePayload(input: ProfilPayload, tenantId: string, profileKelurahanId: string | null, isKelurahanAdmin: boolean) {
    const kelurahanId = isKelurahanAdmin ? profileKelurahanId : input.kelurahan_id ?? null;
    if (isKelurahanAdmin && !kelurahanId) {
        throw new AppError(403, "Profil kelurahan tidak tersedia untuk user ini.", "FORBIDDEN_KELURAHAN");
    }
    if (kelurahanId && !(await kelurahanBelongsToTenant(kelurahanId, tenantId))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }

    return { ...input, kelurahan_id: kelurahanId };
}

export async function listAdminProfil(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);

    const kelurahanFilter = profile.role === "admin_kelurahan" ? profile.kelurahan_id : null;
    const [rows, leaders] = await Promise.all([
        listProfilByTenant(tenant.id, kelurahanFilter),
        listProfilLeaders(tenant.id),
    ]);

    return {
        ...splitProfil(rows),
        leaders: profile.role === "admin_kelurahan"
            ? leaders.filter((leader) => leader.kelurahan_id === profile.kelurahan_id)
            : leaders,
    };
}

export async function createAdminProfil(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/profil", action: "create" });

    const payload = await normalizeCreatePayload(
        profilPayloadSchema.parse(await req.json()),
        tenant.id,
        profile.kelurahan_id,
        profile.role === "admin_kelurahan"
    );

    requireKelurahanScope(profile, payload.kelurahan_id);

    const row = await createProfil(tenant.id, payload);
    await logServerActivity({
        action: "create",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/profil",
        recordTable: "gov_profiles",
        recordId: row.id,
        detail: `Tambah profil pemerintahan tahun ${row.tahun}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminProfil(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/profil", action: "update" });

    const target = await getProfilById(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Profil tidak ditemukan.", "PROFIL_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const payload = profilPatchSchema.parse(await req.json());
    const row = await updateProfil(id, tenant.id, payload);
    if (!row) {
        throw new AppError(404, "Profil tidak ditemukan.", "PROFIL_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/profil",
        recordTable: "gov_profiles",
        recordId: row.id,
        detail: `Update profil pemerintahan tahun ${row.tahun}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function deleteAdminProfil(tenantSlug: string, id: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    canManageAdminData(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pemerintahan/profil", action: "delete" });

    const target = await getProfilById(id, tenant.id);
    if (!target) {
        throw new AppError(404, "Profil tidak ditemukan.", "PROFIL_NOT_FOUND");
    }
    requireKelurahanScope(profile, target.kelurahan_id);

    const row = await deleteProfil(id, tenant.id);
    if (!row) {
        throw new AppError(404, "Profil tidak ditemukan.", "PROFIL_NOT_FOUND");
    }

    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "pemerintahan/profil",
        recordTable: "gov_profiles",
        recordId: row.id,
        detail: `Hapus profil pemerintahan tahun ${row.tahun}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}
