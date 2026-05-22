"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { useTenant } from "@/lib/tenant/context";
import {
    ShieldAlert,
    Monitor,
    Globe,
    Clock,
    LogIn,
    AlertTriangle,
} from "lucide-react";

function parseUserAgent(ua: string): string {
    if (!ua || ua === "Tidak diketahui") return "Tidak diketahui";

    // Extract browser name
    let browser = "Browser tidak dikenal";
    if (ua.includes("Edg/")) browser = "Microsoft Edge";
    else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Google Chrome";
    else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
    else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";
    else if (ua.includes("Opera/") || ua.includes("OPR/")) browser = "Opera";

    // Extract OS
    let os = "";
    if (ua.includes("Windows NT 10")) os = "Windows 10/11";
    else if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS X")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";

    return os ? `${browser} — ${os}` : browser;
}

function formatLoginTime(isoString: string | null): string {
    if (!isoString) return "Baru saja";
    try {
        const date = new Date(isoString);
        return date.toLocaleString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
        });
    } catch {
        return "Baru saja";
    }
}

function SessionTerminatedContent() {
    const searchParams = useSearchParams();
    const toTenantPath = useTenantPath();
    const { tenant } = useTenant();

    const ip = searchParams.get("ip") ?? "Tidak diketahui";
    const ua = searchParams.get("ua") ?? "Tidak diketahui";
    const loginAt = searchParams.get("at");

    const browserInfo = parseUserAgent(ua);
    const timeInfo = formatLoginTime(loginAt);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 flex items-center justify-center p-4">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-32 -right-32 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl animate-pulse"
                    style={{ animationDuration: "6s" }}
                />
                <div
                    className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-200/20 rounded-full blur-3xl animate-pulse"
                    style={{ animationDuration: "8s", animationDelay: "1s" }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            <div className="w-full max-w-lg">
                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-amber-100/60 border border-amber-100/80 overflow-hidden">
                    {/* Top warning bar */}
                    <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-400" />

                    {/* Header */}
                    <div className="px-8 pt-8 pb-4 text-center">
                        <div className="relative mx-auto w-20 h-20 mb-5">
                            <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-20" />
                            <div className="relative w-20 h-20 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full flex items-center justify-center border-4 border-white shadow-lg shadow-amber-200/40">
                                <ShieldAlert className="w-10 h-10 text-amber-600" />
                            </div>
                        </div>

                        <h1 className="text-xl font-bold text-slate-900 mb-2">
                            Sesi Anda Telah Berakhir
                        </h1>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                            Akun Anda telah login dari perangkat lain. Setiap akun hanya dapat digunakan di{" "}
                            <span className="font-semibold text-slate-700">satu perangkat</span> secara bersamaan.
                        </p>
                    </div>

                    {/* Device info */}
                    <div className="px-8 pb-6">
                        <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 rounded-2xl border border-amber-100 p-5 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                                    Informasi Login Baru
                                </h2>
                            </div>

                            {/* IP Address */}
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-amber-100 flex items-center justify-center shrink-0">
                                    <Globe className="w-4.5 h-4.5 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Alamat IP
                                    </p>
                                    <p className="text-sm font-semibold text-slate-800 font-mono truncate">
                                        {ip}
                                    </p>
                                </div>
                            </div>

                            {/* Browser / Device */}
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-amber-100 flex items-center justify-center shrink-0">
                                    <Monitor className="w-4.5 h-4.5 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Perangkat / Browser
                                    </p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {browserInfo}
                                    </p>
                                </div>
                            </div>

                            {/* Login Time */}
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-amber-100 flex items-center justify-center shrink-0">
                                    <Clock className="w-4.5 h-4.5 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Waktu Login
                                    </p>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {timeInfo}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security notice */}
                    <div className="px-8 pb-5">
                        <div className="flex items-start gap-3 p-3.5 bg-red-50/60 border border-red-100 rounded-xl">
                            <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-700 leading-relaxed">
                                <span className="font-semibold">Bukan Anda?</span>{" "}
                                Segera hubungi administrator sistem untuk mengamankan akun Anda dan mengganti password.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-8 pb-8">
                        <Link
                            href={toTenantPath("/login")}
                            className="flex items-center justify-center gap-2.5 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-200/60"
                        >
                            <LogIn className="w-4.5 h-4.5" />
                            Login Kembali
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="px-8 pb-6">
                        <div className="flex items-center justify-center gap-2">
                            <Image
                                src="/bogor.png"
                                alt="Logo"
                                width={18}
                                height={18}
                                className="object-contain opacity-40"
                            />
                            <p className="text-[10px] text-slate-300 font-medium">
                                SIMDATA Kecamatan — {tenant?.nama || "Kota Bogor"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SessionTerminatedPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-slate-400 text-sm">Memuat...</div>
                </div>
            }
        >
            <SessionTerminatedContent />
        </Suspense>
    );
}
