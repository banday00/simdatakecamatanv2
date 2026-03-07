"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import type { Kelurahan } from "@/types";
import {
    MapPin, ChevronLeft, Search, Activity, ChevronDown, ChevronUp,
    GraduationCap, School, BookOpen, LineChart as LineChartIcon,
    Award, Target, Users
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    LineChart, Line, AreaChart, Area, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

/* ============================================================
   Constants & Utilities
================================================================ */
const CHART_COLORS = [
    "#4f46e5", "#3b82f6", "#0ea5e9", "#06b6d4",
    "#14b8a6", "#10b981", "#84cc16", "#eab308",
];

const JENJANG_COLORS: Record<string, string> = {
    "PAUD/TK": "#ec4899", // Pink
    "SD": "#ef4444",      // Red
    "SMP": "#3b82f6",     // Blue
    "SMA/SMK": "#8b5cf6", // Purple
    "SLB": "#f59e0b",     // Amber
};

/* ============================================================
   Types
================================================================ */
type EduData = {
    facilities: Record<string, any>[];
    participation: Record<string, any>[];
};

/* ============================================================
   Section 1: Sarana Pendidikan
================================================================ */
function SaranaSection({ facilities, kelurahans, selectedKelurahan }: { facilities: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelurahan, searchQuery]);

    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const filteredData = useMemo(() => {
        let result = facilities;
        if (selectedKelurahan) {
            result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d =>
                (d.nama || "").toLowerCase().includes(q) ||
                (d.jenjang || "").toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => a.nama.localeCompare(b.nama));
    }, [facilities, selectedKelurahan, searchQuery]);

    // Summary Stats
    const totalSekolah = filteredData.length;
    const totalGuru = filteredData.reduce((acc, curr) => acc + (curr.jumlah_guru || 0), 0);
    const totalSiswa = filteredData.reduce((acc, curr) => acc + (curr.jumlah_siswa || 0), 0);
    const totalRombel = filteredData.reduce((acc, curr) => acc + (curr.jumlah_rombel || 0), 0);
    const rasioGuruSiswa = totalGuru > 0 ? (totalSiswa / totalGuru).toFixed(1) : "0.0";

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    // Charts Data
    const jenjangPieData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach(d => counts[d.jenjang || "Lainnya"] = (counts[d.jenjang || "Lainnya"] || 0) + 1);
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const statusPieData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach(d => counts[d.status || "Swasta"] = (counts[d.status || "Swasta"] || 0) + 1);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const kelBarData = useMemo(() => {
        const counts: Record<string, number> = {};
        kelurahans.forEach(k => counts[k.nama] = 0);
        facilities.forEach(d => {
            const name = kelMap.get(d.kelurahan_id);
            if (name) counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([nama, jumlah]) => ({ nama: nama.length > 10 ? nama.substring(0, 10) + "…" : nama, jumlah }))
            .sort((a, b) => b.jumlah - a.jumlah);
    }, [facilities, kelMap, kelurahans]);

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <School className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Sarana Pendidikan</h2>
                    <p className="text-slate-500 text-sm">Distribusi sekolah, tenaga pendidik, dan sebaran per wilayah</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: "Total Sekolah", value: totalSekolah, icon: "🏫", color: "text-indigo-600" },
                    { label: "Total Guru", value: totalGuru.toLocaleString('id-ID'), icon: "👨‍🏫", color: "text-blue-600" },
                    { label: "Total Siswa", value: totalSiswa.toLocaleString('id-ID'), icon: "👨‍🎓", color: "text-emerald-600" },
                    { label: "Total Rombel", value: totalRombel.toLocaleString('id-ID'), icon: "🪑", color: "text-amber-600" },
                    { label: "Rasio Guru:Siswa", value: `1:${rasioGuruSiswa}`, icon: "⚖️", color: "text-rose-600" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <span className={`text-2xl lg:text-3xl font-black ${stat.color} block leading-none mb-1`}>{stat.value}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-800">Distribusi Sekolah per Kelurahan</h3>
                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg">{kelurahans.length} Kelurahan</span>
                    </div>
                    <div className="w-full flex-1 min-h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="nama" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                <Bar dataKey="jumlah" name="Jumlah Sekolah" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {kelBarData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="md:col-span-4 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col lg:flex-1 min-h-[200px]">
                        <h3 className="text-sm font-bold text-slate-800 mb-2">Komposisi Jenjang</h3>
                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={jenjangPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                                        {jenjangPieData.map((d, i) => <Cell key={i} fill={JENJANG_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "10px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col lg:flex-1 min-h-[200px]">
                        <h3 className="text-sm font-bold text-slate-800 mb-2">Status Sekolah</h3>
                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={0} outerRadius={60} dataKey="value">
                                        {statusPieData.map((d, i) => <Cell key={i} fill={d.name.toLowerCase() === 'negeri' ? '#10b981' : '#f59e0b'} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "10px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-800">Daftar Sarana Pendidikan</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari sekolah atau jenjang..."
                            className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm w-full md:w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedData.map(row => (
                        <div key={row.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all relative">
                            {row.akreditasi && (
                                <div className="absolute top-4 right-4 text-[10px] font-black w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
                                    {row.akreditasi}
                                </div>
                            )}
                            <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1 pr-8">{row.nama}</h4>
                            <div className="flex items-center gap-2 mb-3 mt-2">
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-white border uppercase tracking-wider text-slate-600">
                                    {row.jenjang}
                                </span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${row.status?.toLowerCase() === 'negeri' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                    {row.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200">
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-700">{row.jumlah_siswa || 0}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Siswa</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-700">{row.jumlah_guru || 0}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Guru</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-700">{row.jumlah_rombel || 0}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Rombel</p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {kelMap.get(row.kelurahan_id) || "-"}</span>
                                <span>NPSN: <strong>{row.npsn || "-"}</strong></span>
                            </div>
                        </div>
                    ))}
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Menampilkan {Math.min(filteredData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredData.length} sekolah
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sebelumnya
                            </button>
                            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
                {filteredData.length === 0 && (
                    <div className="py-12 text-center text-slate-400">
                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium">Tidak ada sekolah ditemukan</p>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ============================================================
   Section 2: Partisipasi & Literasi
================================================================ */
function PartisipasiSection({ participation, kelurahans, selectedKelurahan }: { participation: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const selectedData = useMemo(() => {
        let result = participation;
        if (selectedKelurahan) {
            result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        }
        return result.sort((a, b) => a.tahun - b.tahun);
    }, [participation, selectedKelurahan]);

    const latestYear = useMemo(() => {
        if (!selectedData.length) return new Date().getFullYear();
        return Math.max(...selectedData.map(d => d.tahun));
    }, [selectedData]);

    const latestData = useMemo(() => selectedData.filter(d => d.tahun === latestYear), [selectedData, latestYear]);

    // Trends multi year
    const trendData = useMemo(() => {
        const byYear: Record<number, any> = {};
        selectedData.forEach(d => {
            if (!byYear[d.tahun]) byYear[d.tahun] = { tahun: d.tahun, putus_sekolah: 0, melek_huruf_sum: 0, melek_huruf_count: 0 };
            byYear[d.tahun].putus_sekolah += (d.angka_putus_sekolah || 0);
            if (d.angka_melek_huruf != null) {
                byYear[d.tahun].melek_huruf_sum += d.angka_melek_huruf;
                byYear[d.tahun].melek_huruf_count++;
            }

            // Average partisipasi per jenjang
            const jenjangKey = `partisipasi_${d.jenjang}`;
            if (!byYear[d.tahun][jenjangKey]) {
                byYear[d.tahun][jenjangKey] = { sum: 0, count: 0 };
            }
            byYear[d.tahun][jenjangKey].sum += (d.angka_partisipasi || 0);
            byYear[d.tahun][jenjangKey].count++;
        });

        return Object.values(byYear).map(y => {
            const result: any = { tahun: y.tahun, putus_sekolah: y.putus_sekolah };
            result.melek_huruf = y.melek_huruf_count > 0 ? Number((y.melek_huruf_sum / y.melek_huruf_count).toFixed(2)) : 0;

            ['SD', 'SMP', 'SMA/SMK'].forEach(j => {
                const k = `partisipasi_${j}`;
                if (y[k] && y[k].count > 0) {
                    result[j] = Number((y[k].sum / y[k].count).toFixed(2));
                }
            });
            return result;
        }).sort((a, b) => a.tahun - b.tahun);
    }, [selectedData]);

    const latestAgg = trendData[trendData.length - 1] || { putus_sekolah: 0, melek_huruf: 0, SD: 0, SMP: 0, "SMA/SMK": 0 };

    // Kelurahan comparison for latest year
    const kelComparisonData = useMemo(() => {
        const kelData: Record<string, any> = {};
        latestData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id);
            if (!nama) return;
            const shortName = nama.substring(0, 10) + "…";

            if (!kelData[shortName]) kelData[shortName] = { nama: shortName, putus_sekolah: 0 };
            kelData[shortName].putus_sekolah += (d.angka_putus_sekolah || 0);

            // We want to average participation if there are multiple entries for the same jenjang (unlikely but safe)
            if (d.jenjang) {
                kelData[shortName][d.jenjang] = Number((d.angka_partisipasi || 0).toFixed(1));
            }
        });
        return Object.values(kelData).sort((a, b) => b.putus_sekolah - a.putus_sekolah);
    }, [latestData, kelMap]);

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <BookOpen className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Partisipasi & Literasi</h2>
                    <p className="text-slate-500 text-sm">Angka partisipasi sekolah, tingkat melek huruf, dan putus sekolah (Tahun {latestYear})</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: "Partisipasi SD", value: `${latestAgg.SD || 0}%`, icon: "📖", bg: "bg-red-50", color: "text-red-700" },
                    { label: "Partisipasi SMP", value: `${latestAgg.SMP || 0}%`, icon: "📘", bg: "bg-blue-50", color: "text-blue-700" },
                    { label: "Partisipasi SMA/K", value: `${latestAgg['SMA/SMK'] || 0}%`, icon: "🎓", bg: "bg-purple-50", color: "text-purple-700" },
                    { label: "Melek Huruf", value: `${latestAgg.melek_huruf || 0}%`, icon: "📝", bg: "bg-emerald-50", color: "text-emerald-700" },
                    { label: "Putus Sekolah", value: latestAgg.putus_sekolah, icon: "⚠️", bg: "bg-amber-50", color: "text-amber-700" },
                ].map((stat, i) => (
                    <div key={i} className={`p-5 rounded-2xl border border-slate-100 shadow-sm ${stat.bg} flex flex-col items-center justify-center text-center group`}>
                        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{stat.icon}</div>
                        <span className={`text-2xl font-black ${stat.color} block mb-1`}>{stat.value}</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{stat.label}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Tren Partisipasi Sekolah ({trendData[0]?.tahun || latestYear} - {latestYear})</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="SD" name="SD (%)" stroke={JENJANG_COLORS["SD"]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="SMP" name="SMP (%)" stroke={JENJANG_COLORS["SMP"]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="SMA/SMK" name="SMA/SMK (%)" stroke={JENJANG_COLORS["SMA/SMK"]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Melek Huruf & Putus Sekolah ({trendData[0]?.tahun || latestYear} - {latestYear})</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorMelek" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis yAxisId="left" domain={[60, 100]} tick={{ fontSize: 11, fill: "#10b981" }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#f59e0b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                <Area yAxisId="left" type="monotone" dataKey="melek_huruf" name="Melek Huruf (%)" stroke="#10b981" strokeWidth={2} fill="url(#colorMelek)" />
                                <Line yAxisId="right" type="stepAfter" dataKey="putus_sekolah" name="Jml Putus Sekolah" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {!selectedKelurahan && (
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mt-6">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Angka Partisipasi & Putus Sekolah per Kelurahan ({latestYear})</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kelComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="nama" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#f59e0b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                                <Bar yAxisId="left" dataKey="SD" name="APK SD (%)" fill={JENJANG_COLORS["SD"]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                                <Bar yAxisId="left" dataKey="SMP" name="APK SMP (%)" fill={JENJANG_COLORS["SMP"]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                                <Bar yAxisId="left" dataKey="SMA/SMK" name="APK SMA/K (%)" fill={JENJANG_COLORS["SMA/SMK"]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                                <Area yAxisId="right" dataKey="putus_sekolah" name="Putus Sekolah (Jiwa)" stroke="#f59e0b" fill="#fef3c7" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </section>
    );
}

/* ============================================================
   Section 3: Analisis & Insight
================================================================ */
function AnalisisSection({ facilities, participation, kelurahans, selectedKelurahan }: { facilities: any[]; participation: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const latestYearPartisipasi = participation.length > 0 ? Math.max(...participation.map(d => d.tahun)) : new Date().getFullYear();
    const latestPartisipasi = participation.filter(p => p.tahun === latestYearPartisipasi);

    // Compute metrics per kelurahan
    const kelMetrics = useMemo(() => {
        const metrics: Record<string, any> = {};

        kelurahans.forEach(k => {
            metrics[k.id] = { id: k.id, nama: k.nama, sd: 0, smp: 0, sma: 0, melek: 0, guru_siswa: 0, total_sekolah: 0, putus: 0 };
        });

        latestPartisipasi.forEach(p => {
            if (!metrics[p.kelurahan_id]) return;
            if (p.jenjang === 'SD') metrics[p.kelurahan_id].sd = p.angka_partisipasi || 0;
            if (p.jenjang === 'SMP') metrics[p.kelurahan_id].smp = p.angka_partisipasi || 0;
            if (p.jenjang === 'SMA/SMK') metrics[p.kelurahan_id].sma = p.angka_partisipasi || 0;
            if (p.angka_melek_huruf) metrics[p.kelurahan_id].melek = p.angka_melek_huruf;
            if (p.angka_putus_sekolah) metrics[p.kelurahan_id].putus += p.angka_putus_sekolah;
        });

        // Add facilities metrics
        facilities.forEach(f => {
            if (!metrics[f.kelurahan_id]) return;
            metrics[f.kelurahan_id].total_sekolah++;
            if (!metrics[f.kelurahan_id].jml_guru) metrics[f.kelurahan_id].jml_guru = 0;
            if (!metrics[f.kelurahan_id].jml_siswa) metrics[f.kelurahan_id].jml_siswa = 0;
            metrics[f.kelurahan_id].jml_guru += (f.jumlah_guru || 0);
            metrics[f.kelurahan_id].jml_siswa += (f.jumlah_siswa || 0);
        });

        Object.values(metrics).forEach((m: any) => {
            m.guru_siswa = m.jml_siswa > 0 && m.jml_guru > 0 ? Number((m.jml_guru / m.jml_siswa * 100).toFixed(1)) : 0; // index per 100 siswa
            // Calculate a synthetic index for ranking
            m.index = ((m.sd + m.smp + m.sma) / 3 * 0.5) + (m.melek * 0.3) + ((10 - Math.min(10, m.putus)) * 0.2);
            if (isNaN(m.index)) m.index = 0;
        });

        return Object.values(metrics).sort((a: any, b: any) => b.index - a.index);
    }, [kelurahans, latestPartisipasi, facilities]);

    const activeKelurahanMetric = selectedKelurahan ? kelMetrics.find((m: any) => m.id === selectedKelurahan) : null;

    const radarData = useMemo(() => {
        if (!selectedKelurahan && kelMetrics.length === 0) return [];

        let target = activeKelurahanMetric || kelMetrics[0];
        let average = { name: 'Rata-rata Kota', SD: 0, SMP: 0, SMA: 0, Melek: 0, GuruRatio: 0 };

        const count = kelMetrics.filter((m: any) => m.melek > 0).length || 1;
        kelMetrics.forEach((m: any) => {
            average.SD += m.sd;
            average.SMP += m.smp;
            average.SMA += m.sma;
            average.Melek += m.melek;
            average.GuruRatio += m.guru_siswa;
        });
        average.SD = average.SD / count;
        average.SMP = average.SMP / count;
        average.SMA = average.SMA / count;
        average.Melek = average.Melek / count;
        average.GuruRatio = average.GuruRatio / count;

        if (!target) return [];

        return [
            { subject: 'APK SD', A: target.sd, B: average.SD, fullMark: 100 },
            { subject: 'APK SMP', A: target.smp, B: average.SMP, fullMark: 100 },
            { subject: 'APK SMA/K', A: target.sma, B: average.SMA, fullMark: 100 },
            { subject: 'Melek Huruf', A: target.melek, B: average.Melek, fullMark: 100 },
            { subject: 'Rasio Guru', A: Math.min(100, target.guru_siswa * 10), B: Math.min(100, average.GuruRatio * 10), fullMark: 100 },
        ];
    }, [kelMetrics, activeKelurahanMetric, selectedKelurahan]);

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <Target className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Analisis & Insight Pendidikan</h2>
                    <p className="text-slate-500 text-sm">Pemetaan kinerja pendidikan, area fokus, dan peringkat kelurahan</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center">
                    <h3 className="text-base font-bold text-slate-800 self-start mb-2">Profil Kinerja {activeKelurahanMetric ? activeKelurahanMetric.nama : "Kelurahan Teratas"}</h3>
                    <p className="text-xs text-slate-500 self-start mb-4">Dibandingkan rata-rata kota standar 100</p>
                    <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name={activeKelurahanMetric ? activeKelurahanMetric.nama : (kelMetrics[0] as any)?.nama} dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.5} />
                                <Radar name="Rata-rata" dataKey="B" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '12px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Indeks Kinerja Kelurahan</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[350px] p-0 custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 font-bold text-slate-600">Peringkat</th>
                                    <th className="px-5 py-3 font-bold text-slate-600">Kelurahan</th>
                                    <th className="px-5 py-3 font-bold text-slate-600 text-right">Skor Indeks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kelMetrics.map((m: any, i) => (
                                    <tr key={m.id} className="border-b border-slate-50 hover:bg-indigo-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}`}>
                                                {i + 1}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-medium text-slate-800">{m.nama}</td>
                                        <td className="px-5 py-3 text-right font-black text-indigo-600">{m.index.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ============================================================
   Main Page
================================================================ */
export default function PendidikanPage() {
    const { tenant, kelurahans, isLoading } = useTenant();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EduData>({ facilities: [], participation: [] });
    const [activeSection, setActiveSection] = useState<"sarana" | "partisipasi" | "analisis">("sarana");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);
        const supabase = createClient();
        const tid = tenant.id;

        try {
            const [facilitiesRes, partRes] = await Promise.all([
                supabase.from("edu_facilities").select("*").eq("tenant_id", tid),
                supabase.from("edu_participation").select("*").eq("tenant_id", tid)
            ]);

            setData({
                facilities: facilitiesRes.data || [],
                participation: partRes.data || []
            });
        } catch (err) {
            console.error("Error fetching pendidikan data:", err);
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sections = [
        { key: "sarana" as const, label: "Sarana Pendidikan", icon: School, color: "indigo" },
        { key: "partisipasi" as const, label: "Partisipasi & Literasi", icon: LineChartIcon, color: "blue" },
        { key: "analisis" as const, label: "Analisis & Insight", icon: Target, color: "emerald" },
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
                                <GraduationCap className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    Modul Data
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Data Pendidikan</h1>
                                <p className="mt-2 text-lg text-white/70 max-w-2xl leading-relaxed">
                                    Informasi sarana prasarana sekolah dan tingkat partisipasi di Kota Bogor.
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
                            blue: "bg-blue-50 text-blue-700",
                            emerald: "bg-emerald-50 text-emerald-700",
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
                        <p className="text-slate-500 font-medium">Memproses data pendidikan...</p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {activeSection === "sarana" && (
                            <SaranaSection facilities={data.facilities} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                        )}
                        {activeSection === "partisipasi" && (
                            <PartisipasiSection participation={data.participation} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                        )}
                        {activeSection === "analisis" && (
                            <AnalisisSection facilities={data.facilities} participation={data.participation} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
