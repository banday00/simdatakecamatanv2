import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../auth";
import { handleApiError, ok } from "@/server/http/response";
import { AppError } from "@/server/http/errors";
import { logServerActivity } from "@/server/activity/log";

const authActivitySchema = z.object({
    action: z.enum(["login", "logout"]),
});

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const user = session?.user ?? null;
        const profile = user?.profile ?? null;
        if (!profile?.is_active) {
            throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
        }
        const userEmail = user?.email ?? profile.nama_lengkap ?? "user";

        const payload = authActivitySchema.parse(await req.json());
        await logServerActivity({
            action: payload.action,
            tenantId: profile.tenant_id,
            profile,
            module: "auth",
            detail: payload.action === "login"
                ? `Login berhasil: ${userEmail}`
                : `Logout: ${profile.nama_lengkap || userEmail}`,
            userAgent: req.headers.get("user-agent"),
            ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        });

        return ok(true);
    } catch (error) {
        return handleApiError(error);
    }
}
