import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/db/client";
import { getCurrentProfile, canManageUsers } from "@/lib/auth/server";

const userRoleSchema = z.enum(["super_admin", "admin_kecamatan", "admin_kelurahan"]);

const createUserSchema = z.object({
    email: z.email("Email tidak valid.").trim().toLowerCase(),
    password: z.string().min(8, "Password minimal 8 karakter.").max(128),
    nama_lengkap: z.string().trim().min(2, "Nama minimal 2 karakter.").max(160),
    nip: z.string().trim().max(40).nullable().optional(),
    jabatan: z.string().trim().max(120).nullable().optional(),
    role: userRoleSchema,
    kelurahan_id: z.uuid().nullable().optional(),
    tenant_id: z.uuid("Tenant tidak valid."),
});

const updatePasswordSchema = z.object({
    userId: z.uuid("User tidak valid."),
    password: z.string().min(8, "Password minimal 8 karakter.").max(128),
});

const deleteUserSchema = z.object({
    userId: z.uuid("User tidak valid."),
});

export async function POST(req: NextRequest) {
    try {
        const callerProfile = await getCurrentProfile();
        if (!callerProfile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!canManageUsers(callerProfile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const parsed = createUserSchema.safeParse(await req.json().catch(() => ({})));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
        }
        const { email, password, nama_lengkap, nip, jabatan, role, kelurahan_id, tenant_id } = parsed.data;

        if (callerProfile.role !== "super_admin" && callerProfile.tenant_id !== tenant_id) {
            return NextResponse.json({ error: "Cannot create users for another tenant" }, { status: 403 });
        }
        if (role === "super_admin" && callerProfile.role !== "super_admin") {
            return NextResponse.json({ error: "Only super admin can create super admin users" }, { status: 403 });
        }

        const passwordHash = await hash(password, 12);
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const userResult = await client.query<{ id: string }>(
                `INSERT INTO users (email, password_hash, password_reset_required)
                 VALUES ($1, $2, true)
                 RETURNING id`,
                [email, passwordHash]
            );
            const userId = userResult.rows[0].id;
            await client.query(
                `INSERT INTO user_profiles
                    (id, tenant_id, nama_lengkap, nip, jabatan, role, kelurahan_id, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
                [
                    userId,
                    tenant_id,
                    nama_lengkap,
                    nip || null,
                    jabatan || null,
                    role,
                    role === "admin_kelurahan" ? kelurahan_id : null,
                ]
            );
            await client.query("COMMIT");
            return NextResponse.json({ success: true, userId });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const callerProfile = await getCurrentProfile();
        if (!callerProfile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!canManageUsers(callerProfile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const parsed = deleteUserSchema.safeParse({ userId: searchParams.get("userId") });
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "userId required" }, { status: 400 });
        }
        const { userId } = parsed.data;

        if (userId === callerProfile.id) {
            return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
        }

        if (callerProfile.role !== "super_admin") {
            const target = await pool.query(
                `SELECT tenant_id, role FROM user_profiles WHERE id = $1 LIMIT 1`,
                [userId]
            );
            const targetProfile = target.rows[0];
            if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id || targetProfile.role === "super_admin") {
                return NextResponse.json({ error: "Cannot delete users from another tenant" }, { status: 403 });
            }
        }

        await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const callerProfile = await getCurrentProfile();
        if (!callerProfile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!canManageUsers(callerProfile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const parsed = updatePasswordSchema.safeParse(await req.json().catch(() => ({})));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
        }
        const { userId, password } = parsed.data;

        if (callerProfile.role !== "super_admin") {
            const target = await pool.query(
                `SELECT tenant_id, role FROM user_profiles WHERE id = $1 LIMIT 1`,
                [userId]
            );
            const targetProfile = target.rows[0];
            if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id || targetProfile.role === "super_admin") {
                return NextResponse.json({ error: "Cannot update users from another tenant" }, { status: 403 });
            }
        }

        const passwordHash = await hash(password, 12);
        await pool.query(
            `UPDATE users
             SET password_hash = $1,
                 password_reset_required = true,
                 updated_at = now()
             WHERE id = $2`,
            [passwordHash, userId]
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
