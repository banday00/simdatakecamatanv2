"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import type { Kelurahan } from "@/types";
import {
    MapPin, ChevronLeft, Heart, Search, Filter,
    Activity, ArrowUpDown, ChevronDown, ChevronUp,
    Stethoscope, Baby, ActivitySquare, Scale
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    LineChart, Line, AreaChart, Area, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

/* ============================================================
   Constants & Utilities
============================================================ */
const CHART_COLORS = [
    "#4f46e5", "#3b82f6", "#d946ef", "#8b5cf6",
    "#6366f1", "#06b6d4", "#10b981", "#eab308",
];

const KELURAHAN_ICONS = ["🏘️", "🏠", "🏡", "🏢", "🏫", "🏛️", "🏗️", "🏟️"];

function computeStats(values: number[]) {
    if (values.length === 0) return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, range: 0, count: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median = count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
    const stdDev = Math.sqrt(variance);
    return { mean: Math.round(mean * 10) / 10, median, stdDev: Math.round(stdDev * 10) / 10, min: sorted[0], max: sorted[count - 1], range: sorted[count - 1] - sorted[0], count };
}

/* ============================================================
   Types
============================================================ */
type HealthStatsData = {
    facilities: Record<string, unknown>[];
    stunting: Record<string, unknown>[];
    posyandu: Record<string, unknown>[];
    maternal: Record<string, unknown>[];
};

/* ============================================================
   Section 1: Fasilitas Kesehatan
============================================================ */
function FasilitasSection({ data, kelurahans, selectedKelurahan }: { data: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const [searchQuery, setSearchQuery] = useState("");

    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach(k => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    const filteredData = useMemo(() => {
        let result = data;
        if (selectedKelurahan) {
            result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d =>
                (d.nama || "").toLowerCase().includes(q) ||
                (d.jenis_nama || "").toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => a.nama.localeCompare(b.nama));
    }, [data, selectedKelurahan, searchQuery]);

    const kelBarData = useMemo(() => {
        const counts: Record<string, number> = {};
        kelurahans.forEach(k => counts[k.nama] = 0);
        data.forEach(d => {
            const name = kelMap.get(d.kelurahan_id) || "Lainnya";
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([nama, jumlah]) => ({ nama, jumlah }))
            .sort((a, b) => b.jumlah - a.jumlah);
    }, [data, kelMap, kelurahans]);

    const typePieData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach(d => counts[d.jenis_nama || "Lainnya"] = (counts[d.jenis_nama || "Lainnya"] || 0) + 1);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const faskesTypes: Record<string, { icon: string; badge: string; gradient: string }> = {
        "Puskesmas":      { icon: "🏥", badge: "bg-slate-100 text-slate-700 border-slate-200", gradient: "from-slate-700 to-slate-800" },
        "Rumah Sakit":    { icon: "🏨", badge: "bg-slate-100 text-slate-700 border-slate-200", gradient: "from-slate-700 to-slate-800" },
        "Klinik":         { icon: "⚕️", badge: "bg-slate-100 text-slate-700 border-slate-200", gradient: "from-slate-700 to-slate-800" },
        "Apotek":         { icon: "💊", badge: "bg-slate-100 text-slate-700 border-slate-200", gradient: "from-slate-700 to-slate-800" },
        "Praktek Dokter": { icon: "👨‍⚕️", badge: "bg-slate-100 text-slate-700 border-slate-200", gradient: "from-slate-700 to-slate-800" },
    };
    const DEFAULT_FASKES = { icon: "🏥", badge: "bg-slate-100 text-slate-700 border-slate-200", gradient: "from-slate-700 to-slate-800" };

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [filteredData, currentPage]);

    // Reset page on filter change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedKelurahan]);

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Fasilitas Kesehatan</h2>
                    <p className="text-slate-500 text-sm">Distribusi dan persebaran puskesmas, klinik, dan layanan kesehatan</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                <div className="md:col-span-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-800">Distribusi per Wilayah</h3>
                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg">{kelurahans.length} Kelurahan</span>
                    </div>
                    <div className="flex-1 min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                    dataKey="nama" 
                                    tick={{ fontSize: 10, fill: "#64748b" }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10} 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={60} 
                                />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }} cursor={{ fill: "#f8fafc" }} />
                                <Bar dataKey="jumlah" name="Jumlah Faskes" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="md:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 self-start mb-6">Komposisi Jenis</h3>
                    <div className="w-full h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                                    {typePieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-800">{filteredData.length}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                        </div>
                    </div>
                    <div className="w-full mt-2 space-y-2">
                        {typePieData.map((d, i) => (
                            <div key={d.name} className="flex justify-between items-center text-xs">
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></span> {d.name}</span>
                                <span className="font-bold">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-800">Daftar Fasilitas Kesehatan</h3>
                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg">{filteredData.length} Fasilitas</span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari fasilitas..."
                            className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm w-full md:w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-left">
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Fasilitas</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jenis</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kelurahan</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Alamat</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Nakes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedData.map((row, idx) => {
                                const cfg = faskesTypes[row.jenis_nama] ?? DEFAULT_FASKES;
                                const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                                return (
                                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors group">
                                        <td className="px-5 py-3.5 text-xs text-slate-400 font-mono tabular-nums">{rowNum}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="font-semibold text-slate-800 text-sm leading-tight">{row.nama}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${cfg.badge}`}>
                                                {row.jenis_nama || "Faskes"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-xs text-slate-600 flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                {kelMap.get(row.kelurahan_id) || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 hidden md:table-cell">
                                            <span className="text-xs text-slate-500 line-clamp-1">{row.alamat || "—"}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {row.jumlah_tenaga_medis > 0 ? (
                                                <span className="inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 tabular-nums">
                                                    {row.jumlah_tenaga_medis}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredData.length === 0 && (
                    <div className="py-12 text-center text-slate-400">
                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium">Tidak ada fasilitas ditemukan</p>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs text-slate-500 text-center sm:text-left">
                            Halaman <span className="font-bold text-slate-700">{currentPage}</span> dari <span className="font-bold text-slate-700">{totalPages}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                ←
                            </button>
                            {/* Page number buttons — hidden on mobile */}
                            <div className="hidden sm:flex items-center gap-1">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let page: number;
                                    if (totalPages <= 5) page = i + 1;
                                    else if (currentPage <= 3) page = i + 1;
                                    else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                                    else page = currentPage - 2 + i;
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${currentPage === page ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Mobile: show current/total badge */}
                            <span className="sm:hidden px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ============================================================
   Section 2: Stunting (BNBA Agregat View)
============================================================ */
function StuntingSection({ data, kelurahans, selectedKelurahan }: { data: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach(k => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    const BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelurahan, searchQuery]);

    // Each row dari view mewakili (kelurahan × tahun × bulan)
    const filteredTableData = useMemo(() => {
        return data.filter(s => {
            if (selectedKelurahan && s.kelurahan_id !== selectedKelurahan) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const kelName = kelMap.get(s.kelurahan_id)?.toLowerCase() || "";
                return (s.tahun?.toString().includes(q)) || (kelName.includes(q));
            }
            return true;
        }).sort((a, b) => b.tahun - a.tahun || (b.bulan || 0) - (a.bulan || 0) || a.kelurahan_id.localeCompare(b.kelurahan_id));
    }, [data, selectedKelurahan, searchQuery, kelMap]);

    const totalPages = Math.ceil(filteredTableData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTableData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTableData, currentPage]);

    // -------------------------------------------------------
    // METODOLOGI: Data E-PPGBM dicatat per bulan per kelurahan.
    // Untuk menghindari double-counting balita, kita ambil
    // snapshot BULAN TERBARU dari setiap tahun per kelurahan.
    // Ini adalah pendekatan point-in-time yang sesuai kaidah
    // epidemiologi untuk menghitung prevalensi stunting.
    // -------------------------------------------------------

    // Ambil data sesuai filter kelurahan
    const selectedData = useMemo(() => {
        if (selectedKelurahan) return data.filter(d => d.kelurahan_id === selectedKelurahan);
        return data;
    }, [data, selectedKelurahan]);

    // Tahun terbaru dari seluruh dataset
    const latestYear = useMemo(() =>
        data.length > 0 ? Math.max(...data.map(d => Number(d.tahun))) : new Date().getFullYear()
    , [data]);

    // Helper: dari array rows, ambil satu snapshot per kelurahan (bulan terbaru)
    function getLatestMonthSnapshot(rows: any[]): any[] {
        const byKel: Record<string, any> = {};
        rows.forEach(d => {
            const key = d.kelurahan_id;
            if (!byKel[key] || (Number(d.bulan) || 0) > (Number(byKel[key].bulan) || 0)) {
                byKel[key] = d;
            }
        });
        return Object.values(byKel);
    }

    // Tren tahunan: per tahun ambil snapshot bulan terbaru → sum lintas kelurahan
    const trendData = useMemo(() => {
        const years = [...new Set(selectedData.map(d => Number(d.tahun)))].sort((a, b) => a - b);
        return years.map(tahun => {
            const yearRows = selectedData.filter(d => Number(d.tahun) === tahun);
            const snapshot = getLatestMonthSnapshot(yearRows);
            const total_balita  = snapshot.reduce((s, d) => s + (Number(d.balita_total) || 0), 0);
            const total_stunting = snapshot.reduce((s, d) => s + (Number(d.balita_stunting) || 0), 0);
            const gizi_buruk    = snapshot.reduce((s, d) => s + (Number(d.balita_gizi_buruk) || 0), 0);
            const gizi_kurang   = snapshot.reduce((s, d) => s + (Number(d.balita_gizi_kurang) || 0), 0);
            const prevalensi    = total_balita > 0 ? Number(((total_stunting / total_balita) * 100).toFixed(1)) : 0;
            return { tahun, total_balita, total_stunting, gizi_buruk, gizi_kurang, prevalensi };
        });
    }, [selectedData]);

    // KPI dari tahun terbaru
    const latestAgg  = trendData[trendData.length - 1] ?? { tahun: latestYear, total_balita: 0, total_stunting: 0, gizi_buruk: 0, gizi_kurang: 0, prevalensi: 0 };
    const prevAgg    = trendData[trendData.length - 2] ?? latestAgg;

    // Threshold prevalensi stunting nasional (Perpres 72/2021: target <14% pada 2024)
    const prevalensiNum = Number(latestAgg.prevalensi);
    const prevalensiBadge =
        prevalensiNum >= 30 ? { label: "Sangat Tinggi", cls: "bg-red-100 text-red-700 border-red-200" }
      : prevalensiNum >= 20 ? { label: "Tinggi",        cls: "bg-orange-100 text-orange-700 border-orange-200" }
      : prevalensiNum >= 14 ? { label: "Di atas target", cls: "bg-amber-100 text-amber-700 border-amber-200" }
      :                       { label: "Sesuai target",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };

    // Sebaran kelurahan: snapshot bulan terbaru dari tahun terbaru
    const kelBarData = useMemo(() => {
        const yearRows = data.filter(d => Number(d.tahun) === latestYear);
        const snapshot = getLatestMonthSnapshot(yearRows);
        return snapshot.map(d => ({
            nama:      kelMap.get(d.kelurahan_id) || "—",
            stunting:  Number(d.balita_stunting) || 0,
            total:     Number(d.balita_total) || 0,
            prevalensi: Number(d.balita_total) > 0
                ? Number(((Number(d.balita_stunting) / Number(d.balita_total)) * 100).toFixed(1))
                : 0,
        })).sort((a, b) => b.prevalensi - a.prevalensi);
    }, [data, latestYear, kelMap]);

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                    <Scale className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Kasus Stunting & Gizi</h2>
                    <p className="text-slate-500 text-sm">Pemantauan prevalensi stunting, gizi buruk, dan gizi kurang pada balita berdasarkan data E-PPGBM (BNBA) — snapshot bulan terbaru per tahun</p>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Prevalensi card */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between bg-gradient-to-br from-amber-50 to-orange-50">
                    <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <ActivitySquare className="w-3 h-3" /> Prevalensi {latestYear}
                        </p>
                        <div className="flex items-end gap-1 mb-1.5">
                            <span className="text-3xl font-black text-slate-800">{latestAgg.prevalensi}</span>
                            <span className="text-base font-bold text-slate-500 mb-0.5">%</span>
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${prevalensiBadge.cls}`}>
                            {prevalensiBadge.label}
                        </span>
                    </div>
                    {trendData.length > 1 && (
                        <p className={`text-[10px] font-bold flex items-center gap-0.5 mt-2 ${Number(latestAgg.prevalensi) < Number(prevAgg.prevalensi) ? 'text-emerald-600' : 'text-red-500'}`}>
                            {Number(latestAgg.prevalensi) < Number(prevAgg.prevalensi) ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                            {Math.abs(Number(latestAgg.prevalensi) - Number(prevAgg.prevalensi)).toFixed(1)}% vs tahun lalu
                        </p>
                    )}
                </div>
                {/* Other KPIs */}
                {[
                    { label: "Balita Terdata",      value: latestAgg.total_balita,  icon: "👶", sub: `Data ${latestYear}` },
                    { label: "Kasus Stunting",       value: latestAgg.total_stunting, icon: "📏", sub: "Target <14%" },
                    { label: "Gizi Buruk & Kurang",  value: (latestAgg.gizi_buruk || 0) + (latestAgg.gizi_kurang || 0), icon: "🩺", sub: "Perlu intervensi" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <span className="text-base mb-1">{stat.icon}</span>
                        <div>
                            <span className="text-xl font-black text-slate-800 block">{Number(stat.value).toLocaleString("id-ID")}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block leading-tight">{stat.label}</span>
                            <span className="text-[10px] text-slate-400">{stat.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-1">Tren Stunting Tahunan</h3>
                    <p className="text-xs text-slate-400 mb-6">Snapshot bulan terbaru per tahun — angka tidak akumulatif</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#4f46e5" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Line yAxisId="left" type="monotone" dataKey="total_stunting" name="Jml Kasus" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="prevalensi" name="Prevalensi (%)" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {!selectedKelurahan && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-6">Sebaran per Kelurahan ({latestYear})</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis 
                                        dataKey="nama" 
                                        tick={{ fontSize: 10, fill: "#64748b" }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        dy={10} 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={60} 
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="stunting" name="Balita Stunting" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                        {kelBarData.map((d, i) => (
                                            <Cell key={i} fill={d.prevalensi > 10 ? "#ef4444" : "#fbbf24"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Table from BNBA Agregat View */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Rekap Data Stunting (BNBA)</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Sumber: E-PPGBM — Data By Name By Address</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari kelurahan, tahun..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold">Wilayah</th>
                                <th className="px-6 py-4 font-bold text-center">Tahun</th>
                                <th className="px-6 py-4 font-bold text-center">Bulan</th>
                                <th className="px-6 py-4 font-bold text-right">Total Balita</th>
                                <th className="px-6 py-4 font-bold text-right">Stunting</th>
                                <th className="px-6 py-4 font-bold text-right">Gizi Buruk & Kurang</th>
                                <th className="px-6 py-4 font-bold text-right">Prevalensi (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, i) => {
                                const total = Number(row.balita_total) || 0;
                                const stunting = Number(row.balita_stunting) || 0;
                                const prevalensi = total > 0 ? ((stunting / total) * 100).toFixed(1) : "0.0";
                                const isHigh = Number(prevalensi) > 10;
                                const bulanNama = row.bulan ? BULAN_NAMES[Number(row.bulan) - 1] : "-";
                                return (
                                    <tr key={`${row.kelurahan_id}-${row.tahun}-${row.bulan || i}`} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-indigo-500" />
                                                <span className="font-semibold text-slate-700">{kelMap.get(row.kelurahan_id) || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">{row.tahun}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono text-slate-500 text-xs">{bulanNama}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-600">
                                            {total.toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-red-500">
                                            {stunting.toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-amber-500">
                                            {((Number(row.balita_gizi_buruk) || 0) + (Number(row.balita_gizi_kurang) || 0)).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg border ${isHigh ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                {prevalensi}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTableData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm">Data tidak ditemukan</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Menampilkan {Math.min(filteredTableData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredTableData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredTableData.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">Sebelumnya</button>
                            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">Selanjutnya</button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ============================================================
   Section 3: Posyandu
============================================================ */
function PosyanduSection({ data, kelurahans, selectedKelurahan }: { data: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach(k => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    const selectedData = useMemo(() => {
        let result = data;
        if (selectedKelurahan) {
            result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        }
        return result.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
    }, [data, selectedKelurahan]);

    const totalKader = selectedData.reduce((acc, curr) => acc + (curr.jumlah_kader || 0), 0);
    const totalBalita = selectedData.reduce((acc, curr) => acc + (curr.jumlah_balita || 0), 0);
    const totalLansia = selectedData.reduce((acc, curr) => acc + (curr.jumlah_lansia || 0), 0);
    const totalIbuHamil = selectedData.reduce((acc, curr) => acc + (curr.jumlah_ibu_hamil || 0), 0);
    const posyanduAktif = selectedData.filter(d => {
        const cakupans = [d.cakupan_gizi || 0, d.cakupan_kia || 0, d.cakupan_kb || 0, d.cakupan_imunisasi || 0];
        return cakupans.filter(c => c >= 50).length >= 3 && (d.frekuensi_kegiatan || 0) >= 8;
    }).length;

    const strataData = useMemo(() => {
        const counts: Record<string, number> = {};
        selectedData.forEach(d => {
            const strata = d.strata || "Pratama";
            counts[strata] = (counts[strata] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [selectedData]);

    const STRATA_CONFIG: Record<string, { badge: string; gradient: string; icon: string; barColor: string }> = {
        "Mandiri":  { badge: "bg-blue-100 text-blue-700 border-blue-200", gradient: "from-blue-500 to-indigo-600", icon: "⭐", barColor: "bg-blue-500" },
        "Purnama":  { badge: "bg-blue-100 text-blue-700 border-blue-200", gradient: "from-blue-500 to-indigo-600", icon: "🌕", barColor: "bg-blue-500" },
        "Madya":    { badge: "bg-blue-100 text-blue-700 border-blue-200", gradient: "from-blue-500 to-indigo-600", icon: "🌗", barColor: "bg-blue-500" },
        "Pratama":  { badge: "bg-blue-100 text-blue-700 border-blue-200", gradient: "from-blue-500 to-indigo-600", icon: "🌑", barColor: "bg-blue-500" },
    };

    const [posPage, setPosPage] = useState(1);
    const POS_PER_PAGE = 10;
    const posTotalPages = Math.ceil(selectedData.length / POS_PER_PAGE);
    const posPaginated = useMemo(() => selectedData.slice((posPage - 1) * POS_PER_PAGE, posPage * POS_PER_PAGE), [selectedData, posPage]);

    useEffect(() => { setPosPage(1); }, [selectedKelurahan]);

    // Mini cakupan bar helper
    function CakupanBar({ label, value, barColor }: { label: string; value: number; barColor: string }) {
        const isGood = value >= 50;
        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500">{label}</span>
                    <span className={`text-[10px] font-bold tabular-nums ${isGood ? 'text-emerald-600' : 'text-amber-500'}`}>{value}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isGood ? barColor : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(value, 100)}%` }}
                    />
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <Heart className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Posyandu & Layanan Dasar</h2>
                    <p className="text-slate-500 text-sm">Distribusi posyandu, kepengurusan, dan cakupan layanan standar nasional SIP</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: "Total Posyandu", value: selectedData.length, icon: "🏕️", color: "text-indigo-600" },
                    { label: "Posyandu Aktif", value: posyanduAktif, icon: "✅", color: "text-emerald-600" },
                    { label: "Kader Aktif", value: totalKader, icon: "👩‍⚕️", color: "text-indigo-600" },
                    { label: "Sasaran Balita", value: totalBalita, icon: "👶", color: "text-blue-600" },
                    { label: "Sasaran Lansia", value: totalLansia, icon: "👵", color: "text-emerald-600" },
                    { label: "Ibu Hamil", value: totalIbuHamil, icon: "🤰", color: "text-blue-600" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center transform transition-transform hover:-translate-y-1">
                        <div className="text-xl mb-1">{stat.icon}</div>
                        <span className={`text-2xl font-black ${stat.color} block leading-none mb-1`}>{stat.value.toLocaleString("id-ID")}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 items-start">
                <div className="md:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800">Daftar Posyandu</h3>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{selectedData.length} Posyandu</span>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {posPaginated.map(row => {
                            const cakupans = [
                                { label: "Gizi", val: Number(row.cakupan_gizi) || 0 },
                                { label: "KIA", val: Number(row.cakupan_kia) || 0 },
                                { label: "KB", val: Number(row.cakupan_kb) || 0 },
                                { label: "Imunisasi", val: Number(row.cakupan_imunisasi) || 0 },
                            ];
                            const above50 = cakupans.filter(c => c.val >= 50).length;
                            const isActive = above50 >= 3 && (row.frekuensi_kegiatan || 0) >= 8;
                            const kaderArr = Array.isArray(row.anggota_kader) ? row.anggota_kader : [];

                            const strata = row.strata || "Pratama";
                            const cfg = STRATA_CONFIG[strata] ?? STRATA_CONFIG["Pratama"];

                            return (
                                <div key={row.id} className="rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group bg-white">
                                    {/* Gradient Header */}
                                    <div className={`bg-gradient-to-r ${cfg.gradient} px-4 pt-4 pb-5 relative overflow-hidden`}>
                                        <div className="absolute -right-3 -top-3 text-5xl opacity-20 group-hover:opacity-30 transition-opacity select-none">
                                            {cfg.icon}
                                        </div>
                                        <div className="flex items-start justify-between gap-2 relative">
                                            <h4 className="font-bold text-white text-sm leading-tight drop-shadow-sm">{row.nama}</h4>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isActive && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/25 text-white border border-white/40 backdrop-blur-sm">AKTIF</span>
                                                )}
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${cfg.badge}`}>
                                                    {strata}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Location under name */}
                                        <p className="text-[11px] text-white/80 flex items-center gap-1 mt-1.5 relative">
                                            <MapPin className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{row.alamat || kelMap.get(row.kelurahan_id) || "—"}</span>
                                        </p>
                                        {row.rt_rw && (
                                            <p className="text-[10px] text-white/60 mt-0.5 pl-4 relative">RT/RW: {row.rt_rw} · {kelMap.get(row.kelurahan_id) || ""}</p>
                                        )}
                                    </div>

                                    {/* White body */}
                                    <div className="px-4 pt-3 pb-4 space-y-3 -mt-1 bg-white rounded-t-2xl relative z-10">
                                        {/* Ketua */}
                                        {row.ketua && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">👩‍⚕️</span>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ketua Kader</p>
                                                    <p className="text-xs font-semibold text-slate-700 leading-tight">{row.ketua}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Stats chips */}
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {[
                                                { label: "Kader",    value: row.jumlah_kader || 0,            icon: "👥" },
                                                { label: "Balita",   value: row.jumlah_balita || 0,           icon: "👶" },
                                                { label: "Lansia",   value: row.jumlah_lansia || 0,           icon: "👴" },
                                                { label: "Kegiatan", value: `${row.frekuensi_kegiatan || 0}×`, icon: "📅" },
                                            ].map(s => (
                                                <div key={s.label} className="flex flex-col items-center bg-slate-50 rounded-xl py-2 border border-slate-100">
                                                    <span className="text-xs mb-0.5">{s.icon}</span>
                                                    <p className="text-xs font-black text-slate-800 tabular-nums">{s.value}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">{s.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Cakupan bars */}
                                        {cakupans.some(c => c.val > 0) && (
                                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cakupan Layanan</p>
                                                {cakupans.map(c => (
                                                    <CakupanBar key={c.label} label={c.label} value={c.val} barColor={cfg.barColor} />
                                                ))}
                                            </div>
                                        )}

                                        {/* Kader names */}
                                        {kaderArr.length > 0 && (
                                            <details className="pt-2 border-t border-slate-100">
                                                <summary className="text-[10px] font-bold text-indigo-600 cursor-pointer hover:text-indigo-700 select-none">
                                                    👥 {kaderArr.length} Anggota Kader
                                                </summary>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {kaderArr.map((name: string, idx: number) => (
                                                        <span key={idx} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium border border-indigo-100">{name}</span>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {posTotalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                            <span className="text-xs text-slate-500 text-center sm:text-left">
                                Hal <span className="font-bold text-slate-700">{posPage}</span> / <span className="font-bold text-slate-700">{posTotalPages}</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPosPage(p => Math.max(1, p - 1))}
                                    disabled={posPage === 1}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ←
                                </button>
                                {/* Page number buttons — hidden on mobile */}
                                <div className="hidden sm:flex items-center gap-1">
                                    {Array.from({ length: Math.min(posTotalPages, 5) }, (_, i) => {
                                        let page: number;
                                        if (posTotalPages <= 5) page = i + 1;
                                        else if (posPage <= 3) page = i + 1;
                                        else if (posPage >= posTotalPages - 2) page = posTotalPages - 4 + i;
                                        else page = posPage - 2 + i;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setPosPage(page)}
                                                className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${posPage === page ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Mobile: compact badge */}
                                <span className="sm:hidden px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                                    {posPage} / {posTotalPages}
                                </span>
                                <button
                                    onClick={() => setPosPage(p => Math.min(posTotalPages, p + 1))}
                                    disabled={posPage === posTotalPages}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="md:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Status Strata Posyandu</h3>
                    <div className="w-full h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={strataData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                                    {strataData.map((d, i) => {
                                        const colors = { "Mandiri": "#10b981", "Purnama": "#3b82f6", "Madya": "#f59e0b", "Pratama": "#4f46e5" };
                                        return <Cell key={i} fill={colors[d.name as keyof typeof colors] || CHART_COLORS[i % CHART_COLORS.length]} />
                                    })}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Posyandu Aktif summary */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-xs font-bold text-slate-700 mb-2">Kriteria Posyandu Aktif (SIP)</p>
                        <div className="space-y-1.5 text-[11px] text-slate-600">
                            <div className="flex justify-between">
                                <span>Kegiatan ≥ 8×/tahun</span>
                                <span className="font-bold">{selectedData.filter(d => (d.frekuensi_kegiatan || 0) >= 8).length}/{selectedData.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Kader ≥ 5 orang</span>
                                <span className="font-bold">{selectedData.filter(d => (d.jumlah_kader || 0) >= 5).length}/{selectedData.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>3/4 cakupan ≥ 50%</span>
                                <span className="font-bold">{selectedData.filter(d => {
                                    const c = [d.cakupan_gizi || 0, d.cakupan_kia || 0, d.cakupan_kb || 0, d.cakupan_imunisasi || 0];
                                    return c.filter(v => v >= 50).length >= 3;
                                }).length}/{selectedData.length}</span>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">Status Aktif</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${posyanduAktif > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {posyanduAktif}/{selectedData.length} Posyandu
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ============================================================
   Section 4: Ibu & Anak (Maternal)
============================================================ */
function MaternalSection({ data, kelurahans, selectedKelurahan }: { data: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach(k => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelurahan, searchQuery]);

    const filteredTableData = useMemo(() => {
        return data.filter(s => {
            if (selectedKelurahan && s.kelurahan_id !== selectedKelurahan) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const kelName = kelMap.get(s.kelurahan_id)?.toLowerCase() || "";
                return (s.tahun?.toString().includes(q)) || (kelName.includes(q));
            }
            return true;
        }).sort((a,b) => b.tahun - a.tahun || a.kelurahan_id.localeCompare(b.kelurahan_id));
    }, [data, selectedKelurahan, searchQuery, kelMap]);

    const totalPages = Math.ceil(filteredTableData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTableData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTableData, currentPage]);

    const selectedData = useMemo(() => {
        let result = data;
        if (selectedKelurahan) {
            result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        }
        return result.sort((a, b) => a.tahun - b.tahun);
    }, [data, selectedKelurahan]);

    const latestYear = useMemo(() => {
        if (!selectedData.length) return new Date().getFullYear();
        return Math.max(...selectedData.map(d => d.tahun));
    }, [selectedData]);

    // Aggregate trends by year
    const trendData = useMemo(() => {
        const aggs: Record<number, any> = {};
        selectedData.forEach(d => {
            if (!aggs[d.tahun]) aggs[d.tahun] = { tahun: d.tahun, ibu_hamil: 0, ibu_bersalin: 0, bayi_lahir_hidup: 0, kematian_ibu: 0, kematian_bayi: 0, kb_aktif: 0 };
            aggs[d.tahun].ibu_hamil += (d.ibu_hamil || 0);
            aggs[d.tahun].ibu_bersalin += (d.ibu_bersalin || 0);
            aggs[d.tahun].bayi_lahir_hidup += (d.bayi_lahir_hidup || 0);
            aggs[d.tahun].kematian_ibu += (d.kematian_ibu || 0);
            aggs[d.tahun].kematian_bayi += (d.kematian_bayi || 0);
            aggs[d.tahun].kb_aktif += (d.kb_aktif || 0);
        });
        return Object.values(aggs).sort((a, b) => a.tahun - b.tahun);
    }, [selectedData]);

    const latestAgg = trendData[trendData.length - 1] || { ibu_hamil: 0, ibu_bersalin: 0, bayi_lahir_hidup: 0, kematian_ibu: 0, kematian_bayi: 0, kb_aktif: 0 };

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <Baby className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Kesehatan Ibu & Anak (KIA)</h2>
                    <p className="text-slate-500 text-sm">Pemantauan persalinan, kehamilan, dan akseptor KB (Tahun {latestYear})</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { label: "Ibu Hamil", value: latestAgg.ibu_hamil, icon: "🤰", bg: "bg-blue-50" },
                    { label: "Ibu Bersalin", value: latestAgg.ibu_bersalin, icon: "🤱", bg: "bg-indigo-50" },
                    { label: "Bayi Lahir Hidup", value: latestAgg.bayi_lahir_hidup, icon: "👼", bg: "bg-blue-50" },
                    { label: "Akseptor KB Aktif", value: latestAgg.kb_aktif, icon: "💊", bg: "bg-emerald-50" },
                    { label: "Kematian Ibu", value: latestAgg.kematian_ibu, icon: "⚠️", bg: latestAgg.kematian_ibu > 0 ? "bg-red-50" : "bg-slate-50" },
                    { label: "Kematian Bayi", value: latestAgg.kematian_bayi, icon: "⚠️", bg: latestAgg.kematian_bayi > 0 ? "bg-red-50" : "bg-slate-50" },
                ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-2xl border border-slate-100 shadow-sm ${stat.bg} relative overflow-hidden group`}>
                        <div className="absolute -right-4 -top-4 text-6xl opacity-20 transform group-hover:scale-110 transition-transform">{stat.icon}</div>
                        <div className="relative z-10">
                            <span className={`text-3xl font-black block mb-1 ${stat.label.startsWith("Kematian") && stat.value > 0 ? "text-red-600" : "text-slate-800"}`}>{stat.value.toLocaleString("id-ID")}</span>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mt-6">
                <h3 className="text-base font-bold text-slate-800 mb-6">Tren Layanan KIA ({trendData[0]?.tahun} - {latestYear})</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIbuHamil" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorBayi" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                            <Area type="monotone" dataKey="ibu_hamil" name="Ibu Hamil" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorIbuHamil)" />
                            <Area type="monotone" dataKey="bayi_lahir_hidup" name="Lahir Hidup" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBayi)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Data Table Maternal */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Daftar Data Kesehatan Ibu & Anak</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari kelurahan, tahun..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold">Wilayah</th>
                                <th className="px-6 py-4 font-bold text-center">Tahun</th>
                                <th className="px-6 py-4 font-bold text-right">Ibu Hamil</th>
                                <th className="px-6 py-4 font-bold text-right">Ibu Bersalin</th>
                                <th className="px-6 py-4 font-bold text-right">Bayi Lahir</th>
                                <th className="px-6 py-4 font-bold text-right">Meninggal (Ibu/Bayi)</th>
                                <th className="px-6 py-4 font-bold text-right">Akseptor KB</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, i) => (
                                <tr key={row.id || i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-500" />
                                            <span className="font-semibold text-slate-700">{kelMap.get(row.kelurahan_id) || "-"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">{row.tahun}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-600">
                                        {(row.ibu_hamil || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-600">
                                        {(row.ibu_bersalin || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-600">
                                        {(row.bayi_lahir_hidup || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-red-500">
                                        {(row.kematian_ibu || 0).toLocaleString('id-ID')} / {(row.kematian_bayi || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        {(row.kb_aktif || 0).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                            {filteredTableData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm">Data tidak ditemukan</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Menampilkan {Math.min(filteredTableData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredTableData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredTableData.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">Sebelumnya</button>
                            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">Selanjutnya</button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ============================================================
   Main Page
============================================================ */
export default function KesehatanPage() {
    const { tenant, kelurahans, isLoading } = useTenant();
    const toTenantPath = useTenantPath();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<HealthStatsData>({ facilities: [], stunting: [], posyandu: [], maternal: [] });
    const [activeSection, setActiveSection] = useState<"fasilitas" | "stunting" | "posyandu" | "maternal">("fasilitas");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/tenants/${tenant.slug}/data/kesehatan`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok || result.error || !result.data) {
                throw new Error(result.error?.message ?? "Gagal memuat data kesehatan.");
            }
            setData(result.data);
        } catch (err) {
            console.error("Error fetching kesehatan data:", err);
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sections = [
        { key: "fasilitas" as const, label: "Fasilitas Kesehatan", icon: Stethoscope },
        { key: "stunting" as const, label: "Stunting & Gizi", icon: Scale },
        { key: "posyandu" as const, label: "Posyandu", icon: Heart },
        { key: "maternal" as const, label: "Ibu & Anak", icon: Baby },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header */}
            <header className="relative overflow-x-clip text-white bg-digital-batik">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />

                <Navbar />

                <div className="relative z-10 px-6 pt-8 pb-32 max-w-7xl mx-auto">
                    <Link href={toTenantPath("/")} className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm font-medium mb-6 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Beranda
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
                                <Heart className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    Modul Data
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Data Kesehatan</h1>
                                <p className="mt-2 text-lg text-white/70 max-w-2xl leading-relaxed">
                                    Laporan fasilitas kesehatan, posyandu, dan kesehatan ibu &amp; anak.
                                </p>
                            </div>
                        </div>

                        {/* Filter Dropdown */}
                        <div className="w-full md:w-72 relative z-20">
                            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Filter Wilayah</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer hover:bg-white/20 transition-all [&>option]:text-slate-800"
                                    value={selectedKelurahan || ""}
                                    onChange={(e) => setSelectedKelurahan(e.target.value || null)}
                                >
                                    <option value="">🗺️ Semua Kelurahan</option>
                                    {kelurahans.map((kel) => (
                                        <option key={kel.id} value={kel.id}>📍 {kel.nama}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-6 max-w-7xl mx-auto -mt-16 relative z-20 pb-16">
                {/* Section Tabs - Grid on mobile, inline on desktop */}
                <div className="grid grid-cols-3 md:flex md:items-center gap-2 md:gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-10">
                    {sections.map((sec) => {
                        const isActive = activeSection === sec.key;
                        return (
                            <button
                                key={sec.key}
                                onClick={() => setActiveSection(sec.key)}
                                className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2 px-2 md:px-5 py-3 rounded-xl text-xs md:text-sm font-bold transition-all text-center border ${isActive ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <sec.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="leading-tight">{sec.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Loading State */}
                {(loading || isLoading) ? (
                    <div className="py-24 text-center">
                        <Activity className="w-10 h-10 mx-auto animate-spin text-indigo-400 mb-4" />
                        <p className="text-slate-500 font-medium">Memuat data kesehatan...</p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {activeSection === "fasilitas" && (
                            <FasilitasSection data={data.facilities} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                        )}
                        {activeSection === "stunting" && (
                            <StuntingSection data={data.stunting} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                        )}
                        {activeSection === "posyandu" && (
                            <PosyanduSection data={data.posyandu} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                        )}
                        {activeSection === "maternal" && (
                            <MaternalSection data={data.maternal} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
