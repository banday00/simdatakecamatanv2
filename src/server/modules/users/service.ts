import "server-only";

import type { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { pool } from "@/db/client";
import type { UserProfile } from "@/types";
import { requireAuth, requireRole, requireTenantAccess } from "@/server/auth/guards";
import { getTenantBySlug } from "@/server/db/tenant";
import { AppError } from "@/server/http/errors";
import { logServerActivity } from "@/server/activity/log";
import { assertAdminMutationRateLimit } from "@/server/security/admin-rate-limit";
import { createUserSchema, updateUserPasswordSchema, updateUserSchema } from "./schemas";
import {
    createUserWithProfile,
    deleteUserById,
    getUserById,
    kelurahanBelongsToTenant,
    listUsersByTenant,
    updateUserPassword,
    updateUserProfile,
    type AdminUserRow,
} from "./repository";

function requireCanManageUsers(profile: UserProfile, tenantId: string) {
    requireTenantAccess(profile, tenantId);
    requireRole(profile, ["super_admin", "admin_kecamatan"]);
}

async function assertKelurahanValid(role: UserProfile["role"], kelurahanId: string | null | undefined, tenantId: string) {
    if (role !== "admin_kelurahan") return;
    if (!kelurahanId) {
        throw new AppError(400, "Kelurahan wajib dipilih untuk admin kelurahan.", "KELURAHAN_REQUIRED");
    }

    if (!(await kelurahanBelongsToTenant(kelurahanId, tenantId))) {
        throw new AppError(400, "Kelurahan tidak valid untuk tenant ini.", "INVALID_KELURAHAN");
    }
}

function assertTargetManageable(caller: UserProfile, target: AdminUserRow) {
    if (caller.role !== "super_admin" && target.role === "super_admin") {
        throw new AppError(403, "Tidak boleh mengelola super admin.", "FORBIDDEN_SUPER_ADMIN");
    }
    if (caller.role !== "super_admin" && caller.tenant_id !== target.tenant_id) {
        throw new AppError(403, "Tidak boleh mengelola user tenant lain.", "FORBIDDEN_TENANT");
    }
}

export async function listAdminUsers(tenantSlug: string) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    requireCanManageUsers(profile, tenant.id);

    return listUsersByTenant(tenant.id);
}

export async function createAdminUser(tenantSlug: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    requireCanManageUsers(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pengguna", action: "create", limit: 10 });

    const input = createUserSchema.parse(await req.json());
    if (input.role === "super_admin" && profile.role !== "super_admin") {
        throw new AppError(403, "Hanya super admin yang boleh membuat super admin.", "FORBIDDEN_ROLE");
    }
    await assertKelurahanValid(input.role, input.kelurahan_id, tenant.id);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const passwordHash = await hash(input.password, 12);
        const userId = await createUserWithProfile(client, tenant.id, passwordHash, input);
        await client.query("COMMIT");

        const row = await getUserById(userId);
        if (!row) {
            throw new AppError(500, "User gagal dibuat.", "USER_CREATE_FAILED");
        }

        await logServerActivity({
            action: "create",
            tenantId: tenant.id,
            profile,
            module: "pengguna",
            recordTable: "user_profiles",
            recordId: row.id,
            detail: `Tambah pengguna: ${row.nama_lengkap}`,
            userAgent: req.headers.get("user-agent"),
        });

        return row;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    } finally {
        client.release();
    }
}

export async function updateAdminUser(tenantSlug: string, userId: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    requireCanManageUsers(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pengguna", action: "update", limit: 20 });

    const target = await getUserById(userId);
    if (!target || target.tenant_id !== tenant.id) {
        throw new AppError(404, "User tidak ditemukan.", "USER_NOT_FOUND");
    }
    assertTargetManageable(profile, target);

    const input = updateUserSchema.parse(await req.json());
    if (input.role === "super_admin" && profile.role !== "super_admin") {
        throw new AppError(403, "Hanya super admin yang boleh memberi role super admin.", "FORBIDDEN_ROLE");
    }
    if (userId === profile.id && (!input.is_active || input.role !== profile.role)) {
        throw new AppError(400, "Tidak boleh menonaktifkan atau mengubah role akun sendiri.", "SELF_UPDATE_BLOCKED");
    }
    await assertKelurahanValid(input.role, input.kelurahan_id, tenant.id);

    const row = await updateUserProfile(userId, tenant.id, input);
    if (!row) {
        throw new AppError(404, "User tidak ditemukan.", "USER_NOT_FOUND");
    }

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "pengguna",
        recordTable: "user_profiles",
        recordId: row.id,
        detail: `Update pengguna: ${row.nama_lengkap}`,
        userAgent: req.headers.get("user-agent"),
    });

    return row;
}

export async function updateAdminUserPassword(tenantSlug: string, userId: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    requireCanManageUsers(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pengguna/password", action: "update", limit: 10 });

    const target = await getUserById(userId);
    if (!target || target.tenant_id !== tenant.id) {
        throw new AppError(404, "User tidak ditemukan.", "USER_NOT_FOUND");
    }
    assertTargetManageable(profile, target);

    const input = updateUserPasswordSchema.parse(await req.json());
    const passwordHash = await hash(input.password, 12);
    await updateUserPassword(userId, passwordHash);

    await logServerActivity({
        action: "update",
        tenantId: tenant.id,
        profile,
        module: "pengguna",
        recordTable: "users",
        recordId: userId,
        detail: `Reset password pengguna: ${target.nama_lengkap}`,
        userAgent: req.headers.get("user-agent"),
    });

    return { id: userId };
}

export async function deleteAdminUser(tenantSlug: string, userId: string, req: NextRequest) {
    const tenant = await getTenantBySlug(tenantSlug);
    const profile = await requireAuth();
    requireCanManageUsers(profile, tenant.id);
    assertAdminMutationRateLimit({ req, profile, tenantId: tenant.id, module: "pengguna", action: "delete", limit: 10 });

    if (userId === profile.id) {
        throw new AppError(400, "Tidak bisa menghapus akun sendiri.", "SELF_DELETE_BLOCKED");
    }

    const target = await getUserById(userId);
    if (!target || target.tenant_id !== tenant.id) {
        throw new AppError(404, "User tidak ditemukan.", "USER_NOT_FOUND");
    }
    assertTargetManageable(profile, target);

    await deleteUserById(userId);
    await logServerActivity({
        action: "delete",
        tenantId: tenant.id,
        profile,
        module: "pengguna",
        recordTable: "users",
        recordId: userId,
        detail: `Hapus pengguna: ${target.nama_lengkap}`,
        userAgent: req.headers.get("user-agent"),
    });

    return target;
}
