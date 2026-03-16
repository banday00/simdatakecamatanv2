"use client";

import { createClient } from "@/lib/supabase/client";

type LogPayload = {
    action: "login" | "logout" | "create" | "update" | "delete";
    module?: string;
    recordTable?: string;
    recordId?: string;
    detail?: string;
    /** Override: pass tenant_id explicitly (e.g. during login before context loads) */
    tenantId?: string;
    /** Override: user info for login (before profile loads) */
    userId?: string;
    userEmail?: string;
    userName?: string;
};

/**
 * Log an activity to `sidakota.activity_logs`.
 *
 * For auth events (login/logout), pass user info explicitly.
 * For CRUD events, pass tenantId/userId/etc. from context.
 */
export async function logActivity(payload: LogPayload) {
    try {
        const supabase = createClient();

        const row: Record<string, unknown> = {
            action: payload.action,
            module: payload.module || null,
            record_table: payload.recordTable || null,
            record_id: payload.recordId || null,
            detail: payload.detail || null,
            tenant_id: payload.tenantId || null,
            user_id: payload.userId || null,
            user_email: payload.userEmail || null,
            user_name: payload.userName || null,
            ip_address: null,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        };

        // Try to get IP address from a public API (best-effort, non-blocking)
        if (payload.action === "login") {
            try {
                const ipRes = await fetch("https://api.ipify.org?format=json", {
                    signal: AbortSignal.timeout(3000),
                });
                if (ipRes.ok) {
                    const ipData = await ipRes.json();
                    row.ip_address = ipData.ip || null;
                }
            } catch {
                // IP fetch failed — not critical, continue without it
            }
        }

        await supabase.schema("sidakota").from("activity_logs").insert(row);
    } catch (err) {
        // Activity logging should never break the app — fail silently
        console.warn("[ActivityLogger] Failed to log:", err);
    }
}
