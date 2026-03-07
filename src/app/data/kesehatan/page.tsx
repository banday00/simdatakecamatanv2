"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
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

    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const filteredData = useMemo(() => {
        let result = data;
        if (selectedKelurahan) {
            result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d =>
                (d.nama || "").toLowerCase().includes(q) ||
                (d.jenis || "").toLowerCase().includes(q)
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
            .map(([nama, jumlah]) => ({ nama: nama.length > 10 ? nama.substring(0, 10) + "…" : nama, jumlah }))
            .sort((a, b) => b.jumlah - a.jumlah);
    }, [data, kelMap, kelurahans]);

    const typePieData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach(d => counts[d.jenis || "Lainnya"] = (counts[d.jenis || "Lainnya"] || 0) + 1);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const faskesTypes: Record<string, { icon: string; color: string }> = {
        "Puskesmas": { icon: "🏥", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
        "Rumah Sakit": { icon: "🏨", color: "text-blue-600 bg-blue-50 border-blue-100" },
        "Klinik": { icon: "⚕️", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
        "Apotek": { icon: "💊", color: "text-amber-600 bg-amber-50 border-amber-100" },
        "Praktek Dokter": { icon: "👨‍⚕️", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    };

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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-800">Distribusi per Wilayah</h3>
                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg">{kelurahans.length} Kelurahan</span>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="nama" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                <Bar dataKey="jumlah" name="Jumlah Faskes" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {kelBarData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="md:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                    <h3 className="text-base font-bold text-slate-800 self-start mb-6">Komposisi Jenis</h3>
                    <div className="w-full h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                                    {typePieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px", border: "1px solid #f1f5f9" }} />
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
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedData.map(row => {
                        const styleInfo = faskesTypes[row.jenis] || { icon: "🏥", color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
                        return (
                            <div key={row.id} className="p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-indigo-200 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${styleInfo.color}`}>
                                        {styleInfo.icon}
                                    </div>
                                    <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-widest">
                                        {row.status_operasional || "Aktif"}
                                    </span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{row.nama}</h4>
                                <p className="text-[11px] font-bold text-indigo-500 mb-2 uppercase tracking-wide">{row.jenis}</p>
                                <p className="text-xs text-slate-500 mb-3 line-clamp-2 min-h-8">{row.alamat || "Tidak ada alamat lengkap"}</p>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {kelMap.get(row.kelurahan_id) || "-"}
                                    </span>
                                    {row.jumlah_tenaga_medis > 0 && (
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                            {row.jumlah_tenaga_medis} Nakes
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                {filteredData.length === 0 && (
                    <div className="py-12 text-center text-slate-400">
                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium">Tidak ada fasilitas ditemukan</p>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                            Halaman <span className="font-bold text-slate-700">{currentPage}</span> dari <span className="font-bold text-slate-700">{totalPages}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                ← Sebelumnya
                            </button>
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
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Selanjutnya →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ============================================================
   Section 2: Stunting
============================================================ */
function StuntingSection({ data, kelurahans, selectedKelurahan }: { data: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

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

    const latestData = useMemo(() => selectedData.filter(d => d.tahun === latestYear), [selectedData, latestYear]);

    // Trend aggregation across all selected kelurahan by year
    const trendData = useMemo(() => {
        const aggs: Record<number, any> = {};
        selectedData.forEach(d => {
            if (!aggs[d.tahun]) aggs[d.tahun] = { tahun: d.tahun, total_balita: 0, total_stunting: 0, gizi_buruk: 0, gizi_kurang: 0 };
            aggs[d.tahun].total_balita += (d.balita_total || 0);
            aggs[d.tahun].total_stunting += (d.balita_stunting || 0);
            aggs[d.tahun].gizi_buruk += (d.balita_gizi_buruk || 0);
            aggs[d.tahun].gizi_kurang += (d.balita_gizi_kurang || 0);
        });
        return Object.values(aggs).map(a => ({
            ...a,
            prevalensi: a.total_balita > 0 ? ((a.total_stunting / a.total_balita) * 100).toFixed(1) : 0
        })).sort((a, b) => a.tahun - b.tahun);
    }, [selectedData]);

    const latestAgg = trendData[trendData.length - 1] || { total_stunting: 0, prevalensi: 0, total_balita: 0 };
    const prevAgg = trendData[trendData.length - 2] || latestAgg;

    // Kelurahan comparison for latest year
    const kelBarData = useMemo(() => {
        const reqData = data.filter(d => d.tahun === latestYear);
        return reqData.map(d => ({
            nama: kelMap.get(d.kelurahan_id)?.substring(0, 10) + "…" || "Lainnya",
            stunting: d.balita_stunting || 0,
            prevalensi: d.balita_total > 0 ? Number(((d.balita_stunting / d.balita_total) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.stunting - a.stunting);
    }, [data, latestYear, kelMap]);

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <Scale className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Kasus Stunting & Gizi</h2>
                    <p className="text-slate-500 text-sm">Pemantauan prevalensi stunting, gizi buruk, dan gizi kurang pada balita (Tahun {latestYear})</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <ActivitySquare className="w-4 h-4" /> Prevalensi
                    </p>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-5xl font-black text-slate-800">{latestAgg.prevalensi}</span>
                        <span className="text-xl font-bold text-slate-500 mb-1">%</span>
                    </div>
                    {trendData.length > 1 && (
                        <p className={`text-xs font-bold flex items-center gap-1 ${Number(latestAgg.prevalensi) < Number(prevAgg.prevalensi) ? 'text-emerald-500' : 'text-indigo-500'}`}>
                            {Number(latestAgg.prevalensi) < Number(prevAgg.prevalensi) ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                            {Math.abs(Number(latestAgg.prevalensi) - Number(prevAgg.prevalensi)).toFixed(1)}% dari tahun lalu
                        </p>
                    )}
                </div>
                <div className="md:col-span-3 grid grid-cols-3 gap-4">
                    {[
                        { label: "Balita Diukur", value: latestAgg.total_balita, icon: "👶", color: "blue" },
                        { label: "Kasus Stunting", value: latestAgg.total_stunting, icon: "📏", color: "indigo" },
                        { label: "Gizi Buruk & Kurang", value: latestAgg.gizi_buruk + latestAgg.gizi_kurang, icon: "🩺", color: "amber" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                            <div className="text-2xl mb-3">{stat.icon}</div>
                            <span className="text-3xl font-black text-slate-800">{stat.value.toLocaleString("id-ID")}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Tren Stunting ({trendData[0]?.tahun} - {latestYear})</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#4f46e5" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Line yAxisId="left" type="monotone" dataKey="total_stunting" name="Jml Kasus" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="prevalensi" name="Prevalensi (%)" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {!selectedKelurahan && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-6">Sebaran Kasus per Kelurahan ({latestYear})</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="nama" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="stunting" name="Balita Stunting" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                        {kelBarData.map((d, i) => (
                                            <Cell key={i} fill={d.prevalensi > 10 ? "#4f46e5" : "#fbbf24"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
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
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const selectedData = useMemo(() => {
        let result = data;
        if (selectedKelurahan) {
            result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        }
        return result.sort((a, b) => a.nama.localeCompare(b.nama));
    }, [data, selectedKelurahan]);

    const totalKader = selectedData.reduce((acc, curr) => acc + (curr.jumlah_kader || 0), 0);
    const totalBalita = selectedData.reduce((acc, curr) => acc + (curr.jumlah_balita || 0), 0);
    const totalLansia = selectedData.reduce((acc, curr) => acc + (curr.jumlah_lansia || 0), 0);

    const strataData = useMemo(() => {
        const counts: Record<string, number> = {};
        selectedData.forEach(d => {
            const strata = d.strata || "Pratama";
            counts[strata] = (counts[strata] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [selectedData]);

    const STRATA_COLORS: Record<string, string> = {
        "Mandiri": "bg-emerald-100 text-emerald-700 border-emerald-200",
        "Purnama": "bg-blue-100 text-blue-700 border-blue-200",
        "Madya": "bg-amber-100 text-amber-700 border-amber-200",
        "Pratama": "bg-indigo-100 text-indigo-700 border-indigo-200"
    };

    const [posPage, setPosPage] = useState(1);
    const POS_PER_PAGE = 10;
    const posTotalPages = Math.ceil(selectedData.length / POS_PER_PAGE);
    const posPaginated = useMemo(() => selectedData.slice((posPage - 1) * POS_PER_PAGE, posPage * POS_PER_PAGE), [selectedData, posPage]);

    useEffect(() => { setPosPage(1); }, [selectedKelurahan]);

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <Heart className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Posyandu & Layanan Dasar</h2>
                    <p className="text-slate-500 text-sm">Distribusi posyandu balita dan lansia beserta kapasitas kadernya</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Posyandu", value: selectedData.length, icon: "🏕️", color: "text-indigo-600" },
                    { label: "Kader Aktif", value: totalKader, icon: "👩‍⚕️", color: "text-indigo-600" },
                    { label: "Sasaran Balita", value: totalBalita, icon: "👶", color: "text-blue-600" },
                    { label: "Sasaran Lansia", value: totalLansia, icon: "👵", color: "text-emerald-600" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center transform transition-transform hover:-translate-y-1">
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <span className={`text-3xl font-black ${stat.color} block leading-none mb-1`}>{stat.value.toLocaleString("id-ID")}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 items-start">
                <div className="md:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800">Daftar Posyandu Aktif</h3>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{selectedData.length} Posyandu</span>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {posPaginated.map(row => (
                            <div key={row.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 text-sm">{row.nama}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${STRATA_COLORS[row.strata || "Pratama"] || STRATA_COLORS["Pratama"]}`}>
                                        {row.strata || "Pratama"}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                                    <MapPin className="w-3 h-3 text-indigo-400" /> {kelMap.get(row.kelurahan_id) || "-"}
                                </p>
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200">
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-700">{row.jumlah_kader || 0}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Kader</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-700">{row.jumlah_balita || 0}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Balita</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-700">{row.jumlah_lansia || 0}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Lansia</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {posTotalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Hal <span className="font-bold text-slate-700">{posPage}</span> / <span className="font-bold text-slate-700">{posTotalPages}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPosPage(p => Math.max(1, p - 1))}
                                    disabled={posPage === 1}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ←
                                </button>
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
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px", border: "1px solid #f1f5f9" }} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                            </PieChart>
                        </ResponsiveContainer>
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
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

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
            if (!aggs[d.tahun]) aggs[d.tahun] = { tahun: d.tahun, ibu_hamil: 0, ibu_bersalin: 0, bayi_lahir_hidup: 0, kb_aktif: 0 };
            aggs[d.tahun].ibu_hamil += (d.ibu_hamil || 0);
            aggs[d.tahun].ibu_bersalin += (d.ibu_bersalin || 0);
            aggs[d.tahun].bayi_lahir_hidup += (d.bayi_lahir_hidup || 0);
            aggs[d.tahun].kb_aktif += (d.kb_aktif || 0);
        });
        return Object.values(aggs).sort((a, b) => a.tahun - b.tahun);
    }, [selectedData]);

    const latestAgg = trendData[trendData.length - 1] || { ibu_hamil: 0, ibu_bersalin: 0, bayi_lahir_hidup: 0, kb_aktif: 0 };

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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Ibu Hamil", value: latestAgg.ibu_hamil, icon: "🤰", bg: "bg-blue-50" },
                    { label: "Ibu Bersalin", value: latestAgg.ibu_bersalin, icon: "🤱", bg: "bg-indigo-50" },
                    { label: "Bayi Lahir Hidup", value: latestAgg.bayi_lahir_hidup, icon: "👼", bg: "bg-blue-50" },
                    { label: "Akseptor KB Aktif", value: latestAgg.kb_aktif, icon: "💊", bg: "bg-emerald-50" },
                ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-2xl border border-slate-100 shadow-sm ${stat.bg} relative overflow-hidden group`}>
                        <div className="absolute -right-4 -top-4 text-6xl opacity-20 transform group-hover:scale-110 transition-transform">{stat.icon}</div>
                        <div className="relative z-10">
                            <span className="text-3xl font-black text-slate-800 block mb-1">{stat.value.toLocaleString("id-ID")}</span>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mt-6">
                <h3 className="text-base font-bold text-slate-800 mb-6">Tren Layanan KIA ({trendData[0]?.tahun} - {latestYear})</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIbuHamil" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorBayi" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                            <Area type="monotone" dataKey="ibu_hamil" name="Ibu Hamil" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIbuHamil)" />
                            <Area type="monotone" dataKey="bayi_lahir_hidup" name="Lahir Hidup" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBayi)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>
    );
}

/* ============================================================
   Main Page
============================================================ */
export default function KesehatanPage() {
    const { tenant, kelurahans, isLoading } = useTenant();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<HealthStatsData>({ facilities: [], stunting: [], posyandu: [], maternal: [] });
    const [activeSection, setActiveSection] = useState<"fasilitas" | "stunting" | "posyandu" | "maternal">("fasilitas");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);
        const supabase = createClient();
        const tid = tenant.id;

        try {
            const [faskesRes, stuntingRes, posyanduRes, maternalRes] = await Promise.all([
                supabase.from("health_facilities").select("*").eq("tenant_id", tid),
                supabase.from("health_stunting").select("*").eq("tenant_id", tid),
                supabase.from("health_posyandu").select("*").eq("tenant_id", tid),
                supabase.from("health_maternal").select("*").eq("tenant_id", tid)
            ]);

            setData({
                facilities: faskesRes.data || [],
                stunting: stuntingRes.data || [],
                posyandu: posyanduRes.data || [],
                maternal: maternalRes.data || []
            });
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
        { key: "fasilitas" as const, label: "Fasilitas Kesehatan", icon: Stethoscope, color: "indigo" },
        { key: "stunting" as const, label: "Stunting & Gizi", icon: Scale, color: "amber" },
        { key: "posyandu" as const, label: "Posyandu", icon: Heart, color: "emerald" },
        { key: "maternal" as const, label: "Ibu & Anak", icon: Baby, color: "blue" },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header */}
            <header className="relative overflow-hidden text-white bg-digital-batik">
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
                                <Heart className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    Modul Data
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Data Kesehatan</h1>
                                <p className="mt-2 text-lg text-white/70 max-w-2xl leading-relaxed">
                                    Laporan fasilitas medis, prevalensi stunting, dan kesehatan keluarga.
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
                {/* Section Tabs */}
                <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-10 overflow-x-auto custom-scrollbar">
                    {sections.map((sec) => {
                        const isActive = activeSection === sec.key;
                        const colorMap: Record<string, string> = {
                            indigo: "bg-indigo-50 text-indigo-700",
                            amber: "bg-amber-50 text-amber-700",
                            emerald: "bg-emerald-50 text-emerald-700",
                            blue: "bg-blue-50 text-blue-700",
                        };
                        return (
                            <button
                                key={sec.key}
                                onClick={() => setActiveSection(sec.key)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${isActive ? colorMap[sec.color] + " shadow-sm border border-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent"
                                    }`}
                            >
                                <sec.icon className="w-4 h-4" />
                                {sec.label}
                            </button>
                        );
                    })}
                </div>

                {/* Loading State */}
                {(loading || isLoading) ? (
                    <div className="py-24 text-center">
                        <Activity className="w-10 h-10 mx-auto animate-spin text-indigo-400 mb-4" />
                        <p className="text-slate-500 font-medium">Mempindigos data kesehatan...</p>
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
