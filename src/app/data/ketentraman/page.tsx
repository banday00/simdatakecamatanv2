"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/context";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import Link from "next/link";
import { ChevronLeft, ChevronDown, Shield, Siren, AlertTriangle, Users, Activity, MapPin, Home, Award, TrendingUp, Search, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from "recharts";

/* ============= Shared Types & Constants ============= */
type Kelurahan = { id: string; nama: string };

const CHART_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"];

/* ============= Shared Components ============= */
function StatCard({ label, value, icon: Icon, colorClass, borderClass, subtitle }: { label: string; value: string | number; icon: any; colorClass: string; borderClass?: string; subtitle?: string }) {
    return (
        <div className={`bg-white p-4 rounded-2xl border ${borderClass || 'border-slate-100'} shadow-sm hover:shadow-md transition-all`}>
            <div className={`inline-flex p-2 rounded-xl ${colorClass} mb-3`}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
            <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">{value}</h4>
            {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    );
}

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-2">
            <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors">←</button>
            <span className="text-xs font-medium text-slate-500">{currentPage} / {totalPages}</span>
            <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors">→</button>
        </div>
    );
}

/* ============================================================
   Section 1: Kejadian & Insiden
================================================================ */
function InsidenSection({ incidents, kelurahans, selectedKelurahan }: { incidents: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? incidents.filter(d => d.kelurahan_id === selectedKelurahan) : incidents, [incidents, selectedKelurahan]);

    const totalKejadian = filteredData.length;
    const totalMeninggal = filteredData.reduce((a, c) => a + (c.korban_meninggal || 0), 0);
    const totalLuka = filteredData.reduce((a, c) => a + (c.korban_luka || 0), 0);
    const totalKorban = totalMeninggal + totalLuka;
    const totalPengungsi = filteredData.reduce((a, c) => a + (c.pengungsi || 0), 0);
    const belumSelesai = filteredData.filter(d => d.status === "open" || d.status === "handling").length;

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;
    const sortedData = useMemo(() => [...filteredData].sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime()), [filteredData]);
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [sortedData, currentPage]);

    const typeBarData = useMemo(() => {
        const t: Record<string, number> = {};
        filteredData.forEach(d => { const k = d.jenis_kejadian || d.jenis || "Lainnya"; t[k] = (t[k] || 0) + 1; });
        return Object.entries(t).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const statusPieData = useMemo(() => {
        const labels: Record<string, string> = { open: "Terbuka", handling: "Ditangani", resolved: "Selesai" };
        const colors: Record<string, string> = { open: "#ef4444", handling: "#f59e0b", resolved: "#22c55e" };
        const s: Record<string, number> = {};
        filteredData.forEach(d => { const k = d.status || "resolved"; s[k] = (s[k] || 0) + 1; });
        return Object.entries(s).map(([key, value]) => ({ name: labels[key] || key, value, color: colors[key] || "#94a3b8" }));
    }, [filteredData]);

    const kelBarData = useMemo(() => {
        if (selectedKelurahan) return [];
        const c: Record<string, number> = {};
        filteredData.forEach(d => { const n = kelMap.get(d.kelurahan_id); if (n) c[n] = (c[n] || 0) + 1; });
        return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [filteredData, kelMap, selectedKelurahan]);

    const statusColors: Record<string, string> = { open: "bg-red-100 text-red-700", handling: "bg-amber-100 text-amber-700", resolved: "bg-emerald-100 text-emerald-700" };
    const statusLabels: Record<string, string> = { open: "Terbuka", handling: "Ditangani", resolved: "Selesai" };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Kejadian" value={totalKejadian.toLocaleString("id-ID")} icon={Siren} colorClass="bg-red-50 text-red-600" borderClass="border-red-100" subtitle="Seluruh insiden tercatat" />
                <StatCard label="Total Korban" value={totalKorban.toLocaleString("id-ID")} icon={Users} colorClass="bg-rose-50 text-rose-600" borderClass="border-rose-100" subtitle={`${totalMeninggal.toLocaleString("id-ID")} meninggal · ${totalLuka.toLocaleString("id-ID")} luka`} />
                <StatCard label="Pengungsi" value={totalPengungsi.toLocaleString("id-ID")} icon={Home} colorClass="bg-amber-50 text-amber-600" borderClass="border-amber-100" subtitle="Jiwa terdampak" />
                <StatCard label="Belum Selesai" value={belumSelesai.toLocaleString("id-ID")} icon={Activity} colorClass="bg-orange-50 text-orange-600" borderClass="border-orange-100" subtitle="Terbuka & Ditangani" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Kejadian Berdasarkan Jenis</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} cursor={{ fill: "#f8fafc" }} formatter={(value: number) => [value.toLocaleString("id-ID") + " kejadian", "Jumlah"]} />
                                <Bar dataKey="value" name="Jumlah" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                    {typeBarData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Status Penanganan</h3>
                    <div className="h-72 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {statusPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }} formatter={(value: number) => [value.toLocaleString("id-ID") + " kejadian", ""]} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                            <div className="text-center">
                                <span className="block text-2xl font-black text-slate-800">{totalKejadian}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Kejadian</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!selectedKelurahan && kelBarData.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Kejadian per Kelurahan</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={kelBarData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }} cursor={{ fill: "#f8fafc" }} formatter={(value: number) => [value.toLocaleString("id-ID") + " kejadian", "Jumlah"]} />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800">Riwayat Kejadian Terbaru</h3>
                    <span className="text-xs font-bold text-red-600 px-3 py-1 bg-red-100 rounded-lg">{totalKejadian} Kejadian</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                            <tr>
                                <th className="px-5 py-4">Tanggal</th>
                                <th className="px-5 py-4">Jenis & Lokasi</th>
                                <th className="px-5 py-4">Kelurahan</th>
                                <th className="px-5 py-4">Korban</th>
                                <th className="px-5 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{row.tanggal ? new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800">{row.jenis_kejadian || row.jenis}</div>
                                        <div className="text-xs text-slate-500">{row.lokasi || "-"}</div>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-600 font-medium">{kelMap.get(row.kelurahan_id) || "-"}</td>
                                    <td className="px-5 py-4">
                                        <div className="text-xs space-y-0.5">
                                            {(row.korban_meninggal || 0) > 0 && <span className="text-red-600 font-bold block">☠ {Number(row.korban_meninggal).toLocaleString("id-ID")} Meninggal</span>}
                                            {(row.korban_luka || 0) > 0 && <span className="text-amber-600 block">🤕 {Number(row.korban_luka).toLocaleString("id-ID")} Luka</span>}
                                            {(row.pengungsi || 0) > 0 && <span className="text-blue-600 block">🏠 {Number(row.pengungsi).toLocaleString("id-ID")} Pengungsi</span>}
                                            {!row.korban_meninggal && !row.korban_luka && !row.pengungsi && <span className="text-slate-400">— Tidak ada</span>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${statusColors[row.status] || statusColors.resolved}`}>
                                            {statusLabels[row.status] || "Selesai"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500">Tidak ada data kejadian.</td></tr>}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(sortedData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(sortedData.length, currentPage * ITEMS_PER_PAGE)} dari {sortedData.length}</span>
                            <span className="sm:hidden">{sortedData.length} kejadian</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">←</button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">→</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================
   Section 2: Zona Rawan Bencana
================================================================ */
function BencanaSection({ disasters, kelurahans, selectedKelurahan }: { disasters: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? disasters.filter(d => d.kelurahan_id === selectedKelurahan) : disasters, [disasters, selectedKelurahan]);

    // Normalize tingkat_risiko to title-case (DB stores lowercase)
    const normalizeRisk = (r: string | null | undefined) => { const v = (r || "").toLowerCase(); return v === "tinggi" ? "Tinggi" : v === "sedang" ? "Sedang" : "Rendah"; };

    const totalZona = filteredData.length;
    const risikoTinggi = filteredData.filter(d => normalizeRisk(d.tingkat_risiko) === "Tinggi").length;
    const risikoSedang = filteredData.filter(d => normalizeRisk(d.tingkat_risiko) === "Sedang").length;
    const risikoRendah = filteredData.filter(d => normalizeRisk(d.tingkat_risiko) === "Rendah").length;

    const typePieData = useMemo(() => {
        const t: Record<string, number> = {};
        filteredData.forEach(d => { const k = d.jenis_bencana || "Lainnya"; t[k] = (t[k] || 0) + 1; });
        return Object.entries(t).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const riskPieData = useMemo(() => {
        return [
            { name: "Tinggi", value: risikoTinggi, color: "#ef4444" },
            { name: "Sedang", value: risikoSedang, color: "#f59e0b" },
            { name: "Rendah", value: risikoRendah, color: "#22c55e" },
        ].filter(d => d.value > 0);
    }, [risikoTinggi, risikoSedang, risikoRendah]);

    const kelBarData = useMemo(() => {
        if (selectedKelurahan) return [];
        const c: Record<string, { name: string; Tinggi: number; Sedang: number; Rendah: number }> = {};
        filteredData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id);
            if (!nama) return;
            if (!c[nama]) c[nama] = { name: nama, Tinggi: 0, Sedang: 0, Rendah: 0 };
            const r = normalizeRisk(d.tingkat_risiko);
            if (r === "Tinggi") c[nama].Tinggi++;
            else if (r === "Sedang") c[nama].Sedang++;
            else c[nama].Rendah++;
        });
        return Object.values(c).sort((a, b) => (b.Tinggi * 3 + b.Sedang * 2 + b.Rendah) - (a.Tinggi * 3 + a.Sedang * 2 + a.Rendah)).slice(0, 10);
    }, [filteredData, kelMap, selectedKelurahan]);

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;
    const searchedData = useMemo(() => {
        if (!searchQuery) return filteredData;
        const q = searchQuery.toLowerCase();
        return filteredData.filter(d => (d.jenis_bencana || "").toLowerCase().includes(q) || (d.lokasi || "").toLowerCase().includes(q) || (kelMap.get(d.kelurahan_id) || "").toLowerCase().includes(q));
    }, [filteredData, searchQuery, kelMap]);
    const totalPages = Math.ceil(searchedData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => searchedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [searchedData, currentPage]);

    const riskColors: Record<string, string> = { Tinggi: "bg-red-50 text-red-700 border-red-100", Sedang: "bg-amber-50 text-amber-700 border-amber-100", Rendah: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    const normalizeRiskLabel = (r: string | null | undefined) => normalizeRisk(r);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Zona Rawan" value={totalZona.toLocaleString("id-ID")} icon={MapPin} colorClass="bg-red-50 text-red-600" borderClass="border-red-100" subtitle="Titik rawan teridentifikasi" />
                <StatCard label="Risiko Tinggi" value={risikoTinggi.toLocaleString("id-ID")} icon={AlertTriangle} colorClass="bg-red-50 text-red-600" borderClass="border-red-100" subtitle="Prioritas mitigasi" />
                <StatCard label="Risiko Sedang" value={risikoSedang.toLocaleString("id-ID")} icon={AlertTriangle} colorClass="bg-amber-50 text-amber-600" borderClass="border-amber-100" subtitle="Perlu pengawasan" />
                <StatCard label="Risiko Rendah" value={risikoRendah.toLocaleString("id-ID")} icon={AlertTriangle} colorClass="bg-emerald-50 text-emerald-600" borderClass="border-emerald-100" subtitle="Terkendali" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Jenis Bencana</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {typePieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }} formatter={(value: number) => [value.toLocaleString("id-ID") + " zona", ""]} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Tingkat Risiko</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value">
                                    {riskPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }} formatter={(value: number) => [value.toLocaleString("id-ID") + " zona", ""]} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {!selectedKelurahan && kelBarData.length > 0 && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Sebaran per Kelurahan</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={kelBarData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }} cursor={{ fill: "#f8fafc" }} />
                                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                                    <Bar dataKey="Tinggi" stackId="a" fill="#ef4444" barSize={12} />
                                    <Bar dataKey="Sedang" stackId="a" fill="#f59e0b" barSize={12} />
                                    <Bar dataKey="Rendah" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Direktori Zona Rawan</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Cari zona..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-red-500/20" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
                    </div>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                    {paginatedData.map((item, i) => (
                        <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 hover:border-red-200 hover:shadow-md transition-all group flex flex-col">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${riskColors[normalizeRisk(item.tingkat_risiko)] || riskColors.Rendah}`}>
                                    {normalizeRisk(item.tingkat_risiko)}
                                </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg mb-1">{item.jenis_bencana}</h4>
                            <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
                                <div className="flex items-start gap-2 text-xs text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{item.lokasi || kelMap.get(item.kelurahan_id) || "-"}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                    <span>{kelMap.get(item.kelurahan_id) || "-"}</span>
                                    {item.jumlah_kk_terdampak > 0 && <span className="font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded">{Number(item.jumlah_kk_terdampak).toLocaleString("id-ID")} KK Terdampak</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {paginatedData.length === 0 && <div className="p-8 text-center text-slate-500 bg-slate-50/50">Tidak ada zona rawan yang cocok.</div>}
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(searchedData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(searchedData.length, currentPage * ITEMS_PER_PAGE)} dari {searchedData.length}</span>
                            <span className="sm:hidden">{searchedData.length} zona</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">←</button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">→</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================
   Section 3: Kader Keamanan
================================================================ */
function KaderSection({ cadres, kelurahans, selectedKelurahan }: { cadres: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? cadres.filter(d => d.kelurahan_id === selectedKelurahan) : cadres, [cadres, selectedKelurahan]);

    const totalLinmas = filteredData.reduce((a, c) => a + (c.jumlah_linmas || 0), 0);
    const totalSatgas = filteredData.reduce((a, c) => a + (c.jumlah_satgas || 0), 0);
    const totalPos = filteredData.reduce((a, c) => a + (c.pos_kamling || 0), 0);
    const totalSiskamling = filteredData.reduce((a, c) => a + (c.kegiatan_siskamling || 0), 0);

    const personnelPieData = useMemo(() => {
        const fkdm = filteredData.reduce((a, c) => a + (c.jumlah_fkdm || 0), 0);
        return [
            { name: "Linmas", value: totalLinmas },
            { name: "Satgas", value: totalSatgas },
            { name: "FKDM", value: fkdm },
        ].filter(d => d.value > 0);
    }, [filteredData, totalLinmas, totalSatgas]);

    const kelBarData = useMemo(() => {
        if (selectedKelurahan) return [];
        const c: Record<string, { name: string; Linmas: number; Satgas: number; PosKamling: number }> = {};
        filteredData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id);
            if (!nama) return;
            if (!c[nama]) c[nama] = { name: nama, Linmas: 0, Satgas: 0, PosKamling: 0 };
            c[nama].Linmas += (d.jumlah_linmas || 0);
            c[nama].Satgas += (d.jumlah_satgas || 0);
            c[nama].PosKamling += (d.pos_kamling || 0);
        });
        return Object.values(c).sort((a, b) => (b.Linmas + b.Satgas) - (a.Linmas + a.Satgas)).slice(0, 10);
    }, [filteredData, kelMap, selectedKelurahan]);

    // Aggregate data per kelurahan for the table
    const tableData = useMemo(() => {
        const c: Record<string, { kelurahan: string; linmas: number; satgas: number; pos: number; siskamling: number; fkdm: number; pelatihan: number }> = {};
        filteredData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id) || "-";
            if (!c[d.kelurahan_id]) c[d.kelurahan_id] = { kelurahan: nama, linmas: 0, satgas: 0, pos: 0, siskamling: 0, fkdm: 0, pelatihan: 0 };
            c[d.kelurahan_id].linmas += (d.jumlah_linmas || 0);
            c[d.kelurahan_id].satgas += (d.jumlah_satgas || 0);
            c[d.kelurahan_id].pos += (d.pos_kamling || 0);
            c[d.kelurahan_id].siskamling += (d.kegiatan_siskamling || 0);
            c[d.kelurahan_id].fkdm += (d.jumlah_fkdm || 0);
            c[d.kelurahan_id].pelatihan += (d.pelatihan_dilaksanakan || 0);
        });
        return Object.values(c).sort((a, b) => (b.linmas + b.satgas) - (a.linmas + a.satgas));
    }, [filteredData, kelMap]);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;
    const totalPages = Math.ceil(tableData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => tableData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [tableData, currentPage]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Linmas" value={totalLinmas.toLocaleString("id-ID")} icon={Shield} colorClass="bg-blue-50 text-blue-600" borderClass="border-blue-100" subtitle="Anggota Perlindungan Masyarakat" />
                <StatCard label="Total Satgas" value={totalSatgas.toLocaleString("id-ID")} icon={Users} colorClass="bg-emerald-50 text-emerald-600" borderClass="border-emerald-100" subtitle="Satuan Tugas Keamanan" />
                <StatCard label="Pos Kamling" value={totalPos.toLocaleString("id-ID")} icon={Home} colorClass="bg-amber-50 text-amber-600" borderClass="border-amber-100" subtitle="Unit gardu" />
                <StatCard label="Kegiatan Siskamling" value={totalSiskamling.toLocaleString("id-ID")} icon={Award} colorClass="bg-indigo-50 text-indigo-600" borderClass="border-indigo-100" subtitle="Total kegiatan" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Kekuatan Personel per Kelurahan</h3>
                    {kelBarData.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} angle={-30} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} cursor={{ fill: "#f8fafc" }} formatter={(value: number) => [value.toLocaleString("id-ID"), ""]} />
                                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                    <Bar dataKey="Linmas" fill="#3b82f6" maxBarSize={20} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Satgas" fill="#10b981" maxBarSize={20} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="PosKamling" name="Pos Kamling" fill="#f59e0b" maxBarSize={20} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Pilih semua kelurahan untuk perbandingan</div>}
                </div>
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Komposisi Personel</h3>
                    <div className="h-72 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={personnelPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                                    {personnelPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "12px" }} formatter={(value: number) => [value.toLocaleString("id-ID") + " personel", ""]} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800">{(totalLinmas + totalSatgas + filteredData.reduce((a, c) => a + (c.jumlah_fkdm || 0), 0)).toLocaleString("id-ID")}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Personel</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800">Detail Per Kelurahan</h3>
                    <span className="text-xs font-bold text-blue-600 px-3 py-1 bg-blue-100 rounded-lg">{tableData.length} Kelurahan</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                            <tr>
                                <th className="px-5 py-4">Kelurahan</th>
                                <th className="px-5 py-4">Linmas</th>
                                <th className="px-5 py-4">Satgas</th>
                                <th className="px-5 py-4">FKDM</th>
                                <th className="px-5 py-4">Pos Kamling</th>
                                <th className="px-5 py-4">Siskamling</th>
                                <th className="px-5 py-4">Pelatihan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 font-bold text-slate-800">{row.kelurahan}</td>
                                    <td className="px-5 py-4 text-blue-600 font-medium">{row.linmas.toLocaleString("id-ID")}</td>
                                    <td className="px-5 py-4 text-emerald-600 font-medium">{row.satgas.toLocaleString("id-ID")}</td>
                                    <td className="px-5 py-4 text-purple-600 font-medium">{row.fkdm.toLocaleString("id-ID")}</td>
                                    <td className="px-5 py-4 font-medium">{row.pos.toLocaleString("id-ID")}</td>
                                    <td className="px-5 py-4 font-medium">{row.siskamling.toLocaleString("id-ID")}</td>
                                    <td className="px-5 py-4 font-medium text-indigo-600">{row.pelatihan.toLocaleString("id-ID")}</td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500">Tidak ada data kader.</td></tr>}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(tableData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(tableData.length, currentPage * ITEMS_PER_PAGE)} dari {tableData.length}</span>
                            <span className="sm:hidden">{tableData.length} kelurahan</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">←</button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">→</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================
   Section 4: Analisis & Insight
