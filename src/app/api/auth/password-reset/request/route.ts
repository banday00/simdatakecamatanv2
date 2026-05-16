import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/db/client";
import { assertRateLimit } from "@/server/security/rate-limit";
import { isAppError } from "@/server/http/errors";

const resetPasswordSchema = z.object({
    email: z.email("Email tidak valid.").trim().toLowerCase(),
});

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
    }

    const email = parsed.data.email;
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    try {
        assertRateLimit(`password-reset:${email}:${forwardedFor}`, 5, 15 * 60 * 1000);
    } catch (error) {
        const message = isAppError(error) ? error.message : "Terlalu banyak percobaan.";
        return NextResponse.json({ data: null, error: message }, { status: 429 });
    }

    if (email) {
        await pool.query(
            `INSERT INTO login_attempts (email, success, failure_reason)
             VALUES ($1, false, 'password_reset_requested')`,
            [email]
        ).catch(() => undefined);
    }

    return NextResponse.json({
        data: true,
        error: null,
        message: "Jika email terdaftar, administrator akan memproses reset password.",
    });
}
