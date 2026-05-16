import "server-only";

import { auth } from "../../../auth";
import type { UserProfile } from "@/types";

export async function getCurrentUser() {
    const session = await auth();
    return session?.user ?? null;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
    const user = await getCurrentUser();
    return user?.profile ?? null;
}

export async function requireCurrentProfile(): Promise<UserProfile> {
    const profile = await getCurrentProfile();
    if (!profile) {
        throw new Error("Unauthorized");
    }
    return profile;
}

export function canManageUsers(role: UserProfile["role"] | undefined) {
    return role === "super_admin";
}

export function canAccessTenant(profile: UserProfile | null, tenantId: string) {
    return Boolean(
        profile?.is_active &&
        (profile.role === "super_admin" || profile.tenant_id === tenantId)
    );
}
