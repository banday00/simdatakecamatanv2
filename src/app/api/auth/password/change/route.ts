import { NextRequest, NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { auth } from "../../../../../../auth";
import { pool } from "@/db/client";

const changePasswordSchema = z.object({
    currentPassword: z
        .string()
        .min(1, "Password lama wajib diisi."),
    newPassword: z
        .string()
        .min(8, "Password minimal 8 karakter.")
        .max(128, "Password terlalu panjang.")
        .regex(/[a-z]/, "Password harus memuat huruf kecil.")
        .regex(/[A-Z]/, "Password harus memuat huruf besar.")
        .regex(/[0-9]/, "Password harus memuat angka.")
        .regex(/[^A-Za-z0-9]/, "Password harus memuat karakter spesial (!@#$%^&*)."),
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
    }

    // Fetch current password hash from DB
    const userResult = await pool.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [session.user.id]
    );

    if (userResult.rows.length === 0) {
        return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    const currentHash = userResult.rows[0].password_hash;

    // Verify old password
    const isOldPasswordValid = await compare(parsed.data.currentPassword, currentHash);
    if (!isOldPasswordValid) {
        return NextResponse.json({ error: "Password lama tidak sesuai." }, { status: 400 });
    }

    // Prevent reusing the same password
    const isSameAsOld = await compare(parsed.data.newPassword, currentHash);
    if (isSameAsOld) {
        return NextResponse.json({ error: "Password baru tidak boleh sama dengan password lama." }, { status: 400 });
    }

    const passwordHash = await hash(parsed.data.newPassword, 12);
    await pool.query(
        `UPDATE users
         SET password_hash = $1,
             password_changed_at = now(),
             password_reset_required = false,
             updated_at = now()
         WHERE id = $2`,
        [passwordHash, session.user.id]
    );

    return NextResponse.json({ data: true, error: null });
}
