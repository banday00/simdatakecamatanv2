"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/context";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
    Activity,
    LogIn,
    LogOut,
    Database,
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    Calendar,
    RefreshCw,
} from "lucide-react";

type LogRow = {
    id: string;
    tenant_id: string;
    user_id: string | null;
    user_email: string | null;
    user_name: string | null;
    action: string;
    module: string | null;
    record_table: string | null;
    record_id: string | null;
    detail: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
};

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    login:  { label: "Login",  color: "text-blue-700",    bg: "bg-blue-100",    icon: "🔑" },
    logout: { label: "Logout", color: "text-slate-700",   bg: "bg-slate-100",   icon: "🚪" },
    create: { label: "Tambah", color: "text-emerald-700", bg: "bg-emerald-100", icon: "➕" },
    update: { label: "Edit",   color: "text-amber-700",   bg: "bg-amber-100",   icon: "✏️" },
    delete: { label: "Hapus",  color: "text-red-700",     bg: "bg-red-100",     icon: "🗑️" },
};

const PAGE_SIZE = 20;

export default function LogAktivitasPage() {
    const { tenant } = useTenant();
    const [supabase] = useState(() => createClient());
    const [data, setData] = useState<LogRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);

    // Filters
    const [filterAction, setFilterAction] = useState<string>("");
    const [filterSearch, setFilterSearch] = useState("");
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [filterDateFrom, setFilterDateFrom] = useState(today);
    const [filterDateTo, setFilterDateTo] = useState(today);

    const fetchLogs = useCallback(async () => {
        if (!tenant?.id) return;
        setIsLoading(true);
        try {
            let query = supabase
                .schema("sidakota")
                .from("activity_logs")
                .select("*", { count: "exact" })
                .eq("tenant_id", tenant.id)
                .order("created_at", { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (filterAction) query = query.eq("action", filterAction);
            if (filterDateFrom) query = query.gte("created_at", filterDateFrom + "T00:00:00");
            if (filterDateTo) query = query.lte("created_at", filterDateTo + "T23:59:59");
            if (filterSearch) {
                query = query.or(
                    `user_name.ilike.%${filterSearch}%,user_email.ilike.%${filterSearch}%,detail.ilike.%${filterSearch}%,module.ilike.%${filterSearch}%`
                );
            }

            const { data: rows, count, error } = await query;
            if (error) throw error;
            setData((rows as LogRow[]) || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error("[LogAktivitas] fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.id, supabase, page, filterAction, filterSearch, filterDateFrom, filterDateTo]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Stats (from fetched first page — lightweight)
    const [stats, setStats] = useState({ total: 0, login: 0, crud: 0, uniqueUsers: 0 });
    useEffect(() => {
        if (!tenant?.id) return;
        async function loadStats() {
            const sid = supabase.schema("sidakota");
            const [totalRes, loginRes, crudRes] = await Promise.all([
                sid.from("activity_logs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant!.id),
                sid.from("activity_logs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant!.id).eq("action", "login"),
                sid.from("activity_logs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant!.id).in("action", ["create", "update", "delete"]),
            ]);
            // Unique users — fetch distinct user_id
            const { data: userRows } = await sid.from("activity_logs").select("user_id").eq("tenant_id", tenant!.id).not("user_id", "is", null);
            const uniqueUsers = new Set(userRows?.map((r: any) => r.user_id)).size;

            setStats({
                total: totalRes.count || 0,
                login: loginRes.count || 0,
                crud: crudRes.count || 0,
                uniqueUsers,
            });
        }
        loadStats();
    }, [tenant?.id, supabase]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    function formatDate(iso: string) {
        const d = new Date(iso);
        return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
            " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }

    function formatModule(mod: string | null) {
        if (!mod) return "—";
        // Convert table names like 'health_facilities' → 'Health Facilities'
        return mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function parseUserAgent(ua: string | null): string {
        if (!ua) return "—";
        // Simple parser: extract browser name
        if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
        if (ua.includes("Edg")) return "Edge";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
        return "Browser";
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Log Aktivitas"
                description="Catatan semua aktivitas pengguna di dalam sistem"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Log Aktivitas" },
                ]}
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Aktivitas" value={stats.total} icon={Activity} gradient="stat-gradient-blue" />
                <StatCard label="Login" value={stats.login} icon={LogIn} gradient="stat-gradient-emerald" />
                <StatCard label="Operasi Data" value={stats.crud} icon={Database} gradient="stat-gradient-amber" />
                <StatCard label="Pengguna Aktif" value={stats.uniqueUsers} icon={Users} gradient="stat-gradient-rose" />
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama, email, modul..."
                            value={filterSearch}
                            onChange={(e) => { setFilterSearch(e.target.value); setPage(0); }}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Action Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            value={filterAction}
                            onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
                            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[140px]"
                        >
                            <option value="">Semua Aksi</option>
                            <option value="login">Login</option>
                            <option value="logout">Logout</option>
                            <option value="create">Tambah</option>
                            <option value="update">Edit</option>
                            <option value="delete">Hapus</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }}
                            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="text-xs text-slate-400">—</span>
                        <input
                            type="date"
                            value={filterDateTo}
                            onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }}
                            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => { fetchLogs(); }}
                        className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Pengguna</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Modul</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Detail</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">IP / Browser</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <RefreshCw className="w-6 h-6 text-slate-300 animate-spin mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">Memuat data...</p>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400 font-medium">Belum ada aktivitas tercatat</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row) => {
                                    const cfg = ACTION_CONFIG[row.action] || { label: row.action, color: "text-gray-700", bg: "bg-gray-100", icon: "📋" };
                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                                                {formatDate(row.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                        {(row.user_name || row.user_email || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate max-w-[160px]">
                                                            {row.user_name || "—"}
                                                        </p>
                                                        {row.user_email && (
                                                            <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{row.user_email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                                                    <span>{cfg.icon}</span> {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                {formatModule(row.module)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 max-w-[250px] truncate">
                                                {row.detail || "—"}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {row.ip_address || "—"}
                                                </div>
                                                <div className="text-[10px] text-slate-300">
                                                    {parseUserAgent(row.user_agent)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            Menampilkan {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} dari {totalCount} aktivitas
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-slate-600 bg-white rounded-lg border border-slate-200">
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                disabled={page >= totalPages - 1}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
