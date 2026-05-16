"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useTenant } from "@/lib/tenant/context";
import { PageHeader } from "@/components/ui/page-header";
import {
    AlertCircle,
    CheckCircle2,
    DatabaseBackup,
    FileArchive,
    Loader2,
    RefreshCw,
    User,
} from "lucide-react";

type BackupLogRow = {
    id: string;
    user_name: string | null;
    detail: string | null;
    record_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
};

type BackupResult = {
    filename: string;
    storagePath: string;
    rowCount: number;
    tableCount: number;
    sizeBytes: number;
};

function formatDateTime(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
        " " +
        date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function parseBrowser(userAgent: string | null) {
    if (!userAgent) return "-";
    if (userAgent.includes("Edg")) return "Edge";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    return "Browser";
}

export default function BackupDatabasePage() {
    const { profile } = useAuth();
    const { tenant } = useTenant();
    const [logs, setLogs] = useState<BackupLogRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchLogs = useCallback(async () => {
        if (!tenant?.slug || profile?.role !== "super_admin") return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/tenants/${tenant.slug}/admin/database-backup`, {
                cache: "no-store",
            });
            const result = await response.json();
            if (!response.ok || result.error || !result.data) {
                throw new Error(result.error?.message ?? "Gagal memuat log backup.");
            }

            setLogs(result.data.rows ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat log backup.");
        } finally {
            setIsLoading(false);
        }
    }, [profile?.role, tenant?.slug]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    async function handleBackup() {
        if (!tenant?.slug || profile?.role !== "super_admin" || isBackingUp) return;
        setIsBackingUp(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`/api/tenants/${tenant.slug}/admin/database-backup`, {
                method: "POST",
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type") ?? "";
                if (contentType.includes("application/json")) {
                    const result = await response.json();
                    throw new Error(result.error?.message ?? "Backup database gagal.");
                }
                throw new Error("Backup database gagal.");
            }

            const result = await response.json();
            if (result.error || !result.data) {
                throw new Error(result.error?.message ?? "Backup database gagal.");
            }

            const backup = result.data as BackupResult;

            setSuccess(`Backup berhasil disimpan di server: ${backup.storagePath}`);
            await fetchLogs();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Backup database gagal.");
        } finally {
            setIsBackingUp(false);
        }
    }

    const isSuperAdmin = profile?.role === "super_admin";

    if (profile && !isSuperAdmin) {
        return (
            <div className="animate-fade-in space-y-6">
                <PageHeader
                    title="Backup Database"
                    description="Akses backup penuh database dibatasi untuk super admin"
                    breadcrumbs={[
                        { label: "Dashboard", href: "/admin" },
                        { label: "Backup Database" },
                    ]}
                />
                <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700">
                    Halaman backup database hanya dapat diakses oleh Super Admin.
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Backup Database"
                description="Buat full backup database dan pantau riwayat backup"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Backup Database" },
                ]}
            />

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Full backup database</h2>
                            <p className="mt-1 text-xs text-slate-500">Hasil backup disimpan di folder server.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleBackup}
                            disabled={isBackingUp || !tenant?.slug}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            {isBackingUp ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <DatabaseBackup className="w-4 h-4" />
                            )}
                            {isBackingUp ? "Menyimpan Backup..." : "Backup Database"}
                        </button>
                    </div>

                    {(error || success) && (
                        <div className="mt-4">
                            {error && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            {success && (
                                <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                    <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0" />
                                    <span>{success}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Log Backup</h2>
                        <p className="text-xs text-slate-500">30 aktivitas backup terbaru</p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchLogs}
                        disabled={isLoading || isBackingUp}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70">
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Pengguna</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">File</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Detail</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">IP / Browser</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">Memuat log backup...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <FileArchive className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400 font-medium">Belum ada backup tercatat</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                                            {formatDateTime(row.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                                                    <User className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">
                                                    {row.user_name || "-"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 font-mono max-w-[220px] truncate">
                                            {row.record_id || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[320px] truncate">
                                            {row.detail || "-"}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-[10px] text-slate-400 font-mono">{row.ip_address || "-"}</div>
                                            <div className="text-[10px] text-slate-300">{parseBrowser(row.user_agent)}</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
