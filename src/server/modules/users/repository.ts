import "server-only";

import type { PoolClient } from "pg";
import { pool } from "@/db/client";
import type { CreateUserInput, UpdateUserInput } from "./schemas";

export type AdminUserRow = {
    id: string;
    email: string;
    tenant_id: string;
    kelurahan_id: string | null;
    nama_lengkap: string;
    nip: string | null;
    jabatan: string | null;
    foto: string | null;
    role: "super_admin" | "admin_kecamatan" | "admin_kelurahan" | "executive_dashboard";
    is_active: boolean;
    last_login: string | null;
    created_at: string;
    updated_at: string | null;
};

const USER_COLUMNS = `
    p.id,
    u.email,
    p.tenant_id,
    p.kelurahan_id,
    p.nama_lengkap,
    p.nip,
    p.jabatan,
    p.foto,
    p.role,
    p.is_active,
    p.last_login,
    p.created_at,
    p.updated_at
`;

export async function listUsersByTenant(tenantId: string) {
    const result = await pool.query<AdminUserRow>(
        `SELECT ${USER_COLUMNS}
         FROM user_profiles p
         JOIN users u ON u.id = p.id
         WHERE p.tenant_id = $1
         ORDER BY p.created_at DESC`,
        [tenantId]
    );

    return result.rows;
}

export async function getUserById(userId: string) {
    const result = await pool.query<AdminUserRow>(
        `SELECT ${USER_COLUMNS}
         FROM user_profiles p
         JOIN users u ON u.id = p.id
         WHERE p.id = $1
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] ?? null;
}

export async function kelurahanBelongsToTenant(kelurahanId: string, tenantId: string) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM kelurahans WHERE id = $1 AND tenant_id = $2 AND is_active = true
         ) AS exists`,
        [kelurahanId, tenantId]
    );

    return Boolean(result.rows[0]?.exists);
}

export async function createUserWithProfile(
    client: PoolClient,
    tenantId: string,
    passwordHash: string,
    input: CreateUserInput
) {
    const userResult = await client.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, password_reset_required, is_active)
         VALUES ($1, $2, true, true)
         RETURNING id`,
        [input.email, passwordHash]
    );

    const userId = userResult.rows[0].id;
    await client.query(
        `INSERT INTO user_profiles (
            id,
            tenant_id,
            kelurahan_id,
            nama_lengkap,
            nip,
            jabatan,
            role,
            is_active,
            email
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
            userId,
            tenantId,
            input.role === "admin_kelurahan" ? input.kelurahan_id ?? null : null,
            input.nama_lengkap,
            input.nip,
            input.jabatan,
            input.role,
            input.is_active,
            input.email,
        ]
    );

    return userId;
}

export async function updateUserProfile(userId: string, tenantId: string, input: UpdateUserInput) {
    const result = await pool.query<AdminUserRow>(
        `UPDATE user_profiles p
         SET nama_lengkap = $1,
             nip = $2,
             jabatan = $3,
             role = $4,
             kelurahan_id = $5,
             is_active = $6,
             updated_at = now()
         FROM users u
         WHERE p.id = u.id
           AND p.id = $7
           AND p.tenant_id = $8
         RETURNING ${USER_COLUMNS}`,
        [
            input.nama_lengkap,
            input.nip,
            input.jabatan,
            input.role,
            input.role === "admin_kelurahan" ? input.kelurahan_id ?? null : null,
            input.is_active,
            userId,
            tenantId,
        ]
    );

    return result.rows[0] ?? null;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
    const result = await pool.query<{ id: string }>(
        `UPDATE users
         SET password_hash = $1,
             password_reset_required = true,
             updated_at = now()
         WHERE id = $2
         RETURNING id`,
        [passwordHash, userId]
    );

    return result.rows[0] ?? null;
}

export async function deleteUserById(userId: string) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            `UPDATE activity_logs
             SET user_id = NULL
             WHERE user_id = $1`,
            [userId]
        );
        const result = await client.query<{ id: string }>(
            `DELETE FROM users WHERE id = $1 RETURNING id`,
            [userId]
        );
        await client.query("COMMIT");

        return result.rows[0] ?? null;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    } finally {
        client.release();
    }
}