================================================================ */
function AnalisisSection({ incidents, disasters, cadres, kelurahans, selectedKelurahan }: { incidents: any[]; disasters: any[]; cadres: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);

    const normalizeRisk = (r: string | null | undefined) => (r || "").toLowerCase();

    const radarData = useMemo(() => {
        const kelId = selectedKelurahan || (kelurahans.length > 0 ? (() => {
            const scores: Record<string, number> = {};
            incidents.forEach(d => { scores[d.kelurahan_id] = (scores[d.kelurahan_id] || 0) + 1; });
            disasters.forEach(d => { if (normalizeRisk(d.tingkat_risiko) === "tinggi") scores[d.kelurahan_id] = (scores[d.kelurahan_id] || 0) + 3; });
            return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || kelurahans[0]?.id;
        })() : null);

        if (!kelId) return [];

        const kelIncidents = incidents.filter(d => d.kelurahan_id === kelId).length;
        const kelDisasters = disasters.filter(d => d.kelurahan_id === kelId).length;
        const kelTinggi = disasters.filter(d => d.kelurahan_id === kelId && normalizeRisk(d.tingkat_risiko) === "tinggi").length;
        const kelLinmas = cadres.filter(d => d.kelurahan_id === kelId).reduce((a, c) => a + (c.jumlah_linmas || 0), 0);

        const avgIncidents = incidents.length / Math.max(kelurahans.length, 1);
        const avgDisasters = disasters.length / Math.max(kelurahans.length, 1);
        const avgTinggi = disasters.filter(d => normalizeRisk(d.tingkat_risiko) === "tinggi").length / Math.max(kelurahans.length, 1);
        const avgLinmas = cadres.reduce((a, c) => a + (c.jumlah_linmas || 0), 0) / Math.max(kelurahans.length, 1);

        // Normalisasi: nilai 50 = rata-rata kota, >50 = di atas rata-rata, <50 = di bawah rata-rata
        const norm = (v: number, avg: number) => avg > 0 ? Math.min(100, Math.round((v / avg) * 50)) : 0;

        return [
            { subject: "Kejadian", A: norm(kelIncidents, avgIncidents), B: 50 },
            { subject: "Zona Rawan", A: norm(kelDisasters, avgDisasters), B: 50 },
            { subject: "Risiko Tinggi", A: norm(kelTinggi, avgTinggi), B: 50 },
            { subject: "Personel", A: norm(kelLinmas, avgLinmas), B: 50 },
        ];
    }, [incidents, disasters, cadres, kelurahans, selectedKelurahan]);

    // Indeks Kerentanan Keamanan (IKK) — Weighted Composite Score
    // Bobot: Kejadian (40%) + Zona Rawan (30%) + Risiko Tinggi (30%)
    const leaderboard = useMemo(() => {
        const scores: Record<string, { name: string; incidents: number; disasters: number; tinggi: number; score: number }> = {};
        kelurahans.forEach(k => { scores[k.id] = { name: k.nama, incidents: 0, disasters: 0, tinggi: 0, score: 0 }; });
        incidents.forEach(d => { if (scores[d.kelurahan_id]) scores[d.kelurahan_id].incidents++; });
        disasters.forEach(d => { if (scores[d.kelurahan_id]) { scores[d.kelurahan_id].disasters++; if (normalizeRisk(d.tingkat_risiko) === "tinggi") scores[d.kelurahan_id].tinggi++; } });

        const maxI = Math.max(...Object.values(scores).map(s => s.incidents), 1);
        const maxD = Math.max(...Object.values(scores).map(s => s.disasters), 1);
        const maxT = Math.max(...Object.values(scores).map(s => s.tinggi), 1);

        // IKK = (Kejadian/Max × 40%) + (Zona/Max × 30%) + (Tinggi/Max × 30%)
        Object.values(scores).forEach(s => {
            s.score = Math.round(((s.incidents / maxI) * 40 + (s.disasters / maxD) * 30 + (s.tinggi / maxT) * 30) * 100) / 100;
        });

        return Object.values(scores).sort((a, b) => b.score - a.score).slice(0, 8);
    }, [incidents, disasters, kelurahans]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-2">Pemetaan Kerentanan Keamanan</h3>
                    <p className="text-xs text-slate-500 mb-6">Perbandingan metrik keamanan wilayah vs rata-rata kota. Nilai 50 = rata-rata.</p>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name={selectedKelurahan ? kelMap.get(selectedKelurahan) : "Wilayah Tertinggi"} dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                                <Radar name="Rata-rata Kota" dataKey="B" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                                <Tooltip contentStyle={{ borderRadius: 12, fontSize: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} formatter={(value: number) => [`${value}`, ""]} />
                                <Legend wrapperStyle={{ fontSize: "12px" }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-2">Indeks Kerentanan Keamanan (IKK)</h3>
                    <p className="text-xs text-slate-500 mb-6">Skor komposit tertimbang dari kejadian, zona rawan, dan risiko tinggi.</p>
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2">
                        {leaderboard.map((item, i) => (
                            <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${i === 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-100 hover:bg-slate-50"}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${i === 0 ? "bg-red-500 text-white" : i < 3 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 text-sm truncate">{item.name}</div>
                                    <div className="flex gap-3 text-[11px] text-slate-500 mt-0.5">
                                        <span>Kejadian: <b className="text-red-600">{item.incidents.toLocaleString("id-ID")}</b></span>
                                        <span>Zona: <b className="text-amber-600">{item.disasters.toLocaleString("id-ID")}</b></span>
                                        <span>Tinggi: <b className="text-red-600">{item.tinggi.toLocaleString("id-ID")}</b></span>
                                    </div>
                                </div>
                                <div className={`text-sm font-black ${i === 0 ? "text-red-600" : "text-slate-600"}`}>Skor: {item.score.toFixed(1)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Catatan Metodologi Perhitungan */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                        <Eye className="w-4 h-4" />
                    </div>
                    <div className="space-y-3 text-sm text-slate-600">
                        <h4 className="font-bold text-slate-800 text-base">Catatan Metodologi Perhitungan</h4>

                        <div>
                            <p className="font-semibold text-slate-700 mb-1">1. Radar Kerentanan Keamanan</p>
                            <p className="text-xs leading-relaxed">Setiap dimensi (Kejadian, Zona Rawan, Risiko Tinggi, Personel) dinormalisasi terhadap rata-rata seluruh kelurahan. <strong>Nilai 50</strong> = rata-rata kota, <strong>&gt;50</strong> = di atas rata-rata (lebih rentan/lebih banyak personel), <strong>&lt;50</strong> = di bawah rata-rata. Rumus: <code className="bg-white px-1.5 py-0.5 rounded text-indigo-700 text-[11px]">Skor = min(100, (Nilai Kelurahan / Rata-rata Kota) × 50)</code></p>
                        </div>

                        <div>
                            <p className="font-semibold text-slate-700 mb-1">2. Indeks Kerentanan Keamanan (IKK)</p>
                            <p className="text-xs leading-relaxed">Skor komposit tertimbang yang menggabungkan tiga indikator keamanan. Setiap indikator dinormalisasi ke nilai maksimum antar kelurahan, lalu dikalikan bobot:</p>
                            <ul className="text-xs mt-1 space-y-0.5 ml-4 list-disc">
                                <li><strong>Kejadian (40%)</strong> — Frekuensi insiden keamanan tercatat</li>
                                <li><strong>Zona Rawan (30%)</strong> — Jumlah titik zona rawan bencana</li>
                                <li><strong>Risiko Tinggi (30%)</strong> — Jumlah zona dengan tingkat risiko tinggi</li>
                            </ul>
                            <p className="text-xs mt-1.5">Rumus: <code className="bg-white px-1.5 py-0.5 rounded text-indigo-700 text-[11px]">IKK = (Kejadian/Max × 0.4) + (Zona/Max × 0.3) + (RisikoTinggi/Max × 0.3) × 100</code></p>
                            <p className="text-xs mt-1 text-slate-500">Skor maksimum = 100. Semakin tinggi skor, semakin rentan wilayah tersebut.</p>
                        </div>

                        <div>
                            <p className="font-semibold text-slate-700 mb-1">3. Acuan Regulasi</p>
                            <p className="text-xs leading-relaxed">Klasifikasi risiko mengacu pada <strong>Perka BNPB No. 2 Tahun 2012</strong> tentang Pedoman Umum Pengkajian Risiko Bencana. Kategori Linmas mengacu pada <strong>Permendagri No. 84 Tahun 2014</strong> tentang Penyelenggaraan Perlindungan Masyarakat.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   Main Page Component
================================================================ */
const sections = [
    { id: "insiden", label: "Kejadian & Insiden", icon: Siren },
    { id: "bencana", label: "Zona Rawan Bencana", icon: AlertTriangle },
    { id: "kader", label: "Kader Keamanan", icon: Shield },
    { id: "analisis", label: "Analisis & Insight", icon: TrendingUp },
];



export default function KetentaramanPage() {
    const { tenant, kelurahans } = useTenant();
    const [activeSection, setActiveSection] = useState("insiden");
    const [selectedKelurahan, setSelectedKelurahan] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [incidentData, setIncidentData] = useState<any[]>([]);
    const [disasterData, setDisasterData] = useState<any[]>([]);
    const [cadreData, setCadreData] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            const [{ data: inc, error: e1 }, { data: dis, error: e2 }, { data: cad, error: e3 }] = await Promise.all([
                supabase.from("security_incidents").select("*").eq("tenant_id", tenant.id),
                supabase.from("security_disaster_zones").select("*").eq("tenant_id", tenant.id),
                supabase.from("security_cadres").select("*").eq("tenant_id", tenant.id),
            ]);
            if (e1 || e2 || e3) throw new Error((e1 || e2 || e3)?.message);
            setIncidentData(inc || []);
            setDisasterData(dis || []);
            setCadreData(cad || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (!tenant) return null;

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans">
            <header className="relative overflow-x-clip text-white bg-digital-batik">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />

                <Navbar />

                <div className="relative z-10 px-6 pt-8 pb-32 max-w-7xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm font-medium mb-6 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Beranda
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
                                <Shield className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                    Modul Data
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Ketentraman & Ketertiban</h1>
                                <p className="mt-2 text-lg text-white/70 max-w-2xl leading-relaxed">
                                    Data kejadian insiden, zona rawan bencana, dan kader keamanan di wilayah {tenant.nama}.
                                </p>
                            </div>
                        </div>
                        <div className="w-full md:w-72 relative z-20">
                            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Filter Wilayah</label>
                            <div className="relative">
                                <select className="w-full appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer hover:bg-white/20 transition-all [&>option]:text-slate-800" value={selectedKelurahan} onChange={(e) => setSelectedKelurahan(e.target.value)}>
                                    <option value="ALL">🗺️ Semua Kelurahan</option>
                                    {kelurahans.map(k => (<option key={k.id} value={k.id}>📍 {k.nama}</option>))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-6 max-w-7xl mx-auto -mt-16 relative z-20 pb-16">
                {/* Section Tabs - 2x2 grid on mobile, single row on desktop */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-8">
                    {sections.map((section) => (
                        <button key={section.id} onClick={() => setActiveSection(section.id)}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${
                                activeSection === section.id
                                    ? section.id === "analisis" ? "bg-slate-800 text-white shadow-md border-slate-700 ring-1 ring-slate-900/10" : "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10"
                                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}>
                            <section.icon className={`w-4 h-4 flex-shrink-0 ${activeSection === section.id ? "" : "opacity-50"}`} />
                            <span className="leading-tight">{section.label}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6 shadow-lg"></div>
                        <p className="text-slate-500 font-medium animate-pulse">Memuat data Ketentraman & Ketertiban...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl text-center max-w-2xl mx-auto shadow-sm">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold mb-2">Gagal Memuat Data</h3>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="animate-fade-in transition-all duration-500">
                        {activeSection === "insiden" && <InsidenSection incidents={incidentData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                        {activeSection === "bencana" && <BencanaSection disasters={disasterData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                        {activeSection === "kader" && <KaderSection cadres={cadreData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                        {activeSection === "analisis" && <AnalisisSection incidents={incidentData} disasters={disasterData} cadres={cadreData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
