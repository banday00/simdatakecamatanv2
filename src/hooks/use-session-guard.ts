"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";

const POLL_INTERVAL_MS = 15_000; // 15 detik

type KickedByInfo = {
    ip: string;
    userAgent: string;
    loginAt: string | null;
};

/**
 * Hook untuk memastikan hanya 1 sesi aktif per user.
 * Poll server setiap 15 detik. Jika terdeteksi login dari perangkat lain,
 * otomatis logout dan redirect ke halaman session-terminated.
 */
export function useSessionGuard() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const toTenantPath = useTenantPath();
    const isKickingRef = useRef(false);

    const checkSession = useCallback(async () => {
        // Jangan cek jika belum login atau sudah dalam proses kick
        if (!user?.id || isKickingRef.current) return;

        try {
            const res = await fetch("/api/auth/session-check", {
                cache: "no-store",
            });

            // Network error atau server error — jangan kick
            if (!res.ok && res.status !== 401) return;

            const data = await res.json();

            if (!data.valid && data.reason === "session_replaced") {
                isKickingRef.current = true;
                const kicked = data.kickedBy as KickedByInfo;

                // Logout dulu
                await signOut();

                // Redirect ke halaman session-terminated dengan info perangkat baru
                const params = new URLSearchParams();
                if (kicked.ip) params.set("ip", kicked.ip);
                if (kicked.userAgent) params.set("ua", kicked.userAgent);
                if (kicked.loginAt) params.set("at", kicked.loginAt);

                router.replace(
                    toTenantPath(`/session-terminated?${params.toString()}`)
                );
            }
        } catch {
            // Fetch gagal (offline, dsb) — jangan kick user
        }
    }, [user?.id, signOut, router, toTenantPath]);

    useEffect(() => {
        if (!user?.id) return;

        // Cek sekali saat mount
        checkSession();

        // Kemudian poll berkala
        const interval = setInterval(checkSession, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [user?.id, checkSession]);
}
