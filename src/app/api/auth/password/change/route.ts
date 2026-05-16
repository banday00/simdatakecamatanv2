import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "../../../../../../auth";
import { pool } from "@/db/client";

const changePasswordSchema = z.object({
    newPassword: z
        .string()
        .min(8, "Password minimal 8 karakter.")
        .max(128, "Password terlalu panjang.")
        .regex(/[A-Za-z]/, "Password harus memuat huruf.")
        .regex(/[0-9]/, "Password harus memuat angka."),
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
