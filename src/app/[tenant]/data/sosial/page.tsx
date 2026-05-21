
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import type { Kelurahan } from "@/types";
import {
    Activity, ChevronLeft, ChevronDown, HandHeart, Accessibility,
    Home as HomeIcon, Church as ChurchIcon, Users, Banknote, MapPin, Search,
    TrendingUp, Heart
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

// Inline KPI Card (infrastruktur style)
function KpiCard({ label, value, sub, icon: Icon, color, border }: { label: string; value: string | number; sub?: string; icon: any; color: string; border: string }) {
    return (
        <div className={`bg-white p-4 rounded-2xl border ${border} shadow-sm hover:shadow-md transition-all`}>
            <div className={`inline-flex p-2 rounded-xl ${color} mb-3`}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
            <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">{value}</h4>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

const BULAN_LIST = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/* ============================================================
   Section 1: Bantuan Sosial
================================================================ */
function BantuanSection({ assistance, kelurahans, selectedKelurahan }: { assistance: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? assistance.filter(d => d.kelurahan_id === selectedKelurahan) : assistance, [assistance, selectedKelurahan]);

    const totalPenerima = filteredData.reduce((acc, curr) => acc + (Number(curr.jumlah_penerima) || 0), 0);
    const totalAnggaran = filteredData.reduce((acc, curr) => acc + (Number(curr.total_anggaran) || 0), 0);
    const fmtAnggaran = (v: number) => v >= 1e9 ? `Rp ${(v / 1e9).toFixed(2)} M` : v >= 1e6 ? `Rp ${(v / 1e6).toFixed(1)} Jt` : `Rp ${v.toLocaleString("id-ID")}`;
    // KPI: % Realisasi Anggaran (weighted by total_anggaran, bukan by record count)
    const anggaranTersalurkan = filteredData
        .filter(d => d.status_penyaluran === "Tersalurkan")
        .reduce((acc, d) => acc + (Number(d.total_anggaran) || 0), 0);
    const pctRealisasiAnggaran = totalAnggaran > 0 ? (anggaranTersalurkan / totalAnggaran * 100).toFixed(1) : "0.0";
    // Rata-rata realisasi distribusi fisik — hanya record yang memiliki data realisasi
    const withPct = filteredData.filter(d => Number(d.pct_tersalurkan) > 0);
    const avgPct = withPct.length > 0
        ? (withPct.reduce((acc, d) => acc + (Number(d.pct_tersalurkan) || 0), 0) / withPct.length).toFixed(1)
        : "0.0";

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
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
                <KpiCard label="Total Penerima" value={totalPenerima.toLocaleString("id-ID")} sub="Keluarga Penerima Manfaat" icon={Users} color="bg-indigo-50 text-indigo-600" border="border-indigo-100" />
                <KpiCard label="Total Anggaran" value={fmtAnggaran(totalAnggaran)} icon={Banknote} color="bg-emerald-50 text-emerald-600" border="border-emerald-100" />
                <KpiCard label="Realisasi Anggaran" value={`${pctRealisasiAnggaran}%`} sub={`Realisasi fisik rata-rata ${avgPct}%`} icon={HandHeart} color="bg-blue-50 text-blue-600" border="border-blue-100" />
                <KpiCard label="Program Bantuan" value={typeBarData.length} icon={Heart} color="bg-rose-50 text-rose-600" border="border-rose-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Penerima per Jenis Bantuan</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeBarData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toLocaleString("id-ID")} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Penerima"]} />
                                <Bar dataKey="value" name="Penerima" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={50} />
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
                                <Tooltip formatter={(value: number) => value >= 1e9 ? `Rp ${(value / 1e9).toFixed(2)} M` : `Rp ${(value / 1e6).toFixed(1)} Jt`} contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
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
                                <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} />
                                    <Bar dataKey="value" name="Penerima" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
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
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 font-semibold">
                            <tr>
                                <th className="px-5 py-4">Program / Bulan</th>
                                <th className="px-5 py-4">Penerima</th>
                                <th className="px-5 py-4">Total Anggaran</th>
                                <th className="px-5 py-4">Status & Realisasi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, i) => {
                                const pct = Number(row.pct_tersalurkan) || 0;
                                return (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-slate-800">{row.jenis_bantuan}</div>
                                        <div className="text-xs text-slate-500">Tahun {row.tahun} • {BULAN_LIST[Number(row.bulan)] || `Bulan ${row.bulan}`}</div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {kelMap.get(row.kelurahan_id) || "-"}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-700">{row.jumlah_penerima?.toLocaleString("id-ID") || 0}</div>
                                        <div className="text-xs text-slate-500">{row.jumlah_kk_penerima ? `${Number(row.jumlah_kk_penerima).toLocaleString("id-ID")} KK` : "Jiwa"}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-emerald-600">{fmtAnggaran(Number(row.total_anggaran) || 0)}</div>
                                        <div className="text-xs text-slate-500">{row.sumber_anggaran || "-"}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                                            row.status_penyaluran === "Tersalurkan" ? "bg-green-100 text-green-700"
                                            : (row.status_penyaluran === "Proses" || row.status_penyaluran === "Dalam Proses") ? "bg-amber-100 text-amber-700"
                                            : "bg-slate-100 text-slate-600"}`}>
                                            {row.status_penyaluran || "Belum Tersalur"}
                                        </span>
                                        {pct > 0 && (
                                            <div className="mt-2 w-full">
                                                <div className="flex items-center justify-between text-[10px] mb-0.5">
                                                    <span className="text-slate-500">Realisasi Fisik</span>
                                                    <span className="font-bold text-slate-700">{pct.toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-slate-500">Tidak ada data penyaluran bantuan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(filteredData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredData.length}</span>
                            <span className="sm:hidden">{filteredData.length} program</span>
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
   Section 2: Disabilitas
================================================================ */
function DisabilitasSection({ disability, kelurahans, selectedKelurahan }: { disability: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? disability.filter(d => d.kelurahan_id === selectedKelurahan) : disability, [disability, selectedKelurahan]);

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelurahan, searchQuery]);

    const filteredTableData = useMemo(() => {
        return disability.filter(s => {
            if (selectedKelurahan && s.kelurahan_id !== selectedKelurahan) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const kelName = kelMap.get(s.kelurahan_id)?.toLowerCase() || "";
                return (kelName.includes(q)) || (s.jenis_disabilitas?.toLowerCase().includes(q));
            }
            return true;
        }).sort((a,b) => (kelMap.get(a.kelurahan_id) || "").localeCompare(kelMap.get(b.kelurahan_id) || ""));
    }, [disability, selectedKelurahan, searchQuery, kelMap]);

    const totalPages = Math.ceil(filteredTableData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTableData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTableData, currentPage]);

    const totalPenyandang = filteredData.reduce((acc, curr) => acc + (curr.jumlah || 0), 0);
    const totalBantuan = filteredData.reduce((acc, curr) => acc + (curr.penerima_bantuan || 0), 0);
    const persentaseBantuan = totalPenyandang > 0 ? (totalBantuan / totalPenyandang * 100).toFixed(1) : "0.0";
    const totalL = filteredData.reduce((acc, curr) => acc + (curr.laki_laki || 0), 0);
    const totalP = filteredData.reduce((acc, curr) => acc + (curr.perempuan || 0), 0);

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
        return [{ name: "Laki-laki", value: totalL }, { name: "Perempuan", value: totalP }].filter(d => d.value > 0);
    }, [totalL, totalP]);

    const kelTimelineData = useMemo(() => {
        const kelData: Record<string, any> = {};
        if (selectedKelurahan) return [];
        filteredData.forEach(d => {
            const nama = kelMap.get(d.kelurahan_id);
            if (!nama) return;
            if (!kelData[nama]) kelData[nama] = { name: nama, L: 0, P: 0, Total: 0 };
            kelData[nama].L += (d.laki_laki || 0);
            kelData[nama].P += (d.perempuan || 0);
            kelData[nama].Total += (d.jumlah || 0);
        });
        return Object.values(kelData).sort((a, b) => b.Total - a.Total).slice(0, 10);
    }, [filteredData, kelMap, selectedKelurahan]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Penyandang Disabilitas" value={totalPenyandang.toLocaleString("id-ID")} sub="Data terkini terregistrasi" icon={Accessibility} color="bg-indigo-50 text-indigo-600" border="border-indigo-100" />
                <KpiCard label="Penerima Bantuan" value={totalBantuan.toLocaleString("id-ID")} sub="Ref. UU No. 8/2016" icon={HandHeart} color="bg-emerald-50 text-emerald-600" border="border-emerald-100" />
                <KpiCard label="Cakupan Intervensi" value={`${persentaseBantuan}%`} sub="Penerima / Total Penyandang" icon={Activity} color="bg-blue-50 text-blue-600" border="border-blue-100" />
                <KpiCard label="Jenis Terbanyak" value={typeBarData[0]?.name || "-"} sub={`${(typeBarData[0]?.value || 0).toLocaleString("id-ID")} orang`} icon={Users} color="bg-amber-50 text-amber-600" border="border-amber-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Distribusi Jenis Disabilitas</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeBarData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toLocaleString("id-ID")} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Orang"]} />
                                <Bar dataKey="value" name="Jumlah" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Komposisi Gender</h3>
                    <div className="flex-1 relative min-h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={genderPieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {genderPieData.map((d, i) => <Cell key={i} fill={d.name === "Laki-laki" ? "#6366f1" : "#a78bfa"} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Orang"]} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: "40px" }}>
                            <div className="text-center">
                                <span className="block text-2xl font-black text-slate-800">{totalPenyandang.toLocaleString("id-ID")}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                            </div>
                        </div>
                    </div>
                </div>

                {!selectedKelurahan && kelTimelineData.length > 0 && (
                    <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">Sebaran Tertinggi per Kelurahan</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-45} textAnchor="end" axisLine={false} tickLine={false} dy={10} height={60} interval={0} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Orang"]} />
                                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                    <Bar dataKey="L" name="Laki-laki" stackId="a" fill="#6366f1" maxBarSize={40} />
                                    <Bar dataKey="P" name="Perempuan" stackId="a" fill="#a78bfa" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Table Disabilitas */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Daftar Data Penyandang Disabilitas</h3>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari kelurahan, jenis..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Kelurahan</th>
                                <th className="px-6 py-4">Jenis Disabilitas</th>
                                <th className="px-6 py-4 text-right">L / P</th>
                                <th className="px-6 py-4 text-right">Total Kasus</th>
                                <th className="px-6 py-4 text-right">Penerima Bantuan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, i) => (
                                <tr key={row.id || i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-500" />
                                            <span className="font-semibold text-slate-800">{kelMap.get(row.kelurahan_id) || "-"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700">{row.jenis_disabilitas || "-"}</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                                        <span className="text-blue-600">{(row.laki_laki || 0)} L</span> / <span className="text-pink-600">{(row.perempuan || 0)} P</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-rose-600">
                                        {(row.jumlah || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        {(row.penerima_bantuan || 0).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                            {filteredTableData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Search className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                                        <p className="text-sm">Tidak ada data disabilitas</p>
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
        </div>
    );
}

/* ============================================================
   Section 3: Perumahan / RTLH
================================================================ */
function PerumahanSection({ housing, kelurahans, selectedKelurahan }: { housing: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? housing.filter(d => d.kelurahan_id === selectedKelurahan) : housing, [housing, selectedKelurahan]);

    const totalPenerima = filteredData.reduce((total, row) => total + (Number(row.jumlah_penerima) || 0), 0);
    const totalTunai = filteredData
        .filter((row) => row.kategori === "Bantuan Sosial Tunai")
        .reduce((total, row) => total + (Number(row.jumlah_penerima) || 0), 0);
    const totalTidakTerencana = filteredData
        .filter((row) => row.kategori === "Bantuan Sosial Tidak Terencana")
        .reduce((total, row) => total + (Number(row.jumlah_penerima) || 0), 0);
    const years = Array.from(new Set(filteredData.map((row) => Number(row.tahun) || 0))).filter(Boolean).sort((a: number, b: number) => b - a);
    const latestYear = years[0] || new Date().getFullYear();

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [filteredData, currentPage]);

    const kategoriPieData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach((row) => {
            const key = row.kategori || "Lainnya";
            counts[key] = (counts[key] || 0) + (Number(row.jumlah_penerima) || 0);
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredData]);

    const kelBarData = useMemo(() => {
        if (selectedKelurahan) return [];
        const counts: Record<string, { name: string; Tunai: number; TidakTerencana: number; Total: number }> = {};
        filteredData.forEach((row) => {
            const nama = kelMap.get(row.kelurahan_id);
            if (!nama) return;
            if (!counts[nama]) counts[nama] = { name: nama, Tunai: 0, TidakTerencana: 0, Total: 0 };
            const jumlah = Number(row.jumlah_penerima) || 0;
            if (row.kategori === "Bantuan Sosial Tunai") {
                counts[nama].Tunai += jumlah;
            } else {
                counts[nama].TidakTerencana += jumlah;
            }
            counts[nama].Total += jumlah;
        });
        return Object.values(counts).sort((a, b) => b.Total - a.Total).slice(0, 10);
    }, [filteredData, kelMap, selectedKelurahan]);

    const yearBarData = useMemo(() => {
        const counts: Record<number, number> = {};
        filteredData.forEach((row) => {
            const year = Number(row.tahun) || 0;
            if (!year) return;
            counts[year] = (counts[year] || 0) + (Number(row.jumlah_penerima) || 0);
        });
        return Object.entries(counts)
            .map(([year, value]) => ({ year, value }))
            .sort((a, b) => Number(a.year) - Number(b.year));
    }, [filteredData]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Penerima" value={totalPenerima.toLocaleString("id-ID")} sub={`Data terakhir tahun ${latestYear}`} icon={HomeIcon} color="bg-indigo-50 text-indigo-600" border="border-indigo-100" />
                <KpiCard label="Bansos Tunai" value={totalTunai.toLocaleString("id-ID")} sub="Penerima bantuan terdata" icon={Users} color="bg-emerald-50 text-emerald-600" border="border-emerald-100" />
                <KpiCard label="Tidak Terencana" value={totalTidakTerencana.toLocaleString("id-ID")} sub="Penerima bantuan insidental" icon={Activity} color="bg-amber-50 text-amber-600" border="border-amber-100" />
                <KpiCard label="Kategori Aktif" value={kategoriPieData.length.toLocaleString("id-ID")} sub="Jenis program RTLH" icon={TrendingUp} color="bg-blue-50 text-blue-600" border="border-blue-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Sebaran Penerima RTLH per Kelurahan</h3>
                    {kelBarData.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-45} textAnchor="end" axisLine={false} tickLine={false} dy={10} height={60} interval={0} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toLocaleString("id-ID")} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Penerima"]} />
                                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                    <Bar dataKey="Tunai" name="Bantuan Sosial Tunai" stackId="a" fill="#6366f1" maxBarSize={40} />
                                    <Bar dataKey="TidakTerencana" name="Bantuan Sosial Tidak Terencana" stackId="a" fill="#a78bfa" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Pilih semua kelurahan untuk melihat perbandingan</div>
                    )}
                </div>
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Komposisi Kategori Bantuan</h3>
                    <div className="h-72 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={kategoriPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {kategoriPieData.map((_, i) => <Cell key={i} fill={["#6366f1", "#a78bfa", "#c4b5fd", "#818cf8"][i % 4]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => `${v.toLocaleString("id-ID")} penerima`} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px" }} />
                                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6">
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800">{totalPenerima.toLocaleString("id-ID")}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Penerima</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-6">Tren Penerima RTLH per Tahun</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearBarData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toLocaleString("id-ID")} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Penerima"]} />
                            <Bar dataKey="value" name="Penerima" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={52} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800">Ringkasan Penerima RTLH</h3>
                    <span className="text-xs font-bold text-indigo-600 px-3 py-1 bg-indigo-100 rounded-lg">{totalPenerima.toLocaleString("id-ID")} penerima</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 font-semibold">
                            <tr>
                                <th className="px-5 py-4">Tahun / Kelurahan</th>
                                <th className="px-5 py-4">Kategori</th>
                                <th className="px-5 py-4">Jumlah Penerima</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, i) => {
                                const totalRow = Number(row.jumlah_penerima) || 0;
                                return (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-800">{kelMap.get(row.kelurahan_id) || "-"}</div>
                                            <div className="text-xs text-slate-500">Tahun {row.tahun}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                row.kategori === "Bantuan Sosial Tunai"
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                            }`}>
                                                {row.kategori}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-bold text-slate-700">{totalRow.toLocaleString("id-ID")} penerima</td>
                                    </tr>
                                );
                            })}
                            {paginatedData.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-slate-500">Tidak ada ringkasan penerima RTLH.</td></tr>}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(filteredData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredData.length}</span>
                            <span className="sm:hidden">{filteredData.length} ringkasan</span>
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
   Section 4: Tempat Ibadah
================================================================ */
function KeagamaanSection({ religious, kelurahans, selectedKelurahan }: { religious: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const filteredData = useMemo(() => selectedKelurahan ? religious.filter(d => d.kelurahan_id === selectedKelurahan) : religious, [religious, selectedKelurahan]);

    const totalIbadah = filteredData.length;
    const totalMasjid = filteredData.filter(d => d.jenis === "Masjid" || d.jenis === "Musholla").length;
    const totalGereja = filteredData.filter(d => (d.jenis || "").toLowerCase().includes("gereja")).length;
    const totalLainnya = totalIbadah - totalMasjid - totalGereja;
    const lainnyaTypes = Array.from(new Set(filteredData.filter(d => d.jenis !== "Masjid" && d.jenis !== "Musholla" && !(d.jenis || "").toLowerCase().includes("gereja")).map(d => d.jenis))).filter(Boolean).slice(0, 3).join(", ") || "Pura, Vihara, dll";

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
                <KpiCard label="Total Tempat Ibadah" value={totalIbadah.toLocaleString("id-ID")} sub="Seluruh jenis" icon={ChurchIcon} color="bg-indigo-50 text-indigo-600" border="border-indigo-100" />
                <KpiCard label="Masjid / Musholla" value={totalMasjid.toLocaleString("id-ID")} sub="Termasuk Musholla" icon={ChurchIcon} color="bg-emerald-50 text-emerald-600" border="border-emerald-100" />
                <KpiCard label="Gereja" value={totalGereja.toLocaleString("id-ID")} sub="Katolik & Protestan" icon={ChurchIcon} color="bg-amber-50 text-amber-600" border="border-amber-100" />
                <KpiCard label="Lainnya" value={totalLainnya.toLocaleString("id-ID")} sub={lainnyaTypes} icon={ChurchIcon} color="bg-blue-50 text-blue-600" border="border-blue-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Komposisi Jenis</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {typePieData.map((_, i) => <Cell key={i} fill={["#6366f1", "#818cf8", "#a78bfa", "#c4b5fd", "#e0e7ff", "#4f46e5", "#7c3aed", "#8b5cf6"][i % 8]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Tempat"]} />
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
                                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Tempat"]} />
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
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px" }} cursor={{ fill: "#f8fafc" }} formatter={(v: number) => [v.toLocaleString("id-ID"), "Tempat"]} />
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
                        <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all overflow-hidden group">
                            {/* Gradient Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white text-sm line-clamp-1">{item.nama}</h4>
                                    <p className="text-[10px] text-white/70 font-mono mt-0.5">{item.jenis}</p>
                                </div>
                                {item.kondisi && (
                                    <span className="shrink-0 ml-2 px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold border border-white/30">{item.kondisi}</span>
                                )}
                            </div>

                            <div className="p-4">
                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-indigo-50 text-indigo-600 border-indigo-200">{item.jenis}</span>
                                    {item.status_tanah && (
                                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-200">{item.status_tanah}</span>
                                    )}
                                </div>

                                {/* Stats */}
                                {(item.kapasitas || item.tahun_berdiri) && (
                                    <div className={`grid ${item.kapasitas && item.tahun_berdiri ? 'grid-cols-2' : 'grid-cols-1'} gap-1 bg-slate-50 rounded-lg p-2.5 mb-2.5`}>
                                        {item.kapasitas && (
                                            <div className="text-center">
                                                <p className="text-sm font-black text-indigo-600">{Number(item.kapasitas).toLocaleString("id-ID")}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Kapasitas</p>
                                            </div>
                                        )}
                                        {item.tahun_berdiri && (
                                            <div className="text-center">
                                                <p className="text-sm font-black text-indigo-600">{item.tahun_berdiri}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Tahun Berdiri</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
                                    <div className="flex items-center text-[10px] text-slate-500 gap-1">
                                        <MapPin className="w-3 h-3" /> {kelMap.get(item.kelurahan_id) || "-"}
                                    </div>
                                    {item.alamat && (
                                        <p className="text-[10px] text-slate-400 line-clamp-1">{item.alamat}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {paginatedData.length === 0 && <div className="p-8 text-center text-slate-500 bg-slate-50/50">Tidak ada tempat ibadah yang cocok.</div>}
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(searchedData.length, currentPage * ITEMS_PER_PAGE)} dari {searchedData.length}</span>
                            <span className="sm:hidden">{searchedData.length} tempat ibadah</span>
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
                rtlh_penerima: housing.filter(d => d.kelurahan_id === k.id).reduce((s, r) => s + (r.jumlah_penerima || 0), 0),
                tempat_ibadah: religious.filter(d => d.kelurahan_id === k.id).length,
                skor: 0
            };
        });

        // Calculate scores (1-100 relative to max)
        const maxBantuan = Math.max(...Object.values(stats).map(s => s.bantuan), 1);
        const maxDisabilitas = Math.max(...Object.values(stats).map(s => s.disabilitas), 1);
        const maxRtlh = Math.max(...Object.values(stats).map(s => s.rtlh_penerima), 1);
        const maxIbadah = Math.max(...Object.values(stats).map(s => s.tempat_ibadah), 1);

        Object.values(stats).forEach(s => {
            s.skorBantuan = (s.bantuan / maxBantuan) * 100;
            s.skorDisabilitas = (s.disabilitas / maxDisabilitas) * 100;
            s.skorRtlh = (s.rtlh_penerima / maxRtlh) * 100;
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
            { subject: "Penerima RTLH", A: current.skorRtlh, B: avgRtlh, fullMark: 100 },
            { subject: "Tempat Ibadah", A: current.skorIbadah, B: kelStats.reduce((s, k) => s + k.skorIbadah, 0) / kelStats.length || 0, fullMark: 100 }
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
                                <Tooltip contentStyle={{ borderRadius: 12, fontSize: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} formatter={(v: number) => v.toFixed(1)} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">Indeks Kerentanan Sosial</h3>
                    <p className="text-sm text-slate-500 mb-4">Skor komposit dari beban bantuan sosial, penyandang disabilitas, dan jumlah penerima bantuan RTLH.</p>

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
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                                    <div className={`h-full rounded-full ${k.skor >= 70 ? 'bg-rose-500' : k.skor >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(k.skor, 100)}%` }}></div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100/60">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Bantuan</div>
                                        <div className="text-xs font-bold text-slate-700">{k.bantuan.toLocaleString("id-ID")} org</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Disabilitas</div>
                                        <div className="text-xs font-bold text-slate-700">{k.disabilitas.toLocaleString("id-ID")} org</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">RTLH</div>
                                        <div className="text-xs font-bold text-rose-600">{k.rtlh_penerima.toLocaleString("id-ID")} warga</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">T. Ibadah</div>
                                        <div className="text-xs font-bold text-indigo-600">{k.tempat_ibadah.toLocaleString("id-ID")}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Methodology note */}
            <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 leading-relaxed space-y-2">
                <p className="font-bold text-slate-700 text-sm">Metodologi Indeks Kerentanan Sosial</p>
                <p>Indeks ini merupakan skor komposit tertimbang yang mengukur tingkat kebutuhan intervensi sosial suatu kelurahan, skala 0–100. Setiap indikator dinormalisasi terhadap nilai tertinggi antar kelurahan (min-max normalization):</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><span className="font-semibold text-slate-700">Beban Bantuan (30%)</span> — Total penerima bantuan sosial (KPM) relatif terhadap kelurahan dengan penerima tertinggi.</li>
                    <li><span className="font-semibold text-slate-700">Beban Disabilitas (30%)</span> — Jumlah penyandang disabilitas relatif terhadap kelurahan dengan jumlah tertinggi.</li>
                    <li><span className="font-semibold text-slate-700">Kebutuhan RTLH (40%)</span> — Jumlah warga penerima bantuan RTLH relatif terhadap kelurahan tertinggi. Bobot terbesar karena menyangkut pemenuhan hak dasar hunian layak (UU No. 1/2011 tentang Perumahan dan Kawasan Permukiman).</li>
                </ul>
                <p className="text-slate-400">Formula: <span className="font-mono bg-slate-100 px-1 rounded">Skor = (Bantuan × 0.3) + (Disabilitas × 0.3) + (RTLH × 0.4)</span>. Skor lebih tinggi = perlu prioritas intervensi lebih besar.</p>
                <p className="text-slate-400 italic">Catatan: Dimensi "Tempat Ibadah" pada radar chart bersifat informatif dan tidak masuk dalam perhitungan skor kerentanan.</p>
            </div>
        </div>
    );
}

/* ============================================================
   Main Page Component
================================================================ */
export default function SosialPage() {
    const { tenant, kelurahans } = useTenant();
    const toTenantPath = useTenantPath();
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
                const response = await fetch(`/api/tenants/${tenant.slug}/data/sosial`, { cache: "no-store" });
                const result = await response.json();
                if (!response.ok || result.error || !result.data) {
                    throw new Error(result.error?.message ?? "Gagal memuat data sosial.");
                }

                setAssistanceData(result.data.assistance || []);
                setDisabilityData(result.data.disability || []);
                setHousingData(result.data.housing || []);
                setReligiousData(result.data.religious || []);
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
                {/* Navigation Tabs - 3+2 grid on mobile, single row on desktop */}
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-8">
                    {sections.map((section, idx) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`${
                                // Last 2 items (index 3,4) span the full width in a sub-grid on mobile
                                idx >= 3 ? "col-span-3 sm:col-span-1 sm:flex-1" : "sm:flex-1"
                            } flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${
                                activeSection === section.id
                                    ? section.id === "analisis" ? "bg-slate-800 text-white shadow-md border-slate-700 ring-1 ring-slate-900/10" : "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10"
                                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            <section.icon className={`w-4 h-4 flex-shrink-0 ${activeSection === section.id ? "" : "opacity-50"}`} />
                            <span className="leading-tight">{section.label}</span>
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
