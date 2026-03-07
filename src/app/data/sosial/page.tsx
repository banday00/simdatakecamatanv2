
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import type { Kelurahan } from "@/types";
import {
    Activity, ChevronLeft, ChevronDown, HandHeart, Accessibility,
    Home as HomeIcon, Church as ChurchIcon, Users, Banknote, MapPin, Search,
    ChevronRight, ArrowRight, TrendingUp, Heart
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

/* ============================================================
   Constants & Theme
================================================================ */
const THEME = {
    color: "bg-indigo-500",
    colorBg: "bg-indigo-50",
    colorText: "text-indigo-600",
    gradient: "from-indigo-500 to-indigo-700",
    bgGradient: "bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800",
};

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f43f5e", "#8b5cf6"];

// Shared StatCard Component
function StatCard({ label, value, icon: Icon, colorClass, gradientClass, loading = false, subtitle = "" }: any) {
    return (
        <div className={`p-5 rounded-2xl border border-slate-100 shadow-sm ${gradientClass} flex flex-col items-center justify-center text-center group min-h-[130px] relative overflow-hidden`}>
            {loading ? (
                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
            ) : (
                <>
                    <div className={`p-3 rounded-xl ${colorClass} bg-white/50 mb-3 group-hover:scale-110 transition-transform relative z-10`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl md:text-3xl font-black text-slate-800 block mb-1 relative z-10">{value}</span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest relative z-10">{label}</span>
                    {subtitle && <span className="text-[10px] text-slate-500 mt-1 relative z-10">{subtitle}</span>}
                </>
            )}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity opacity-0 group-hover:opacity-100`}></div>
        </div>
    );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between mt-4 text-sm px-2">
            <span className="text-slate-500">Halaman {currentPage} dari {totalPages}</span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage;
                        if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        if (pageNum > 0 && pageNum <= totalPages) {
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        }
                        return null;
                    })}
                </div>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

/* ============================================================
   Section 1: Bantuan Sosial
================================================================ */
function BantuanSection({ assistance, kelurahans, selectedKelurahan }: { assistance: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? assistance.filter(d => d.kelurahan_id === selectedKelurahan) : assistance, [assistance, selectedKelurahan]);

    const totalPenerima = filteredData.reduce((acc, curr) => acc + (curr.jumlah_penerima || 0), 0);
    const totalAnggaran = filteredData.reduce((acc, curr) => acc + (curr.total_anggaran || 0), 0);
    const totalTersalurkan = filteredData.filter(d => d.status_penyaluran === "Tersalurkan").length;
    const persentaseTersalurkan = filteredData.length > 0 ? (totalTersalurkan / filteredData.length * 100).toFixed(1) : "0.0";

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    // Charts
    const typeBarData = useMemo(() => {
        const types: Record<string, number> = {};
        filteredData.forEach(d => {
            const key = d.jenis_bantuan || "Lainnya";
            types[key] = (types[key] || 0) + (d.jumlah_penerima || 0);
        });
        return Object.entries(types).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const budgetPieData = useMemo(() => {
        const sources: Record<string, number> = {};
        filteredData.forEach(d => {
            const key = d.sumber_anggaran || "Lainnya";
            sources[key] = (sources[key] || 0) + (d.total_anggaran || 0);
        });
        return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const kelBarData = useMemo(() => {
        const counts: Record<string, number> = {};
        if (selectedKelurahan) return [];
        kelurahans.forEach(k => counts[k.nama] = 0);
        filteredData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id);
            if (nama) counts[nama] = (counts[nama] || 0) + (d.jumlah_penerima || 0);
        });
        return Object.entries(counts).map(([name, value]) => ({ name: name.length > 10 ? name.substring(0, 10) + "..." : name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [filteredData, kelMap, kelurahans, selectedKelurahan]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Penerima" value={totalPenerima.toLocaleString("id-ID")} icon={Users} colorClass="text-indigo-600" gradientClass="bg-indigo-50" subtitle="Keluarga Penerima Manfaat" />
                <StatCard label="Total Anggaran" value={`Rp ${(totalAnggaran / 1000000000).toFixed(1)} M`} icon={Banknote} colorClass="text-emerald-600" gradientClass="bg-emerald-50" />
                <StatCard label="% Tersalurkan" value={`${persentaseTersalurkan}%`} icon={HandHeart} colorClass="text-blue-600" gradientClass="bg-blue-50" />
                <StatCard label="Program Bantuan" value={typeBarData.length} icon={Heart} colorClass="text-rose-600" gradientClass="bg-rose-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Penerima per Jenis Bantuan</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                <Bar dataKey="value" name="Penerima" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                    {typeBarData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Anggaran Berdasarkan Sumber</h3>
                    <div className="h-72 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={budgetPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {budgetPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => `Rp ${(value / 1e6).toFixed(1)} Jt`} contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                            <div className="text-center">
                                <span className="block text-2xl font-black text-slate-800">{budgetPieData.length}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Sumber</span>
                            </div>
                        </div>
                    </div>
                </div>

                {!selectedKelurahan && kelBarData.length > 0 && (
                    <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Top 10 Wilayah Penerima Bantuan</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="value" name="Penerima" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800">Detail Penyaluran Bantuan</h3>
                    <span className="text-xs font-bold text-indigo-600 px-3 py-1 bg-indigo-100 rounded-lg">{filteredData.length} Program</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                            <tr>
                                <th className="px-5 py-4">Program / Bulan</th>
                                <th className="px-5 py-4">Penerima</th>
                                <th className="px-5 py-4">Total Anggaran</th>
                                <th className="px-5 py-4">Status Penyaluran</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800">{row.jenis_bantuan}</div>
                                        <div className="text-xs text-slate-500">Tahun {row.tahun} • Bulan {row.bulan}</div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {kelMap.get(row.kelurahan_id) || "Kota Bogor"}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-700">{row.jumlah_penerima?.toLocaleString("id-ID") || 0}</div>
                                        <div className="text-xs text-slate-500">Keluarga</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-emerald-600">Rp {row.total_anggaran?.toLocaleString("id-ID") || 0}</div>
                                        <div className="text-xs text-slate-500">{row.sumber_anggaran || "-"}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${row.status_penyaluran === "Tersalurkan" ? "bg-green-100 text-green-700" : row.status_penyaluran === "Proses" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                            {row.status_penyaluran || "Belum"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-slate-500">Tidak ada data penyaluran bantuan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-white">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   Section 2: Disabilitas
================================================================ */
function DisabilitasSection({ disability, kelurahans, selectedKelurahan }: { disability: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? disability.filter(d => d.kelurahan_id === selectedKelurahan) : disability, [disability, selectedKelurahan]);

    const totalPenyandang = filteredData.reduce((acc, curr) => acc + (curr.jumlah || 0), 0);
    const totalBantuan = filteredData.reduce((acc, curr) => acc + (curr.penerima_bantuan || 0), 0);
    const persentaseBantuan = totalPenyandang > 0 ? (totalBantuan / totalPenyandang * 100).toFixed(1) : "0.0";

    // Charts
    const typeBarData = useMemo(() => {
        const types: Record<string, number> = {};
        filteredData.forEach(d => {
            const key = d.jenis_disabilitas || "Lainnya";
            types[key] = (types[key] || 0) + (d.jumlah || 0);
        });
        return Object.entries(types).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const genderPieData = useMemo(() => {
        const l = filteredData.reduce((acc, curr) => acc + (curr.laki_laki || 0), 0);
        const p = filteredData.reduce((acc, curr) => acc + (curr.perempuan || 0), 0);
        return [{ name: "Laki-laki", value: l }, { name: "Perempuan", value: p }].filter(d => d.value > 0);
    }, [filteredData]);

    const ageBarData = useMemo(() => {
        const anak = filteredData.reduce((acc, curr) => acc + (curr.usia_anak || 0), 0);
        const dewasa = filteredData.reduce((acc, curr) => acc + (curr.usia_dewasa || 0), 0);
        const lansia = filteredData.reduce((acc, curr) => acc + (curr.usia_lansia || 0), 0);
        return [
            { name: "Anak (<18)", value: anak },
            { name: "Dewasa", value: dewasa },
            { name: "Lansia (>60)", value: lansia }
        ].filter(d => d.value > 0);
    }, [filteredData]);

    const kelTimelineData = useMemo(() => {
        const kelData: Record<string, any> = {};
        if (selectedKelurahan) return [];
        filteredData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id);
            if (!nama) return;
            if (!kelData[nama]) kelData[nama] = { name: nama.substring(0, 10) + "...", L: 0, P: 0, Total: 0 };
            kelData[nama].L += (d.laki_laki || 0);
            kelData[nama].P += (d.perempuan || 0);
            kelData[nama].Total += (d.jumlah || 0);
        });
        return Object.values(kelData).sort((a, b) => b.Total - a.Total).slice(0, 10);
    }, [filteredData, kelMap, selectedKelurahan]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Penyandang Disabilitas" value={totalPenyandang.toLocaleString("id-ID")} icon={Accessibility} colorClass="text-indigo-600" gradientClass="bg-indigo-50" />
                <StatCard label="Penerima Bantuan" value={totalBantuan.toLocaleString("id-ID")} icon={HandHeart} colorClass="text-emerald-600" gradientClass="bg-emerald-50" />
                <StatCard label="Persentase Terbantu" value={`${persentaseBantuan}%`} icon={Activity} colorClass="text-blue-600" gradientClass="bg-blue-50" />
                <StatCard label="Jenis Terbanyak" value={typeBarData[0]?.name || "-"} icon={Users} colorClass="text-amber-600" gradientClass="bg-amber-50" subtitle={`${typeBarData[0]?.value || 0} orang`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Distribusi Jenis Disabilitas</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                <Bar dataKey="value" name="Jumlah" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                    {typeBarData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 mb-4">Komposisi Gender</h3>
                        <div className="flex-1 relative min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={genderPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                        <Cell fill="#3b82f6" /> {/* Laki-laki */}
                                        <Cell fill="#ec4899" /> {/* Perempuan */}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 mb-2">Berdasarkan Usia</h3>
                        <div className="flex-1 relative min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={ageBarData} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {!selectedKelurahan && kelTimelineData.length > 0 && (
                    <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Sebaran Tertinggi per Kelurahan</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                    <Bar dataKey="L" name="Laki-laki" stackId="a" fill="#3b82f6" maxBarSize={40} />
                                    <Bar dataKey="P" name="Perempuan" stackId="a" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================
   Section 3: Perumahan / RTLH
================================================================ */
function PerumahanSection({ housing, kelurahans, selectedKelurahan }: { housing: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? housing.filter(d => d.kelurahan_id === selectedKelurahan) : housing, [housing, selectedKelurahan]);

    const totalRTLH = filteredData.reduce((a, c) => a + (c.jumlah_rtlh || 0), 0);
    const sudahRehab = filteredData.reduce((a, c) => a + (c.sudah_direhabilitasi || 0), 0);
    const belumRehab = filteredData.reduce((a, c) => a + (c.belum_direhabilitasi || 0), 0);
    const totalAnggaran = filteredData.reduce((a, c) => a + (c.anggaran_rehabilitasi || 0), 0);
    const pctRehab = totalRTLH > 0 ? (sudahRehab / totalRTLH * 100).toFixed(1) : "0.0";

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [filteredData, currentPage]);

    const danaPieData = useMemo(() => {
        const s: Record<string, number> = {};
        filteredData.forEach(d => { const k = d.sumber_dana || "Lainnya"; s[k] = (s[k] || 0) + (d.anggaran_rehabilitasi || 0); });
        return Object.entries(s).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const kelBarData = useMemo(() => {
        if (selectedKelurahan) return [];
        const c: Record<string, { name: string; Sudah: number; Belum: number; Total: number }> = {};
        filteredData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id);
            if (!nama) return;
            if (!c[nama]) c[nama] = { name: nama.length > 10 ? nama.substring(0, 10) + "..." : nama, Sudah: 0, Belum: 0, Total: 0 };
            c[nama].Sudah += (d.sudah_direhabilitasi || 0);
            c[nama].Belum += (d.belum_direhabilitasi || 0);
            c[nama].Total += (d.jumlah_rtlh || 0);
        });
        return Object.values(c).sort((a, b) => b.Total - a.Total).slice(0, 10);
    }, [filteredData, kelMap, selectedKelurahan]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total RTLH" value={totalRTLH.toLocaleString("id-ID")} icon={HomeIcon} colorClass="text-amber-600" gradientClass="bg-amber-50" subtitle="Rumah Tidak Layak Huni" />
                <StatCard label="Sudah Rehab" value={sudahRehab.toLocaleString("id-ID")} icon={HomeIcon} colorClass="text-emerald-600" gradientClass="bg-emerald-50" />
                <StatCard label="Belum Rehab" value={belumRehab.toLocaleString("id-ID")} icon={Activity} colorClass="text-rose-600" gradientClass="bg-rose-50" />
                <StatCard label="Cakupan Rehab" value={`${pctRehab}%`} icon={TrendingUp} colorClass="text-blue-600" gradientClass="bg-blue-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Progress Rehabilitasi RTLH per Kelurahan</h3>
                    {kelBarData.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                    <Bar dataKey="Sudah" name="Sudah Rehab" stackId="a" fill="#10b981" maxBarSize={40} />
                                    <Bar dataKey="Belum" name="Belum Rehab" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Pilih semua kelurahan untuk melihat perbandingan</div>
                    )}
                </div>
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Sumber Dana Rehabilitasi</h3>
                    <div className="h-72 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={danaPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {danaPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => `Rp ${(v / 1e6).toFixed(1)} Jt`} contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800">Rp {(totalAnggaran / 1e9).toFixed(1)}M</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Anggaran</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800">Detail Status RTLH</h3>
                    <span className="text-xs font-bold text-amber-600 px-3 py-1 bg-amber-100 rounded-lg">{totalRTLH} RTLH</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                            <tr>
                                <th className="px-5 py-4">Tahun / Kelurahan</th>
                                <th className="px-5 py-4">Jumlah RTLH</th>
                                <th className="px-5 py-4">Progress Rehab</th>
                                <th className="px-5 py-4">Anggaran & Sumber</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedData.map((row, i) => {
                                const pct = row.jumlah_rtlh > 0 ? ((row.sudah_direhabilitasi || 0) / row.jumlah_rtlh) * 100 : 0;
                                return (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-slate-800">{kelMap.get(row.kelurahan_id) || "Kota Bogor"}</div>
                                            <div className="text-xs text-slate-500">Tahun {row.tahun}</div>
                                        </td>
                                        <td className="px-5 py-4 font-bold text-slate-700">{row.jumlah_rtlh?.toLocaleString("id-ID") || 0} Unit</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-medium text-emerald-600">{row.sudah_direhabilitasi || 0} Selesai</span>
                                                <span className="text-slate-500">{row.belum_direhabilitasi || 0} Sisa</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-emerald-600">Rp {row.anggaran_rehabilitasi?.toLocaleString("id-ID") || 0}</div>
                                            <div className="text-xs text-slate-500">Sumber: {row.sumber_dana || "-"}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedData.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-500">Tidak ada data RTLH.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-white">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   Section 4: Tempat Ibadah
================================================================ */
function KeagamaanSection({ religious, kelurahans, selectedKelurahan }: { religious: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? religious.filter(d => d.kelurahan_id === selectedKelurahan) : religious, [religious, selectedKelurahan]);

    const totalIbadah = filteredData.length;
    const totalMasjid = filteredData.filter(d => d.jenis === "Masjid" || d.jenis === "Musholla").length;
    const totalGereja = filteredData.filter(d => d.jenis === "Gereja").length;
    const totalLainnya = totalIbadah - totalMasjid - totalGereja;

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 9;

    const searchedData = useMemo(() => {
        if (!searchQuery) return filteredData;
        const q = searchQuery.toLowerCase();
        return filteredData.filter(d => (d.nama || "").toLowerCase().includes(q) || (d.alamat || "").toLowerCase().includes(q) || (d.jenis || "").toLowerCase().includes(q));
    }, [filteredData, searchQuery]);

    const totalPages = Math.ceil(searchedData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => searchedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [searchedData, currentPage]);

    const typePieData = useMemo(() => {
        const t: Record<string, number> = {};
        filteredData.forEach(d => { const k = d.jenis || "Lainnya"; t[k] = (t[k] || 0) + 1; });
        return Object.entries(t).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const conditionPieData = useMemo(() => {
        const c: Record<string, number> = { Baik: 0, Sedang: 0, Rusak: 0 };
        filteredData.forEach(d => { const k = d.kondisi || "Baik"; c[k] = (c[k] || 0) + 1; });
        return Object.entries(c).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
    }, [filteredData]);

    const kelBarData = useMemo(() => {
        if (selectedKelurahan) return [];
        const c: Record<string, number> = {};
        filteredData.forEach(d => { const n = kelMap.get(d.kelurahan_id); if (n) c[n] = (c[n] || 0) + 1; });
        return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [filteredData, kelMap, selectedKelurahan]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Tempat Ibadah" value={totalIbadah} icon={ChurchIcon} colorClass="text-indigo-600" gradientClass="bg-indigo-50" />
                <StatCard label="Masjid / Musholla" value={totalMasjid} icon={ChurchIcon} colorClass="text-emerald-600" gradientClass="bg-emerald-50" />
                <StatCard label="Gereja" value={totalGereja} icon={ChurchIcon} colorClass="text-amber-600" gradientClass="bg-amber-50" />
                <StatCard label="Lainnya" value={totalLainnya} icon={ChurchIcon} colorClass="text-rose-600" gradientClass="bg-rose-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Komposisi Jenis</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {typePieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                            <div className="text-center">
                                <span className="block text-2xl font-black text-slate-800">{totalIbadah}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Kondisi Bangunan</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={conditionPieData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value">
                                    {conditionPieData.map((d, i) => <Cell key={i} fill={d.name === "Baik" ? "#10b981" : d.name === "Sedang" ? "#f59e0b" : "#ef4444"} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {!selectedKelurahan && kelBarData.length > 0 && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Distribusi per Kelurahan</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={kelBarData} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={15} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Direktori Tempat Ibadah</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Cari nama atau jenis..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
                    </div>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                    {paginatedData.map((item, i) => (
                        <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all group flex flex-col relative overflow-hidden">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <ChurchIcon className="w-5 h-5" />
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${item.kondisi === "Baik" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : item.kondisi === "Sedang" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                                    {item.kondisi || "Baik"}
                                </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{item.nama}</h4>
                            <span className="text-xs font-medium text-indigo-600 mb-3">{item.jenis}</span>
                            <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
                                <div className="flex items-start gap-2 text-xs text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2 leading-relaxed">{item.alamat || "-"}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                    <span>{kelMap.get(item.kelurahan_id) || "-"}</span>
                                    {item.kapasitas && <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.kapasitas.toLocaleString("id-ID")} Orang</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {paginatedData.length === 0 && <div className="p-8 text-center text-slate-500 bg-slate-50/50">Tidak ada tempat ibadah yang cocok.</div>}
                <div className="p-4 border-t border-slate-100 bg-white">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            </div>
        </div>
    );
}


/* ============================================================
   Section 5: Analisis & Insight
================================================================ */
function AnalisisSection({ assistance, disability, housing, religious, kelurahans, selectedKelurahan }: { assistance: any[]; disability: any[]; housing: any[]; religious: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);

    // Aggregate Data per Kelurahan
    const kelStats = useMemo(() => {
        const stats: Record<string, any> = {};
        kelurahans.forEach(k => {
            const nama = k.nama;
            stats[nama] = {
                kelurahan: nama,
                bantuan: assistance.filter(d => d.kelurahan_id === k.id).reduce((s, r) => s + (r.jumlah_penerima || 0), 0),
                disabilitas: disability.filter(d => d.kelurahan_id === k.id).reduce((s, r) => s + (r.jumlah || 0), 0),
                rtlh_belum: housing.filter(d => d.kelurahan_id === k.id).reduce((s, r) => s + (r.belum_direhabilitasi || 0), 0),
                tempat_ibadah: religious.filter(d => d.kelurahan_id === k.id).length,
                skor: 0
            };
        });

        // Calculate scores (1-100 relative to max)
        const maxBantuan = Math.max(...Object.values(stats).map(s => s.bantuan), 1);
        const maxDisabilitas = Math.max(...Object.values(stats).map(s => s.disabilitas), 1);
        const maxRtlh = Math.max(...Object.values(stats).map(s => s.rtlh_belum), 1);
        const maxIbadah = Math.max(...Object.values(stats).map(s => s.tempat_ibadah), 1);

        Object.values(stats).forEach(s => {
            s.skorBantuan = (s.bantuan / maxBantuan) * 100;
            s.skorDisabilitas = (s.disabilitas / maxDisabilitas) * 100;
            s.skorRtlh = (s.rtlh_belum / maxRtlh) * 100; // Higher = more un-rehabbed (need more intervention)
            s.skorIbadah = (s.tempat_ibadah / maxIbadah) * 100; // Normalizing just for shape

            // Composite "Vulnerability" score (higher = needs more attention)
            s.skor = (s.skorBantuan * 0.3) + (s.skorDisabilitas * 0.3) + (s.skorRtlh * 0.4);
        });

        return Object.values(stats).sort((a, b) => b.skor - a.skor);
    }, [assistance, disability, housing, religious, kelurahans]);

    const radarData = useMemo(() => {
        const targetStr = selectedKelurahan ? kelMap.get(selectedKelurahan) : kelStats[0]?.kelurahan;
        const current = kelStats.find(k => k.kelurahan === targetStr) || kelStats[0];
        if (!current) return [];

        // Average for comparison
        const avgBantuan = kelStats.reduce((s, k) => s + k.skorBantuan, 0) / kelStats.length || 0;
        const avgDisabilitas = kelStats.reduce((s, k) => s + k.skorDisabilitas, 0) / kelStats.length || 0;
        const avgRtlh = kelStats.reduce((s, k) => s + k.skorRtlh, 0) / kelStats.length || 0;

        return [
            { subject: "Beban Bantuan", A: current.skorBantuan, B: avgBantuan, fullMark: 100 },
            { subject: "Beban Disabilitas", A: current.skorDisabilitas, B: avgDisabilitas, fullMark: 100 },
            { subject: "Kebutuhan RTLH", A: current.skorRtlh, B: avgRtlh, fullMark: 100 },
            { subject: "Fasilitas Agama", A: current.skorIbadah, B: kelStats.reduce((s, k) => s + k.skorIbadah, 0) / kelStats.length || 0, fullMark: 100 }
        ];
    }, [kelStats, selectedKelurahan, kelMap]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Pemetaan Beban Sosial</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name={selectedKelurahan ? kelMap.get(selectedKelurahan) : "Wilayah Tertinggi"} dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                                <Radar name="Rata-rata Kota" dataKey="B" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                                <Tooltip contentStyle={{ borderRadius: 12, fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">Indeks Kerentanan Sosial</h3>
                    <p className="text-sm text-slate-500 mb-4">Skor komposit dari beban bantuan sosial, penyandang disabilitas, dan kebutuhan rehabilitasi RTLH.</p>

                    <div className="flex-1 overflow-auto pr-2 space-y-3">
                        {kelStats.map((k, i) => (
                            <div key={k.kelurahan} className={`p-4 rounded-xl border ${selectedKelurahan && kelMap.get(selectedKelurahan) !== k.kelurahan ? "opacity-50 border-slate-100 bg-slate-50" : i === 0 ? "border-rose-200 bg-rose-50/50" : "border-slate-100 bg-white"}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-rose-100 text-rose-600" : i < 3 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                                            {i + 1}
                                        </div>
                                        <span className="font-bold text-slate-800">{k.kelurahan}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${i === 0 ? "text-rose-600" : i < 3 ? "text-amber-600" : "text-slate-600"}`}>
                                        Skor: {k.skor.toFixed(1)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100/60">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Bantuan</div>
                                        <div className="text-xs font-bold text-slate-700">{k.bantuan.toLocaleString("id-ID")} org</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Disabilitas</div>
                                        <div className="text-xs font-bold text-slate-700">{k.disabilitas.toLocaleString("id-ID")} org</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Sisa RTLH</div>
                                        <div className="text-xs font-bold text-rose-600">{k.rtlh_belum.toLocaleString("id-ID")} unit</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   Main Page Component
================================================================ */
export default function SosialPage() {
    const { tenant, kelurahans } = useTenant();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | "ALL">("ALL");
    const [activeSection, setActiveSection] = useState("bantuan");

    // Data States
    const [assistanceData, setAssistanceData] = useState<any[]>([]);
    const [disabilityData, setDisabilityData] = useState<any[]>([]);
    const [housingData, setHousingData] = useState<any[]>([]);
    const [religiousData, setReligiousData] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            if (!tenant?.id) return;
            try {
                setLoading(true);
                const supabase = createClient();
                const [assistRes, disabilityRes, housingRes, religiousRes] = await Promise.all([
                    supabase.from("social_assistance").select("*").eq("tenant_id", tenant.id),
                    supabase.from("social_disability").select("*").eq("tenant_id", tenant.id),
                    supabase.from("social_rtlh").select("*").eq("tenant_id", tenant.id),
                    supabase.from("social_religious").select("*").eq("tenant_id", tenant.id),
                ]);

                if (assistRes.error) throw assistRes.error;
                if (disabilityRes.error) throw disabilityRes.error;
                if (housingRes.error) throw housingRes.error;
                if (religiousRes.error) throw religiousRes.error;

                setAssistanceData(assistRes.data || []);
                setDisabilityData(disabilityRes.data || []);
                setHousingData(housingRes.data || []);
                setReligiousData(religiousRes.data || []);
            } catch (err: any) {
                console.error("Error fetching social data:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [tenant?.id]);

    const sections = [
        { id: "bantuan", label: "Bantuan Sosial", icon: HandHeart },
        { id: "disabilitas", label: "Disabilitas", icon: Accessibility },
        { id: "perumahan", label: "Perumahan / RTLH", icon: HomeIcon },
        { id: "keagamaan", label: "Tempat Ibadah", icon: ChurchIcon },
        { id: "analisis", label: "Analisis & Insight", icon: Activity },
    ];

    const colorMap: Record<string, string> = {
        bantuan: "text-rose-600 bg-rose-50 border-rose-100",
        disabilitas: "text-indigo-600 bg-indigo-50 border-indigo-100",
        perumahan: "text-emerald-600 bg-emerald-50 border-emerald-100",
        keagamaan: "text-amber-600 bg-amber-50 border-amber-100",
        analisis: "text-blue-600 bg-blue-50 border-blue-100"
    };

    if (!tenant) return null;

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans">
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
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Modul Data
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Sosial & Kesejahteraan</h1>
                                <p className="mt-2 text-lg text-white/70 max-w-2xl leading-relaxed">
                                    Data penyaluran bantuan sosial, disabilitas, perumahan rakyat, dan tempat ibadah di wilayah {tenant.nama}.
                                </p>
                            </div>
                        </div>

                        {/* Filter Dropdown */}
                        <div className="w-full md:w-72 relative z-20">
                            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Filter Wilayah</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer hover:bg-white/20 transition-all [&>option]:text-slate-800"
                                    value={selectedKelurahan}
                                    onChange={(e) => setSelectedKelurahan(e.target.value)}
                                >
                                    <option value="ALL">🗺️ Semua Kelurahan</option>
                                    {kelurahans.map(k => (
                                        <option key={k.id} value={k.id}>📍 {k.nama}</option>
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
                {/* Navigation Tabs (Solid White bg, like Pendidikan) */}
                <div className="bg-white p-2 rounded-2xl md:rounded-full shadow-lg border border-slate-100 flex flex-col md:flex-row gap-2 mb-8 overflow-x-auto hide-scrollbar">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl md:rounded-full text-sm font-bold transition-all whitespace-nowrap flex-1 ${activeSection === section.id
                                ? colorMap[section.id]
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent"
                                }`}
                        >
                            <section.icon className={`w-4 h-4 ${activeSection === section.id ? "" : "opacity-50"}`} />
                            {section.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6 shadow-lg"></div>
                        <p className="text-slate-500 font-medium animate-pulse">Memuat data Sosial & Kesejahteraan...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl text-center max-w-2xl mx-auto shadow-sm">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold mb-2">Gagal Memuat Data</h3>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="animate-fade-in transition-all duration-500">
                        {activeSection === "bantuan" && <BantuanSection assistance={assistanceData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                        {activeSection === "disabilitas" && <DisabilitasSection disability={disabilityData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                        {activeSection === "perumahan" && <PerumahanSection housing={housingData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                        {activeSection === "keagamaan" && <KeagamaanSection religious={religiousData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                        {activeSection === "analisis" && <AnalisisSection assistance={assistanceData} disability={disabilityData} housing={housingData} religious={religiousData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan === "ALL" ? null : selectedKelurahan} />}
                    </div>
                )}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
