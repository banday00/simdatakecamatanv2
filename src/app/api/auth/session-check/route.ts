import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { pool } from "@/db/client";

type SessionRow = {
    current_session_id: string | null;
    current_session_ip: string | null;
    current_session_ua: string | null;
    current_session_at: Date | null;
};

export async function GET() {
    try {
        const session = await auth();
        const user = session?.user;

        if (!user?.id) {
            return NextResponse.json({ valid: false, reason: "no_session" }, { status: 401 });
        }

        const sessionToken = (user as unknown as { sessionToken?: string }).sessionToken;
        if (!sessionToken) {
            // Legacy session tanpa token — anggap valid agar tidak kick user lama
            return NextResponse.json({ valid: true });
        }

        const result = await pool.query<SessionRow>(
            `SELECT current_session_id, current_session_ip, current_session_ua, current_session_at
             FROM user_profiles
             WHERE id = $1`,
            [user.id]
        );

        const row = result.rows[0];
        if (!row) {
            return NextResponse.json({ valid: false, reason: "user_not_found" }, { status: 401 });
        }

        // Jika session token cocok → sesi masih valid
        if (row.current_session_id === sessionToken) {
            return NextResponse.json({ valid: true });
        }

        // Session token tidak cocok → ada login baru dari perangkat lain
        return NextResponse.json({
            valid: false,
            reason: "session_replaced",
            kickedBy: {
                ip: row.current_session_ip ?? "Tidak diketahui",
                userAgent: row.current_session_ua ?? "Tidak diketahui",
                loginAt: row.current_session_at?.toISOString?.() ?? null,
            },
        });
    } catch (error) {
        console.error("[SessionCheck] Error:", error);
        // Jangan kick user saat server error — return valid
        return NextResponse.json({ valid: true });
    }
}
