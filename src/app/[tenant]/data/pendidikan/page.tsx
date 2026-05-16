"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
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
    "PAUD": "#ec4899",    // Pink
    "TK": "#f472b6",      // Pink light
    "SD": "#ef4444",      // Red
    "SD/MI": "#ef4444",   // Red (alias)
    "SMP": "#3b82f6",     // Blue
    "SMP/MTs": "#3b82f6", // Blue (alias)
    "SMA": "#8b5cf6",     // Purple
    "SMA/MA": "#8b5cf6",  // Purple (alias)
    "SMK": "#a855f7",     // Purple alt
    "SMA/SMK": "#8b5cf6", // Purple (alias)
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

    const totalSekolah = filteredData.length;
    const totalGuru = filteredData.reduce((acc, curr) => acc + (curr.jumlah_guru || 0), 0);
    const totalSiswa = filteredData.reduce((acc, curr) => acc + (curr.jumlah_siswa || 0), 0);
    const totalRombel = filteredData.reduce((acc, curr) => acc + (curr.jumlah_rombel || 0), 0);
    const totalRuangKelas = filteredData.reduce((acc, curr) => acc + (curr.jumlah_ruang_kelas || 0), 0);
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
        const counts: Record<string, { nama: string; jumlah: number }> = {};
        kelurahans.forEach(k => counts[k.id] = { nama: k.nama, jumlah: 0 });
        facilities.forEach(d => {
            if (counts[d.kelurahan_id]) counts[d.kelurahan_id].jumlah++;
        });
        return Object.values(counts).sort((a, b) => b.jumlah - a.jumlah);
    }, [facilities, kelurahans]);

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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: "Total Sekolah", value: totalSekolah, icon: "🏫", color: "text-indigo-600" },
                    { label: "Total Guru", value: totalGuru.toLocaleString('id-ID'), icon: "👨‍🏫", color: "text-blue-600" },
                    { label: "Total Siswa", value: totalSiswa.toLocaleString('id-ID'), icon: "👨‍🎓", color: "text-emerald-600" },
                    { label: "Total Rombel", value: totalRombel.toLocaleString('id-ID'), icon: "🪑", color: "text-amber-600" },
                    { label: "Ruang Kelas", value: totalRuangKelas.toLocaleString('id-ID'), icon: "🏛️", color: "text-violet-600" },
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
                            <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="nama"
                                    tick={{ fontSize: 10, fill: "#64748b" }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    angle={-45}
                                    textAnchor="end"
                                    height={70}
                                    interval={0}
                                />
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
                    {/* Komposisi Jenjang — custom legend agar tidak terpotong */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">Komposisi Jenjang</h3>
                        <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={jenjangPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value">
                                        {jenjangPieData.map((d, i) => <Cell key={i} fill={JENJANG_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} formatter={(val, name) => [`${val} sekolah`, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Custom Legend — wraps automatically */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-slate-100">
                            {jenjangPieData.map((d, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: JENJANG_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length] }} />
                                    <span className="text-[10px] text-slate-600 font-medium">{d.name} ({d.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Sekolah */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">Status Sekolah</h3>
                        <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={0} outerRadius={60} dataKey="value">
                                        {statusPieData.map((d, i) => <Cell key={i} fill={d.name.toLowerCase() === 'negeri' ? '#10b981' : '#f59e0b'} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} formatter={(val, name) => [`${val} sekolah`, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-slate-100">
                            {statusPieData.map((d, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.name.toLowerCase() === 'negeri' ? '#10b981' : '#f59e0b' }} />
                                    <span className="text-[10px] text-slate-600 font-medium">{d.name} ({d.value})</span>
                                </div>
                            ))}
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
                            {/* Akreditasi badge */}
                            {row.akreditasi && row.akreditasi !== 'Belum' && (
                                <div className="absolute top-4 right-4 text-[10px] font-black w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center" title="Akreditasi">
                                    {row.akreditasi}
                                </div>
                            )}

                            <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1 pr-8">{row.nama}</h4>

                            {/* Periode */}
                            {(row.tahun_ajaran || row.semester) && (
                                <p className="text-[10px] text-slate-400 mb-2 font-mono">
                                    T.A. {row.tahun_ajaran}/{Number(row.tahun_ajaran) + 1} — Semester {Number(row.semester) > 10 ? (Number(row.semester) % 10) : row.semester}
                                </p>
                            )}

                            <div className="flex items-center gap-2 mb-3">
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-white border uppercase tracking-wider text-slate-600">
                                    {row.jenjang}
                                </span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${row.status?.toLowerCase() === 'negeri' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                    {row.status}
                                </span>
                                {row.partisipasi_bos === 'ya' && (
                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-blue-50 text-blue-600 border-blue-100">BOS</span>
                                )}
                            </div>

                            {/* Stats utama */}
                            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-200">
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-700">{(row.jumlah_siswa || 0).toLocaleString('id-ID')}</p>
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
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-700">{row.jumlah_ruang_kelas || 0}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Kelas</p>
                                </div>
                            </div>

                            {/* Gender breakdown (jika ada data) */}
                            {(Number(row.jumlah_siswa_laki) > 0 || Number(row.jumlah_siswa_perempuan) > 0) && (
                                <div className="flex items-center gap-3 pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500">
                                    <span className="text-blue-500 font-bold">♂ {row.jumlah_siswa_laki || 0}</span>
                                    <span className="text-pink-500 font-bold">♀ {row.jumlah_siswa_perempuan || 0}</span>
                                    {Number(row.jumlah_siswa_dalam_kota) > 0 && (
                                        <span className="ml-auto text-slate-400">Dlm: {row.jumlah_siswa_dalam_kota} | Luar: {row.jumlah_siswa_luar_kota || 0}</span>
                                    )}
                                </div>
                            )}

                            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {kelMap.get(row.kelurahan_id) || "-"}</span>
                                <span>NPSN: <strong>{row.npsn || "-"}</strong></span>
                            </div>
                        </div>
                    ))}
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(filteredData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredData.length} sekolah</span>
                            <span className="sm:hidden">{filteredData.length} sekolah</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                ←
                            </button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                →
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

// Mapping jenjang di edu_facilities → kelompok umur APK
const JENJANG_SD_MAP  = ["SD", "SPK SD"];
const JENJANG_SMP_MAP = ["SMP", "SPK SMP"];
const JENJANG_SMA_MAP = ["SMA", "SPK SMA", "SMK"];

function PartisipasiSection({ participation, facilities, kelurahans, selectedKelurahan }: { participation: any[]; facilities: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    // Hitung jumlah siswa per kelurahan+semester per kelompok umur dari edu_facilities
    // Key format: "kelurahan_id::semester" (semester = combined format e.g. 20251)
    const siswaByKelSemester = useMemo(() => {
        const map: Record<string, { sd: number; smp: number; sma: number }> = {};
        facilities.forEach(f => {
            const kid = f.kelurahan_id;
            if (!kid) return;
            const key = `${kid}::${f.semester || 0}`;
            if (!map[key]) map[key] = { sd: 0, smp: 0, sma: 0 };
            const j = (f.jenjang || "").trim();
            const siswa = Number(f.jumlah_siswa) || 0;
            if (JENJANG_SD_MAP.includes(j))  map[key].sd  += siswa;
            if (JENJANG_SMP_MAP.includes(j)) map[key].smp += siswa;
            if (JENJANG_SMA_MAP.includes(j)) map[key].sma += siswa;
        });
        return map;
    }, [facilities]);
    // Also keep a flat per-kelurahan aggregation (all semesters) for chart fallback
    const siswaByKelurahan = useMemo(() => {
        const map: Record<string, { sd: number; smp: number; sma: number }> = {};
        facilities.forEach(f => {
            const kid = f.kelurahan_id;
            if (!kid) return;
            if (!map[kid]) map[kid] = { sd: 0, smp: 0, sma: 0 };
            const j = (f.jenjang || "").trim();
            const siswa = Number(f.jumlah_siswa) || 0;
            if (JENJANG_SD_MAP.includes(j))  map[kid].sd  += siswa;
            if (JENJANG_SMP_MAP.includes(j)) map[kid].smp += siswa;
            if (JENJANG_SMA_MAP.includes(j)) map[kid].sma += siswa;
        });
        return map;
    }, [facilities]);
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelurahan, searchQuery]);

    const filteredTableData = useMemo(() => {
        return participation.filter(s => {
            if (selectedKelurahan && s.kelurahan_id !== selectedKelurahan) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const kelName = kelMap.get(s.kelurahan_id)?.toLowerCase() || "";
                return (s.tahun?.toString().includes(q)) || (kelName.includes(q)) || (s.jenjang?.toLowerCase().includes(q));
            }
            return true;
        }).sort((a,b) => b.tahun - a.tahun || a.kelurahan_id.localeCompare(b.kelurahan_id));
    }, [participation, selectedKelurahan, searchQuery, kelMap]);

    const totalPages = Math.ceil(filteredTableData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTableData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTableData, currentPage]);

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
            // Normalize jenjang for consistency
            const normalizedJenjang = (d.jenjang || '').replace(/\/MI|\/MTs|\/MA|\/SMK/gi, '').trim() || d.jenjang;
            byYear[d.tahun].putus_sekolah += (Number(d.angka_putus_sekolah) || 0);
            // Track putus sekolah per jenjang
            const putusKey = `putus_${normalizedJenjang}`;
            if (!byYear[d.tahun][putusKey]) byYear[d.tahun][putusKey] = 0;
            byYear[d.tahun][putusKey] += (Number(d.angka_putus_sekolah) || 0);

            if (d.angka_melek_huruf != null) {
                byYear[d.tahun].melek_huruf_sum += Number(d.angka_melek_huruf);
                byYear[d.tahun].melek_huruf_count++;
            }

            // Average partisipasi per jenjang (normalize SD/MI -> SD, SMP/MTs -> SMP, etc.)
            const jenjangKey = `partisipasi_${normalizedJenjang}`;
            if (!byYear[d.tahun][jenjangKey]) {
                byYear[d.tahun][jenjangKey] = { sum: 0, count: 0 };
            }
            byYear[d.tahun][jenjangKey].sum += (Number(d.angka_partisipasi) || 0);
            byYear[d.tahun][jenjangKey].count++;
        });

        return Object.values(byYear).map(y => {
            const result: any = { tahun: y.tahun, putus_sekolah: y.putus_sekolah };
            result.melek_huruf = y.melek_huruf_count > 0 ? Number((y.melek_huruf_sum / y.melek_huruf_count).toFixed(2)) : 0;

            ['SD', 'SMP', 'SMA'].forEach(j => {
                const k = `partisipasi_${j}`;
                if (y[k] && y[k].count > 0) {
                    result[j] = Number((y[k].sum / y[k].count).toFixed(2));
                }
                // Putus sekolah per jenjang
                result[`putus_${j}`] = y[`putus_${j}`] || 0;
            });
            return result;
        }).sort((a, b) => a.tahun - b.tahun);
    }, [selectedData]);

    const latestAgg = trendData[trendData.length - 1] || { putus_sekolah: 0, melek_huruf: 0, SD: 0, SMP: 0, SMA: 0 };

    // Kelurahan comparison for latest year
    const kelComparisonData = useMemo(() => {
        const kelData: Record<string, any> = {};
        latestData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id);
            if (!nama) return;
            const shortName = nama.substring(0, 10) + "…";

            if (!kelData[shortName]) kelData[shortName] = { nama: shortName, putus_sekolah: 0 };
            kelData[shortName].putus_sekolah += (Number(d.angka_putus_sekolah) || 0);

            // We want to average participation if there are multiple entries for the same jenjang (unlikely but safe)
            const nj = (d.jenjang || '').replace(/\/MI|\/MTs|\/MA|\/SMK/gi, '').trim() || d.jenjang;
            if (nj) {
                kelData[shortName][nj] = Number(Number(d.angka_partisipasi || 0).toFixed(1));
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
                    { label: "Partisipasi SMA", value: `${latestAgg.SMA || 0}%`, icon: "🎓", bg: "bg-purple-50", color: "text-purple-700" },
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
                    <h3 className="text-base font-bold text-slate-800 mb-4">📊 Tren Partisipasi Sekolah ({trendData[0]?.tahun || latestYear} - {latestYear})</h3>
                    <p className="text-xs text-slate-500 mb-4">Rata-rata Angka Partisipasi Kasar per jenjang</p>
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
                                <Line type="monotone" dataKey="SMA" name="SMA (%)" stroke={JENJANG_COLORS["SMA"]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-4">📝 Tingkat Melek Huruf ({trendData[0]?.tahun || latestYear} - {latestYear})</h3>
                    <p className="text-xs text-slate-500 mb-4">Rata-rata persentase melek huruf per tahun</p>
                    <div className="h-56">
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
                                <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: "#10b981" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(value: number) => [`${value}%`, 'Melek Huruf']} />
                                <Area type="monotone" dataKey="melek_huruf" name="Melek Huruf (%)" stroke="#10b981" strokeWidth={2.5} fill="url(#colorMelek)" dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-4">⚠️ Total Putus Sekolah ({trendData[0]?.tahun || latestYear} - {latestYear})</h3>
                    <p className="text-xs text-slate-500 mb-4">Jumlah total siswa putus sekolah per tahun</p>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPutus" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#f59e0b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(value: number) => [`${value} jiwa`, 'Putus Sekolah']} />
                                <Bar dataKey="putus_sekolah" name="Total Putus Sekolah" fill="url(#colorPutus)" radius={[8, 8, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-4">📋 Putus Sekolah per Jenjang ({trendData[0]?.tahun || latestYear} - {latestYear})</h3>
                    <p className="text-xs text-slate-500 mb-4">Perbandingan siswa putus sekolah berdasarkan jenjang pendidikan</p>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(value: number, name: string) => [`${value} jiwa`, name]} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                                <Bar dataKey="putus_SD" name="SD" stackId="putus" fill={JENJANG_COLORS["SD"]} radius={[0, 0, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="putus_SMP" name="SMP" stackId="putus" fill={JENJANG_COLORS["SMP"]} radius={[0, 0, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="putus_SMA" name="SMA" stackId="putus" fill={JENJANG_COLORS["SMA"]} radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
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
                                <Bar yAxisId="left" dataKey="SMA" name="APK SMA (%)" fill={JENJANG_COLORS["SMA"]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                                <Area yAxisId="right" dataKey="putus_sekolah" name="Putus Sekolah (Jiwa)" stroke="#f59e0b" fill="#fef3c7" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Data Table Partisipasi & Literasi */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Daftar Data Partisipasi & Literasi</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari kelurahan, jenjang, tahun..."
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
                                <th className="px-5 py-4 font-bold">Wilayah</th>
                                <th className="px-4 py-4 font-bold text-center">Tahun</th>
                                <th className="px-4 py-4 font-bold text-center">Semester</th>
                                <th className="px-4 py-4 font-bold text-center">Jenjang</th>
                                <th className="px-4 py-4 font-bold text-right" title="Jumlah penduduk kelompok umur">Penduduk Usia</th>
                                <th className="px-4 py-4 font-bold text-right" title="Jumlah siswa dari data Sarana Pendidikan">Siswa Sarana</th>
                                <th className="px-4 py-4 font-bold text-right">APK (%)</th>
                                <th className="px-4 py-4 font-bold text-right">Melek Huruf (%)</th>
                                <th className="px-4 py-4 font-bold text-right">Putus Sekolah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, i) => {
                                // Penduduk kelompok umur dari edu_participation
                                const jenjang = (row.jenjang || '').replace(/\/MI|\/MTs|\/MA|\/SMK/gi, '').trim();
                                const penduduk = jenjang === 'SD' ? (row.jumlah_usia_7_12 || 0)
                                    : jenjang === 'SMP' ? (row.jumlah_usia_13_15 || 0)
                                    : jenjang === 'SMA' ? (row.jumlah_usia_16_18 || 0) : 0;
                                // Siswa dari edu_facilities — match by kelurahan + semester (combined format)
                                const semKey = `${row.kelurahan_id}::${row.semester || 0}`;
                                const sf = siswaByKelSemester[semKey] || siswaByKelurahan[row.kelurahan_id];
                                const siswa = sf ? (jenjang === 'SD' ? sf.sd : jenjang === 'SMP' ? sf.smp : jenjang === 'SMA' ? sf.sma : 0) : 0;
                                // Parse combined semester display (e.g. 20251 → S1)
                                const rawSem = Number(row.semester) || 0;
                                const semDisplay = rawSem > 10 ? (rawSem % 10) : rawSem;
                                return (
                                    <tr key={row.id || i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-indigo-500" />
                                                <span className="font-semibold text-slate-700">{kelMap.get(row.kelurahan_id) || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">{row.tahun}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="font-mono text-slate-500 text-xs">{semDisplay ? `S${semDisplay}` : "—"}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] tracking-wider uppercase border border-blue-100">{row.jenjang || "-"}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right text-slate-600">
                                            {penduduk > 0 ? penduduk.toLocaleString('id-ID') : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right font-medium text-indigo-600">
                                            {siswa > 0 ? siswa.toLocaleString('id-ID') : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold text-slate-700">
                                            {row.angka_partisipasi ? Number(row.angka_partisipasi).toFixed(1) : "—"}
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold text-slate-600">
                                            {row.angka_melek_huruf ? Number(row.angka_melek_huruf).toFixed(1) : "—"}
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-amber-600">
                                            {(row.angka_putus_sekolah || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTableData.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm">Data tidak ditemukan</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(filteredTableData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredTableData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredTableData.length}</span>
                            <span className="sm:hidden">{filteredTableData.length} data</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">←</button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">→</button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ============================================================
   Section 3: Analisis & Insight (Standar BPS/Kemendikbud)
   Indikator: APK, AMH, APS (Angka Putus Sekolah), Rasio Guru-Murid
================================================================ */

// Standar Nasional & Benchmark (Sumber: BPS & Kemendikbud)
const BENCHMARKS = {
    apk_sd: { baik: 95, perhatian: 85, label: "APK SD (%)" },
    apk_smp: { baik: 90, perhatian: 75, label: "APK SMP (%)" },
    apk_sma: { baik: 80, perhatian: 65, label: "APK SMA (%)" },
    amh: { baik: 95, perhatian: 90, label: "AMH (%)" },
    aps: { baik: 2, perhatian: 5, label: "Putus Sekolah", reverse: true },
    rasio: { baik: 20, perhatian: 28, label: "Rasio Guru:Murid", reverse: true },
};

function getStatusBadge(value: number, benchmark: { baik: number; perhatian: number; reverse?: boolean }) {
    if (benchmark.reverse) {
        if (value <= benchmark.baik) return { text: "Baik", bg: "bg-emerald-100 text-emerald-700" };
        if (value <= benchmark.perhatian) return { text: "Perhatian", bg: "bg-amber-100 text-amber-700" };
        return { text: "Kritis", bg: "bg-red-100 text-red-700" };
    }
    if (value >= benchmark.baik) return { text: "Baik", bg: "bg-emerald-100 text-emerald-700" };
    if (value >= benchmark.perhatian) return { text: "Perhatian", bg: "bg-amber-100 text-amber-700" };
    return { text: "Kritis", bg: "bg-red-100 text-red-700" };
}

function AnalisisSection({ facilities, participation, kelurahans, selectedKelurahan }: { facilities: any[]; participation: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const latestYearPartisipasi = participation.length > 0 ? Math.max(...participation.map(d => d.tahun)) : new Date().getFullYear();
    const latestPartisipasi = participation.filter(p => p.tahun === latestYearPartisipasi);

    const kelMetrics = useMemo(() => {
        const metrics: Record<string, any> = {};

        kelurahans.forEach(k => {
            metrics[k.id] = {
                id: k.id, nama: k.nama,
                apk_sd: 0, apk_smp: 0, apk_sma: 0,
                penduduk_sd: 0, penduduk_smp: 0, penduduk_sma: 0,
                amh: 0, aps: 0, rasio: 0,
                jml_guru: 0, jml_siswa: 0, jml_siswa_laki: 0, jml_siswa_perempuan: 0,
                jml_ruang_kelas: 0, bos_count: 0, total_sekolah: 0,
            };
        });

        latestPartisipasi.forEach(p => {
            if (!metrics[p.kelurahan_id]) return;
            const nj = (p.jenjang || '').replace(/\/MI|\/MTs|\/MA|\/SMK/gi, '').trim() || p.jenjang;
            if (nj === 'SD') {
                metrics[p.kelurahan_id].apk_sd = Number(p.angka_partisipasi) || 0;
                metrics[p.kelurahan_id].penduduk_sd = Number(p.jumlah_usia_7_12) || 0;
            }
            if (nj === 'SMP') {
                metrics[p.kelurahan_id].apk_smp = Number(p.angka_partisipasi) || 0;
                metrics[p.kelurahan_id].penduduk_smp = Number(p.jumlah_usia_13_15) || 0;
            }
            if (nj === 'SMA') {
                metrics[p.kelurahan_id].apk_sma = Number(p.angka_partisipasi) || 0;
                metrics[p.kelurahan_id].penduduk_sma = Number(p.jumlah_usia_16_18) || 0;
            }
            if (p.angka_melek_huruf) metrics[p.kelurahan_id].amh = Number(p.angka_melek_huruf);
            if (p.angka_putus_sekolah) metrics[p.kelurahan_id].aps += Number(p.angka_putus_sekolah);
        });

        facilities.forEach(f => {
            if (!metrics[f.kelurahan_id]) return;
            metrics[f.kelurahan_id].total_sekolah++;
            metrics[f.kelurahan_id].jml_guru += (f.jumlah_guru || 0);
            metrics[f.kelurahan_id].jml_siswa += (f.jumlah_siswa || 0);
            metrics[f.kelurahan_id].jml_siswa_laki += (f.jumlah_siswa_laki || 0);
            metrics[f.kelurahan_id].jml_siswa_perempuan += (f.jumlah_siswa_perempuan || 0);
            metrics[f.kelurahan_id].jml_ruang_kelas += (f.jumlah_ruang_kelas || 0);
            if ((f.partisipasi_bos || '').toLowerCase() === 'ya') metrics[f.kelurahan_id].bos_count++;
        });

        Object.values(metrics).forEach((m: any) => {
            m.rasio = m.jml_guru > 0 ? Number((m.jml_siswa / m.jml_guru).toFixed(1)) : 0;
        });

        return Object.values(metrics).sort((a: any, b: any) => {
            const avgA = (a.apk_sd + a.apk_smp + a.apk_sma) / 3;
            const avgB = (b.apk_sd + b.apk_smp + b.apk_sma) / 3;
            return avgB - avgA;
        });
    }, [kelurahans, latestPartisipasi, facilities]);

    const cityAvg = useMemo(() => {
        // === APK: Aggregate (standar BPS) ===
        // APK = Σ siswa jenjang / Σ penduduk usia × 100
        // Karena APK per kelurahan sudah = siswa/penduduk×100,
        // maka: siswa_kel = apk_kel × penduduk_kel / 100
        // City APK = Σ(apk_kel × penduduk_kel) / Σ(penduduk_kel)
        const totPendSD  = kelMetrics.reduce((s: number, m: any) => s + m.penduduk_sd,  0);
        const totPendSMP = kelMetrics.reduce((s: number, m: any) => s + m.penduduk_smp, 0);
        const totPendSMA = kelMetrics.reduce((s: number, m: any) => s + m.penduduk_sma, 0);

        const apk_sd  = totPendSD  > 0 ? Number((kelMetrics.reduce((s: number, m: any) => s + m.apk_sd  * m.penduduk_sd,  0) / totPendSD).toFixed(1))  : 0;
        const apk_smp = totPendSMP > 0 ? Number((kelMetrics.reduce((s: number, m: any) => s + m.apk_smp * m.penduduk_smp, 0) / totPendSMP).toFixed(1)) : 0;
        const apk_sma = totPendSMA > 0 ? Number((kelMetrics.reduce((s: number, m: any) => s + m.apk_sma * m.penduduk_sma, 0) / totPendSMA).toFixed(1)) : 0;

        // === AMH: Rata-rata kelurahan yg punya data ===
        const amhKels = kelMetrics.filter((m: any) => m.amh > 0);
        const amh = amhKels.length > 0
            ? Number((amhKels.reduce((s: number, m: any) => s + m.amh, 0) / amhKels.length).toFixed(1))
            : 0;

        // === APS: Rata-rata kelurahan yg punya data partisipasi ===
        const apsKels = kelMetrics.filter((m: any) => m.apk_sd > 0 || m.apk_smp > 0 || m.apk_sma > 0 || m.aps > 0);
        const aps = apsKels.length > 0
            ? Number((apsKels.reduce((s: number, m: any) => s + m.aps, 0) / apsKels.length).toFixed(1))
            : 0;

        // === Rasio G:M: Agregat ===
        const totalGuru  = kelMetrics.reduce((s: number, m: any) => s + m.jml_guru,  0);
        const totalSiswa = kelMetrics.reduce((s: number, m: any) => s + m.jml_siswa, 0);
        const rasio = totalGuru > 0 ? Number((totalSiswa / totalGuru).toFixed(1)) : 0;

        return { apk_sd, apk_smp, apk_sma, amh, aps, rasio };
    }, [kelMetrics]);

    const activeKelurahanMetric = selectedKelurahan ? kelMetrics.find((m: any) => m.id === selectedKelurahan) : null;

    const radarData = useMemo(() => {
        if (kelMetrics.length === 0) return [];
        const target: any = selectedKelurahan
            ? kelMetrics.find((m: any) => m.id === selectedKelurahan)
            : kelMetrics[0];
        if (!target) return [];
        return [
            { subject: 'APK SD', A: target.apk_sd, B: cityAvg.apk_sd, fullMark: 100 },
            { subject: 'APK SMP', A: target.apk_smp, B: cityAvg.apk_smp, fullMark: 100 },
            { subject: 'APK SMA', A: target.apk_sma, B: cityAvg.apk_sma, fullMark: 100 },
            { subject: 'AMH', A: target.amh, B: cityAvg.amh, fullMark: 100 },
            { subject: 'Rasio G:M', A: target.rasio > 0 ? Math.min(100, (20 / target.rasio) * 100) : 0, B: cityAvg.rasio > 0 ? Math.min(100, (20 / cityAvg.rasio) * 100) : 0, fullMark: 100 },
        ];
    }, [kelMetrics, selectedKelurahan, cityAvg]);

    const perhatianCount = kelMetrics.filter((m: any) =>
        m.apk_sd < BENCHMARKS.apk_sd.perhatian || m.apk_smp < BENCHMARKS.apk_smp.perhatian || m.amh < BENCHMARKS.amh.perhatian
    ).length;

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                    <Target className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Analisis Indikator Pendidikan</h2>
                    <p className="text-slate-500 text-sm">Berdasarkan indikator standar BPS & Kemendikbud — Data Tahun {latestYearPartisipasi}</p>
                </div>
            </div>

            {/* Summary Cards — APK/AMH dari Partisipasi */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: "APK SD", value: `${cityAvg.apk_sd}%`, benchmark: BENCHMARKS.apk_sd, raw: cityAvg.apk_sd, subtitle: "Agregat" },
                    { label: "APK SMP", value: `${cityAvg.apk_smp}%`, benchmark: BENCHMARKS.apk_smp, raw: cityAvg.apk_smp, subtitle: "Agregat" },
                    { label: "APK SMA", value: `${cityAvg.apk_sma}%`, benchmark: BENCHMARKS.apk_sma, raw: cityAvg.apk_sma, subtitle: "Agregat" },
                    { label: "AMH", value: `${cityAvg.amh}%`, benchmark: BENCHMARKS.amh, raw: cityAvg.amh, subtitle: "Rata-rata" },
                    { label: "Putus Sekolah", value: `${cityAvg.aps}`, benchmark: BENCHMARKS.aps, raw: cityAvg.aps, subtitle: "Rata-rata" },
                    { label: "Rasio G:M", value: `1:${cityAvg.rasio}`, benchmark: BENCHMARKS.rasio, raw: cityAvg.rasio, subtitle: "Agregat" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                        <span className="text-2xl font-black text-slate-800 block mb-1">{stat.value}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{stat.label} ({stat.subtitle})</span>
                    </div>
                ))}
            </div>

            {/* Summary Cards Sarana — dari edu_facilities */}
            {(() => {
                const totalSekolah = kelMetrics.reduce((s: number, m: any) => s + m.total_sekolah, 0);
                const totalSiswa = kelMetrics.reduce((s: number, m: any) => s + m.jml_siswa, 0);
                const totalGuru = kelMetrics.reduce((s: number, m: any) => s + m.jml_guru, 0);
                const totalKelas = kelMetrics.reduce((s: number, m: any) => s + m.jml_ruang_kelas, 0);
                const totalBos = kelMetrics.reduce((s: number, m: any) => s + m.bos_count, 0);
                const rasioKelas = totalKelas > 0 ? (totalSiswa / totalKelas).toFixed(1) : "0";
                return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                            <span className="text-xl font-black text-indigo-600 block mb-1">{totalSekolah}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sekolah</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                            <span className="text-xl font-black text-emerald-600 block mb-1">{totalSiswa.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                            <span className="text-xl font-black text-blue-600 block mb-1">{totalGuru.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Guru</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                            <span className="text-xl font-black text-violet-600 block mb-1">{totalKelas}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ruang Kelas</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                            <span className="text-xl font-black text-amber-600 block mb-1">{totalBos}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sekolah BOS</span>
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center">
                    <h3 className="text-base font-bold text-slate-800 self-start mb-1">
                        Profil Indikator {activeKelurahanMetric ? activeKelurahanMetric.nama : (kelMetrics[0] as any)?.nama || ""}
                    </h3>
                    <p className="text-xs text-slate-500 self-start mb-4">Dibandingkan rata-rata kecamatan (indikator BPS & Kemendikbud)</p>
                    <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name={activeKelurahanMetric ? activeKelurahanMetric.nama : (kelMetrics[0] as any)?.nama} dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.5} />
                                <Radar name="Rata-rata Kecamatan" dataKey="B" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '12px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Indicator Table per Kelurahan */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Award className="w-5 h-5 text-indigo-500" /> Indikator per Kelurahan</h3>
                            {perhatianCount > 0 && (
                                <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-600 rounded-lg">{perhatianCount} perlu perhatian</span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Diurutkan berdasarkan rata-rata APK tertinggi</p>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[380px] p-0 custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                <tr>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs">#</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs">Kelurahan</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center">Sekolah</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center">Siswa</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center">Kelas</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center" title="Angka Partisipasi Kasar SD">APK SD</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center" title="Angka Partisipasi Kasar SMP">APK SMP</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center" title="Angka Partisipasi Kasar SMA">APK SMA</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center" title="Angka Melek Huruf">AMH</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center" title="Rasio Guru:Murid">G:M</th>
                                    <th className="px-3 py-3 font-bold text-slate-600 text-xs text-center" title="Jumlah sekolah penerima BOS">BOS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kelMetrics.map((m: any, i) => (
                                    <tr key={m.id} className="border-b border-slate-50 hover:bg-indigo-50/50 transition-colors">
                                        <td className="px-3 py-2.5">
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-[10px] ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}`}>
                                                {i + 1}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-800 text-xs whitespace-nowrap">{m.nama}</td>
                                        <td className="px-3 py-2.5 text-center text-xs font-bold text-indigo-600">{m.total_sekolah}</td>
                                        <td className="px-3 py-2.5 text-center text-xs text-slate-600">{m.jml_siswa.toLocaleString('id-ID')}</td>
                                        <td className="px-3 py-2.5 text-center text-xs text-slate-600">{m.jml_ruang_kelas}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">{m.apk_sd > 0 ? m.apk_sd.toFixed(1) : '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">{m.apk_smp > 0 ? m.apk_smp.toFixed(1) : '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">{m.apk_sma > 0 ? m.apk_sma.toFixed(1) : '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">{m.amh > 0 ? m.amh.toFixed(1) : '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">{m.rasio > 0 ? `1:${m.rasio}` : '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {m.bos_count > 0 ? (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">{m.bos_count}</span>
                                            ) : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Methodology Note */}
            <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">📖 Keterangan Indikator</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-600">
                    <p>• <strong>APK</strong> — Angka Partisipasi Kasar per jenjang (Sumber: Kemendikbud, BPS)</p>
                    <p>• <strong>AMH</strong> — Angka Melek Huruf penduduk ≥15 tahun (Sumber: BPS/Susenas)</p>
                    <p>• <strong>APS</strong> — Angka Putus Sekolah, total semua jenjang (Kemendikbud)</p>
                    <p>• <strong>G:M</strong> — Rasio Guru-Murid, standar SPM 1:20 s.d 1:28 (Permendikbud)</p>
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
    const toTenantPath = useTenantPath();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EduData>({ facilities: [], participation: [] });
    const [activeSection, setActiveSection] = useState<"sarana" | "partisipasi" | "analisis">("sarana");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/tenants/${tenant.slug}/data/pendidikan`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok || result.error || !result.data) {
                throw new Error(result.error?.message ?? "Gagal memuat data pendidikan.");
            }
            setData(result.data);
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
                {/* Section Tabs - Grid on mobile, inline on desktop */}
                <div className="grid grid-cols-3 md:flex md:items-center gap-2 md:gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-10">
                    {sections.map((sec) => {
                        const isActive = activeSection === sec.key;
                        const colorMap: Record<string, string> = {
                            indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
                            blue: "bg-blue-50 text-blue-700 border-blue-200",
                            emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
                        };
                        return (
                            <button
                                key={sec.key}
                                onClick={() => setActiveSection(sec.key)}
                                className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2 px-2 md:px-5 py-3 rounded-xl text-xs md:text-sm font-bold transition-all text-center border ${isActive ? colorMap[sec.color] + " shadow-sm" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
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
                        <p className="text-slate-500 font-medium">Memproses data pendidikan...</p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {activeSection === "sarana" && (
                            <SaranaSection facilities={data.facilities} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                        )}
                        {activeSection === "partisipasi" && (
                            <PartisipasiSection participation={data.participation} facilities={data.facilities} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
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
