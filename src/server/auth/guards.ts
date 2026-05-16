import "server-only";

import type { UserProfile } from "@/types";
import { getCurrentProfile } from "@/lib/auth/server";
import { AppError } from "@/server/http/errors";

type Role = UserProfile["role"];

export async function requireAuth() {
    const profile = await getCurrentProfile();
    if (!profile?.is_active) {
        throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }
    return profile;
}

export function requireRole(profile: UserProfile, roles: Role[]) {
    if (!roles.includes(profile.role)) {
        throw new AppError(403, "Forbidden", "FORBIDDEN");
    }
}

export function requireTenantAccess(profile: UserProfile, tenantId: string) {
    if (profile.role !== "super_admin" && profile.tenant_id !== tenantId) {
        throw new AppError(403, "Forbidden tenant", "FORBIDDEN_TENANT");
    }
}

export function requireKelurahanScope(profile: UserProfile, kelurahanId: string | null | undefined) {
    if (profile.role === "admin_kelurahan" && profile.kelurahan_id !== kelurahanId) {
        throw new AppError(403, "Forbidden kelurahan", "FORBIDDEN_KELURAHAN");
    }
}

export function canManageAdminData(profile: UserProfile, tenantId: string) {
    requireTenantAccess(profile, tenantId);
    requireRole(profile, ["super_admin", "admin_kecamatan", "admin_kelurahan"]);
}

