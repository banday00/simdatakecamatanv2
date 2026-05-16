import "server-only";

import { pool } from "@/db/client";
import type { UserProfile } from "@/types";

type ActivityAction = "login" | "logout" | "create" | "update" | "delete" | "backup";

type ActivityInput = {
    action: ActivityAction;
    tenantId?: string | null;
    profile?: UserProfile | null;
    module?: string;
    recordTable?: string;
    recordId?: string | null;
    detail?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
};

export async function logServerActivity(input: ActivityInput) {
    try {
        await pool.query(
            `INSERT INTO activity_logs (
                tenant_id,
                user_id,
                user_email,
                user_name,
                action,
                module,
                record_table,
                record_id,
                detail,
                ip_address,
                user_agent
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
                Object.prototype.hasOwnProperty.call(input, "tenantId")
                    ? input.tenantId ?? null
                    : input.profile?.tenant_id ?? null,
                input.profile?.id ?? null,
                null,
                input.profile?.nama_lengkap ?? null,
                input.action,
                input.module ?? null,
                input.recordTable ?? null,
                input.recordId ?? null,
                input.detail ?? null,
                input.ipAddress ?? null,
                input.userAgent ?? null,
            ]
        );
    } catch (error) {
        console.warn("[ActivityLog] Failed to write activity log", error);
    }
}
