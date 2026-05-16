import "server-only";

import type { NextRequest } from "next/server";
import type { UserProfile } from "@/types";
import { assertRateLimit } from "./rate-limit";

type AdminMutationAction = "create" | "update" | "delete";

type AdminMutationRateLimitInput = {
    req: NextRequest;
    profile: UserProfile;
    tenantId: string;
    module: string;
    action: AdminMutationAction;
    limit?: number;
    windowMs?: number;
};

const DEFAULT_LIMITS: Record<AdminMutationAction, number> = {
    create: 60,
    update: 60,
    delete: 20,
};

export function assertAdminMutationRateLimit({
    req,
    profile,
    tenantId,
    module,
    action,
    limit,
    windowMs = 60 * 1000,
}: AdminMutationRateLimitInput) {
    const forwardedIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "local";

    assertRateLimit(
        `admin:${tenantId}:${profile.id}:${forwardedIp}:${module}:${action}`,
        limit ?? DEFAULT_LIMITS[action],
        windowMs
    );
}
