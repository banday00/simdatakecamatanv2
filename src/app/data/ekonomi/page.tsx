"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import type { Kelurahan } from "@/types";
import {
    ChevronLeft, TrendingUp, MapPin, Building2, Store,
    Briefcase, Activity, Target, Factory, ArrowUpRight,
    Search, Users, PieChart as PieChartIcon, BarChart3,
    AlertTriangle, ShoppingCart, Info, Award, ChevronDown
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    LineChart, Line, AreaChart, Area, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const THEME = {
    gradient: "from-indigo-500 to-indigo-700",
    bgGradient: "bg-digital-batik",
    lightBg: "bg-indigo-50",
    textColor: "text-indigo-700",
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#14b8a6", "#ec4899", "#84cc16"];
const KELURAHAN_ICONS = ["🏘️", "🏠", "🏡", "🏢", "🏫", "🏛️", "🏗️", "🏟️"];

function StatCard({ label, value, icon: Icon, color = "indigo", subtitle }: { label: string; value: string | number; icon: any; color?: string; subtitle?: string }) {
    return (
        <div className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden relative flex flex-col justify-center min-h-[130px]">
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-${color}-500`} />
            <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl bg-${color}-50 text-${color}-600`}>
                    <Icon className="w-7 h-7" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 mt-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-3xl font-black text-slate-800 truncate leading-tight">{value}</h4>
                        {subtitle && <span className="text-xs text-slate-500 font-semibold">{subtitle}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SEKTOR USAHA
// ─────────────────────────────────────────────────────────────────────────────
function SektorSection({ sectors, kelurahans, selectedKelurahan }: { sectors: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelurahan, searchQuery]);

    const filteredTableData = useMemo(() => {
        return sectors.filter(s => {
            if (selectedKelurahan && s.kelurahan_id !== selectedKelurahan) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const kelName = kelMap.get(s.kelurahan_id)?.toLowerCase() || "";
                return (s.sektor?.toLowerCase().includes(q)) || (s.tahun?.toString().includes(q)) || (kelName.includes(q));
            }
            return true;
        }).sort((a,b) => b.tahun - a.tahun || (b.jumlah_usaha || 0) - (a.jumlah_usaha || 0));
    }, [sectors, selectedKelurahan, searchQuery, kelMap]);

    const totalPages = Math.ceil(filteredTableData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTableData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTableData, currentPage]);

    // Filter by kelurahan & get latest year data
    const filteredByKelurahan = selectedKelurahan ? sectors.filter(s => s.kelurahan_id === selectedKelurahan) : sectors;
    const years = Array.from(new Set(filteredByKelurahan.map(s => s.tahun))).sort((a, b) => b - a);
    const latestYear = years[0] || new Date().getFullYear();
    const latestData = filteredByKelurahan.filter(s => s.tahun === latestYear);

    // Stats
    const totalUsaha = latestData.reduce((acc, curr) => acc + (curr.jumlah_usaha || 0), 0);
    const totalTenagaKerja = latestData.reduce((acc, curr) => acc + (curr.jumlah_tenaga_kerja || 0), 0);
    const uniqueSectors = Array.from(new Set(latestData.map(s => s.sektor)));

    // Sector Aggregation (Group by Sektor)
    const sektorMap = new Map<string, { jumlah_usaha: number; jumlah_tenaga_kerja: number }>();
    latestData.forEach(d => {
        const key = d.sektor || "Lainnya";
        const curr = sektorMap.get(key) || { jumlah_usaha: 0, jumlah_tenaga_kerja: 0 };
        sektorMap.set(key, {
            jumlah_usaha: curr.jumlah_usaha + (d.jumlah_usaha || 0),
            jumlah_tenaga_kerja: curr.jumlah_tenaga_kerja + (d.jumlah_tenaga_kerja || 0),
        });
    });

    const sektorChartData = Array.from(sektorMap.entries()).map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        full_name: name,
        ...data
    })).sort((a, b) => b.jumlah_usaha - a.jumlah_usaha);

    // multi-year trend for Top 3 sectors
    const top3Sectors = sektorChartData.slice(0, 3).map(s => s.full_name);
    const trendDataRaw = new Map<number, any>();
    filteredByKelurahan.forEach(d => {
        if (!top3Sectors.includes(d.sektor)) return;
        if (!trendDataRaw.has(d.tahun)) trendDataRaw.set(d.tahun, { tahun: d.tahun });
        const entry = trendDataRaw.get(d.tahun);
        entry[d.sektor] = (entry[d.sektor] || 0) + (d.jumlah_usaha || 0);
    });
    const trendData = Array.from(trendDataRaw.values()).sort((a, b) => a.tahun - b.tahun);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Usaha', value: totalUsaha.toLocaleString('id-ID'), sub: `Tahun ${latestYear}`, icon: Store, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
                    { label: 'Tenaga Kerja', value: totalTenagaKerja.toLocaleString('id-ID'), sub: `Tahun ${latestYear}`, icon: Users, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
                    { label: 'Sektor Usaha', value: uniqueSectors.length, sub: 'Aktif terdata', icon: Factory, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Rerata TK/Usaha', value: totalUsaha > 0 ? (totalTenagaKerja / totalUsaha).toFixed(1) : '0', sub: 'Orang per usaha', icon: Briefcase, color: 'bg-violet-50 text-violet-600', border: 'border-violet-100' },
                ].map((item) => (
                    <div key={item.label} className={`bg-white p-4 rounded-2xl border ${item.border} shadow-sm hover:shadow-md transition-all`}>
                        <div className={`inline-flex p-2 rounded-xl ${item.color} mb-3`}>
                            <item.icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{item.label}</p>
                        <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">{item.value}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Bar Chart Sektor */}
                <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
                    <div className="mb-6">
                        <h3 className="text-base font-bold text-slate-800">Distribusi Usaha per Sektor</h3>
                        <p className="text-xs text-slate-500">Jumlah entitas usaha tersebar di seluruh kelurahan</p>
                    </div>
                    <div className="flex-1 w-full relative">
                        {sektorChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <BarChart data={sektorChartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="jumlah_usaha" name="Jumlah Usaha" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                        {sektorChartData.map((d, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <Activity className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-sm">Belum ada data sektor usaha</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie Chart Tenaga Kerja */}
                <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-slate-800">Serapan Tenaga Kerja</h3>
                        <p className="text-xs text-slate-500">Komposisi pekerja berdasar sektor</p>
                    </div>
                    <div className="flex-1 relative">
                        {sektorChartData.length > 0 && totalTenagaKerja > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={sektorChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="jumlah_tenaga_kerja">
                                        {sektorChartData.map((d, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`${value.toLocaleString('id-ID')} orang`, 'Tenaga Kerja']} contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "10px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Tidak ada serapan pekerja</div>
                        )}
                        {sektorChartData.length > 0 && totalTenagaKerja > 0 && (
                            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <span className="block text-xl font-extrabold text-slate-800">{totalTenagaKerja > 1000 ? (totalTenagaKerja / 1000).toFixed(1) + 'k' : totalTenagaKerja}</span>
                                <span className="text-[9px] text-slate-500 uppercase font-bold">Pekerja</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
                <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-800">Tren Pertumbuhan Top 3 Sektor</h3>
                    <p className="text-xs text-slate-500">Berdasarkan data historis {years.length} tahun terakhir</p>
                </div>
                <div className="flex-1" style={{ minHeight: 250 }}>
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '12px', border: '1px solid #e2e8f0' }} />
                                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                {top3Sectors.map((s, i) => (
                                    <Line key={s} type="monotone" dataKey={s} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Data historis tidak mencukupi untuk tren multi-tahun.</div>
                    )}
                </div>
            </div>

            {/* Data Table Sektor Usaha */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Daftar Data Sektor Usaha</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari sektor, tahun, kelurahan..."
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
                                <th className="px-6 py-4 font-bold">Sektor Usaha</th>
                                <th className="px-6 py-4 font-bold text-center">Tahun</th>
                                <th className="px-6 py-4 font-bold text-right">Jumlah Usaha</th>
                                <th className="px-6 py-4 font-bold text-right">Tenaga Kerja</th>
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
                                    <td className="px-6 py-4">
                                        <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                                            {row.sektor || "Lainnya"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">{row.tahun}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        {(row.jumlah_usaha || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-600">
                                        {row.jumlah_tenaga_kerja ? row.jumlah_tenaga_kerja.toLocaleString('id-ID') : "-"}
                                    </td>
                                </tr>
                            ))}
                            {filteredTableData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
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
                            <span className="sm:hidden">{filteredTableData.length} data sektor</span>
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


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SARANA EKONOMI
// ─────────────────────────────────────────────────────────────────────────────
function SaranaSection({ facilities, kelurahans, selectedKelurahan }: { facilities: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelurahan, searchQuery]);

    const filteredData = useMemo(() => {
        return facilities.filter(f => {
            if (selectedKelurahan && f.kelurahan_id !== selectedKelurahan) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (f.nama?.toLowerCase().includes(q)) || (f.jenis_nama?.toLowerCase().includes(q));
            }
            return true;
        });
    }, [facilities, selectedKelurahan, searchQuery]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    const jenisCount = new Map<string, number>();
    filteredData.forEach(d => {
        const j = d.jenis_nama || "Lainnya";
        jenisCount.set(j, (jenisCount.get(j) || 0) + 1);
    });
    const jenisChartData = Array.from(jenisCount.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Most dominant type
    const topJenis = jenisChartData[0]?.name || "-";

    const kelCount = new Map<string, number>();
    filteredData.forEach(d => {
        const kn = kelMap.get(d.kelurahan_id) || "Lainnya";
        kelCount.set(kn, (kelCount.get(kn) || 0) + 1);
    });
    const kelChartData = Array.from(kelCount.entries()).map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { label: 'Total Sarana', value: filteredData.length.toLocaleString(), sub: 'Unit terdata', icon: Building2, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
                    { label: 'Kategori Terbanyak', value: topJenis, sub: `${jenisChartData[0]?.value || 0} unit`, icon: TrendingUp, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Jenis Sarana', value: jenisChartData.length, sub: 'Kategori berbeda', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
                ].map((item) => (
                    <div key={item.label} className={`bg-white p-4 rounded-2xl border ${item.border} shadow-sm hover:shadow-md transition-all`}>
                        <div className={`inline-flex p-2 rounded-xl ${item.color} mb-3`}>
                            <item.icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{item.label}</p>
                        <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">{item.value}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Distribusi per Wilayah</h3>
                    <div className="flex-1 relative">
                        {kelChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="nama" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="jumlah" name="Jumlah Sarana" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Tidak ada data distribusi wilayah</div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Komposisi Sarana</h3>
                    <div className="flex-1 relative">
                        {jenisChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={jenisChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value">
                                        {jenisChartData.map((d, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: "12px" }} />
                                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "10px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Tidak ada komposisi jenis</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Daftar Sarana Ekonomi</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama atau jenis..."
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
                                <th className="px-6 py-4 font-bold">Nama Sarana</th>
                                <th className="px-6 py-4 font-bold">Jenis Sarana</th>
                                <th className="px-6 py-4 font-bold max-w-sm">Alamat Lengkap</th>
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
                                    <td className="px-6 py-4 font-bold text-slate-800">
                                        {row.nama || "Tanpa Nama"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                                            {row.jenis_nama || "Lainnya"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 max-w-sm truncate">
                                        {row.alamat || "-"}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
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
                            <span className="hidden sm:inline">Menampilkan {Math.min(filteredData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredData.length}</span>
                            <span className="sm:hidden">{filteredData.length} sarana</span>
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


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: POTENSI UMKM
// ─────────────────────────────────────────────────────────────────────────────
function UmkmSection({ potentials, kelurahans, selectedKelurahan }: { potentials: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = new Map<string, string>();
    kelurahans.forEach(k => kelMap.set(k.id, k.nama));

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelurahan, searchQuery]);

    const filteredData = useMemo(() => {
        return potentials.filter(f => {
            if (selectedKelurahan && f.kelurahan_id !== selectedKelurahan) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (f.nama_usaha?.toLowerCase().includes(q)) || (f.jenis_usaha?.toLowerCase().includes(q)) || (f.pemilik?.toLowerCase().includes(q));
            }
            return true;
        });
    }, [potentials, selectedKelurahan, searchQuery]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    const totalActive = filteredData.filter(d => d.status?.toString().toLowerCase() === 'aktif').length;
    const totalOmzet = filteredData.reduce((acc, curr) => acc + (Number(curr.omzet_per_bulan) || 0), 0);
    const totalPekerja = filteredData.reduce((acc, curr) => acc + (curr.jumlah_tenaga_kerja || 0), 0);
    const prcActive = filteredData.length > 0 ? Math.round((totalActive / filteredData.length) * 100) : 0;

    // Top 10 by Omzet
    const top10Omzet = [...filteredData]
        .filter(d => Number(d.omzet_per_bulan) > 0)
        .sort((a, b) => Number(b.omzet_per_bulan) - Number(a.omzet_per_bulan))
        .slice(0, 5) // Reduced to Top 5 for better viz
        .map(d => ({
            name: d.nama_usaha?.length > 15 ? d.nama_usaha.substring(0, 15) : d.nama_usaha,
            omzet: Number(d.omzet_per_bulan)
        }));

    // Status Pie
    const statusData = [
        { name: 'Aktif', value: totalActive },
        { name: 'Tidak Aktif', value: filteredData.length - totalActive }
    ];

    const formatRupiah = (val: number) => {
        if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)} M`;
        if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)} Jt`;
        return `Rp ${val.toLocaleString()}`;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total UMKM Terdata', value: filteredData.length, sub: 'Unit usaha', icon: Store, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
                    { label: 'UMKM Aktif', value: `${prcActive}%`, sub: `${totalActive} unit aktif`, icon: Activity, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
                    { label: 'Estimasi Omzet Binaan', value: formatRupiah(totalOmzet), sub: 'Total omzet bulanan', icon: Briefcase, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Serapan Pekerja', value: totalPekerja.toLocaleString(), sub: 'Tenaga kerja', icon: Users, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
                ].map((item) => (
                    <div key={item.label} className={`bg-white p-4 rounded-2xl border ${item.border} shadow-sm hover:shadow-md transition-all`}>
                        <div className={`inline-flex p-2 rounded-xl ${item.color} mb-3`}>
                            <item.icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{item.label}</p>
                        <h4 className="text-xl font-extrabold text-slate-800 mt-0.5">{item.value}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[350px] flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-2">Top 5 UMKM dengan Omzet Tertinggi</h3>
                    <p className="text-xs text-slate-500 mb-6">Berdasarkan hasil konfirmasi evaluasi bulanan</p>
                    <div className="flex-1 relative">
                        {top10Omzet.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={top10Omzet} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" tickFormatter={formatRupiah} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(val: number) => [formatRupiah(val), 'Omzet']}
                                        contentStyle={{ borderRadius: 8, fontSize: '12px' }}
                                    />
                                    <Bar dataKey="omzet" fill="#34d399" radius={[0, 4, 4, 0]} barSize={24}>
                                        {top10Omzet.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Belum ada data omzet tersedia</div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[350px] flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Status Keaktifan UMKM</h3>
                    <div className="flex-1 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value">
                                    <Cell fill="#10b981" />
                                    <Cell fill="#cbd5e1" />
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '12px' }} />
                                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                            <span className="block text-3xl font-black text-indigo-600">{prcActive}%</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Aktif</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Table UMKM */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Direktori UMKM</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari UMKM..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-5 py-3 rounded-tl-lg">Nama Usaha / Pemilik</th>
                                <th className="px-5 py-3">Jenis Usaha</th>
                                <th className="px-5 py-3">Omzet Bln</th>
                                <th className="px-5 py-3 text-center">Pekerja</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 rounded-tr-lg">Wilayah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, i) => (
                                <tr key={row.id || i} className="hover:bg-slate-50/50">
                                    <td className="px-5 py-3">
                                        <div className="font-bold text-slate-800">{row.nama_usaha || "-"}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Users className="w-3 h-3" /> {row.pemilik || "Tanpa data pemilik"}</div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                                            {row.jenis_usaha || "-"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 font-medium text-indigo-600">{formatRupiah(Number(row.omzet_per_bulan) || 0)}</td>
                                    <td className="px-5 py-3 text-center text-slate-600">{row.jumlah_tenaga_kerja || 0}</td>
                                    <td className="px-5 py-3 text-center">
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                                            row.status?.toString().toLowerCase() === 'aktif'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : row.status?.toString().toLowerCase() === 'tutup'
                                                ? 'bg-slate-100 text-slate-600'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {(row.status || 'tdk diketahui').toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-slate-500 text-xs">
                                        {kelMap.get(row.kelurahan_id) || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(filteredData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredData.length, currentPage * ITEMS_PER_PAGE)} dari {filteredData.length}</span>
                            <span className="sm:hidden">{filteredData.length} UMKM</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">←</button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">→</button>
                        </div>
                    </div>
                )}
                {filteredData.length === 0 && (
                    <div className="py-12 text-center text-slate-400">
                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">Pencarian tidak menemukan UMKM.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: ANALISIS & INSIGHT
// ─────────────────────────────────────────────────────────────────────────────
function AnalisisSection({ sectors, facilities, potentials, kelurahans, selectedKelurahan }: { sectors: any[]; facilities: any[]; potentials: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {

    // Build combined analytical records per kelurahan
    const analyticsMap = new Map<string, { id: string, name: string, umkm: number, sarana: number, usaha: number, score: number }>();

    kelurahans.forEach(k => {
        analyticsMap.set(k.id, { id: k.id, name: k.nama, umkm: 0, sarana: 0, usaha: 0, score: 0 });
    });

    potentials.forEach(p => {
        if (p.kelurahan_id && analyticsMap.has(p.kelurahan_id)) {
            analyticsMap.get(p.kelurahan_id)!.umkm += 1;
        }
    });

    facilities.forEach(f => {
        if (f.kelurahan_id && analyticsMap.has(f.kelurahan_id)) {
            analyticsMap.get(f.kelurahan_id)!.sarana += 1;
        }
    });

    sectors.forEach(s => {
        if (s.kelurahan_id && analyticsMap.has(s.kelurahan_id)) {
            analyticsMap.get(s.kelurahan_id)!.usaha += (s.jumlah_usaha || 0);
        }
    });

    // Score computation
    let maxUmkm = 0, maxSarana = 0, maxUsaha = 0;
    const records = Array.from(analyticsMap.values());
    records.forEach(r => {
        if (r.umkm > maxUmkm) maxUmkm = r.umkm;
        if (r.sarana > maxSarana) maxSarana = r.sarana;
        if (r.usaha > maxUsaha) maxUsaha = r.usaha;
    });

    records.forEach(r => {
        const scoreUmkm = maxUmkm > 0 ? (r.umkm / maxUmkm) * 100 : 0;
        const scoreSarana = maxSarana > 0 ? (r.sarana / maxSarana) * 100 : 0;
        const scoreUsaha = maxUsaha > 0 ? (r.usaha / maxUsaha) * 100 : 0;
        r.score = Math.round((scoreUmkm * 0.4) + (scoreSarana * 0.3) + (scoreUsaha * 0.3));
    });

    const rankedRecords = [...records].sort((a, b) => b.score - a.score);

    // Radar Data
    const focusKelurahanId = selectedKelurahan || (rankedRecords[0]?.id);
    const focusRecord = records.find(r => r.id === focusKelurahanId);

    const radarData = [
        { subject: 'Indeks UMKM', A: focusRecord ? (maxUmkm > 0 ? (focusRecord.umkm / maxUmkm) * 100 : 0) : 0, fullMark: 100 },
        { subject: 'Daya Dukung Sarana', A: focusRecord ? (maxSarana > 0 ? (focusRecord.sarana / maxSarana) * 100 : 0) : 0, fullMark: 100 },
        { subject: 'Volume Usaha', A: focusRecord ? (maxUsaha > 0 ? (focusRecord.usaha / maxUsaha) * 100 : 0) : 0, fullMark: 100 },
        { subject: 'Agregat Skor', A: focusRecord?.score || 0, fullMark: 100 },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[400px] flex flex-col">
                    <h3 className="text-base font-bold text-slate-800 mb-2">Profil Agregat Wilayah</h3>
                    <p className="text-xs text-slate-500 mb-6 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                        <MapPin className="w-4 h-4 text-indigo-500" />
                        Menampilkan profil: <strong className="text-indigo-700">{focusRecord?.name || "-"}</strong>
                    </p>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name={focusRecord?.name} dataKey="A" stroke="#10b981" fill="#34d399" fillOpacity={0.4} strokeWidth={2} />
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '11px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                            <Award className="w-5 h-5 text-amber-500" /> Peringkat Kinerja Ekonomi Kelurahan
                        </h3>
                        <p className="text-xs text-slate-500">Skor gabungan berdasarkan jumlah UMKM (40%), ketersediaan sarana (30%), dan kapasitas usaha (30%) — metode <em>min-max normalization</em> relatif antar-kelurahan.</p>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[500px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-3 text-slate-500 text-xs w-12 text-center">Rnk</th>
                                    <th className="px-5 py-3 text-slate-500 text-xs">Kelurahan</th>
                                    <th className="px-5 py-3 text-slate-500 text-xs text-center">Vol. UMKM</th>
                                    <th className="px-5 py-3 text-slate-500 text-xs text-center">Skor Agregat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rankedRecords.map((r, i) => (
                                    <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${selectedKelurahan === r.id ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="px-5 py-3 font-medium text-center text-slate-400">{i + 1}</td>
                                        <td className="px-5 py-3 font-bold text-slate-800">{r.name}</td>
                                        <td className="px-5 py-3 text-center text-slate-600">{r.umkm}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${r.score}%` }} />
                                                </div>
                                                <span className="w-8 text-right font-black text-indigo-700">{r.score}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Catatan Metodologi */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500" /> Catatan Metodologi
                </h4>
                <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                    <p><strong>Skor Kinerja Ekonomi</strong> dihitung menggunakan metode <em>min-max normalization</em> dengan bobot: <strong>UMKM Terdata (40%)</strong>, <strong>Sarana Ekonomi (30%)</strong>, dan <strong>Volume Usaha Sektor (30%)</strong>.</p>
                    <p>Skor ini bersifat <strong>komparatif relatif</strong> antar-kelurahan dalam satu kota — bukan indeks absolut resmi dari BPS. Kelurahan dengan skor tertinggi (100) artinya unggul di ketiga dimensi tersebut dibandingkan kelurahan lain.</p>

                </div>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// PAGE MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EkonomiPage() {
    const { tenant, kelurahans } = useTenant();

    // States
    const [sectors, setSectors] = useState<any[]>([]);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [potentials, setPotentials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"sektor" | "sarana" | "umkm" | "analisis">("sektor");

    // Fetch
    const fetchData = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);
        try {
            const supabase = createClient();

            const [secRes, facRes, potRes, refRes] = await Promise.all([
                supabase.schema("sidakota").from("econ_business_sectors").select("*").eq("tenant_id", tenant.id),
                (supabase as any).schema("sidakota").from("econ_facilities").select("*, ref_ekonomi_sarana:jenis_id(id, nama)").eq("tenant_id", tenant.id),
                (supabase as any).schema("sidakota").from("econ_potential").select("*, ref_lapangan_usaha:jenis_usaha_id(id, nama)").eq("tenant_id", tenant.id),
                supabase.schema("sidakota").from("ref_lapangan_usaha").select("id, nama")
            ]);

            const refMap = new Map<number, string>();
            (refRes.data || []).forEach(r => refMap.set(r.id, r.nama));

            const mappedSectors = (secRes.data || []).map(s => ({
                ...s,
                sektor: refMap.get(s.sektor_id) || "Lainnya"
            }));

            setSectors(mappedSectors);
            setFacilities(
                (facRes.data || []).map((f: any) => ({
                    ...f,
                    jenis_nama: f.ref_ekonomi_sarana?.nama ?? "-",
                }))
            );
            setPotentials(
                (potRes.data || []).map((p: any) => ({
                    ...p,
                    jenis_usaha: p.ref_lapangan_usaha?.nama ?? "-",
                }))
            );

        } catch (e) {
            console.error("Failed fetching ekonomi data", e);
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc]">
                <header className={`relative text-white ${THEME.bgGradient}`}>
                    <Navbar />
                    <div className="px-6 py-20 text-center"><Activity className="w-10 h-10 animate-spin mx-auto opacity-50" /></div>
                </header>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            {/* HERO HEADER */}
            <header className={`relative overflow-x-clip text-white ${THEME.bgGradient} flex-shrink-0 shrink-0`}>
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />

                <Navbar />

                <div className="relative z-10 px-6 pt-8 pb-28 max-w-7xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm font-medium mb-6 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Beranda
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
                                <TrendingUp className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                    Modul Data Dedicated
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Data Ekonomi</h1>
                                <p className="mt-2 text-lg text-white/70 max-w-2xl leading-relaxed">
                                    Pusat informasi lengkap mengenai perkembangan sektor usaha, sarana ekonomi, dan analisis performa UMKM se-Kota Bogor.
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

            {/* MAIN CONTAINER */}
            <main className="px-6 max-w-7xl mx-auto -mt-16 relative z-20 pb-20 flex-1 w-full flex flex-col">

                {/* TABS NAVIGATION - 2x2 grid on mobile, single row on desktop */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-8">
                    <button
                        onClick={() => setActiveTab('sektor')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${
                            activeTab === 'sektor' ? 'bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Factory className={`w-4 h-4 flex-shrink-0 ${activeTab === 'sektor' ? '' : 'opacity-50'}`} />
                        <span className="leading-tight">Sektor Usaha</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sarana')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${
                            activeTab === 'sarana' ? 'bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Building2 className={`w-4 h-4 flex-shrink-0 ${activeTab === 'sarana' ? '' : 'opacity-50'}`} />
                        <span className="leading-tight">Sarana Ekonomi</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('umkm')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${
                            activeTab === 'umkm' ? 'bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Store className={`w-4 h-4 flex-shrink-0 ${activeTab === 'umkm' ? '' : 'opacity-50'}`} />
                        <span className="leading-tight">Potensi UMKM</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('analisis')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${
                            activeTab === 'analisis' ? 'bg-slate-800 text-white shadow-md border-slate-700 ring-1 ring-slate-900/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Target className={`w-4 h-4 flex-shrink-0 ${activeTab === 'analisis' ? '' : 'opacity-50'}`} />
                        <span className="leading-tight">Analisis &amp; Insight</span>
                    </button>
                </div>

                {/* TAB CONTENT */}
                <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'sektor' && <SektorSection sectors={sectors} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === 'sarana' && <SaranaSection facilities={facilities} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === 'umkm' && <UmkmSection potentials={potentials} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === 'analisis' && <AnalisisSection sectors={sectors} facilities={facilities} potentials={potentials} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                </div>

            </main>

            {/* FOOTER */}
            <Footer />
        </div>
    );
}

