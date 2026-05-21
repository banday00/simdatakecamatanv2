"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import type { Kelurahan } from "@/types";
import {
    ChevronLeft, TrendingUp, MapPin, Hammer, CheckCircle, Clock, Banknote,
    Droplets, Trash2, Trees, BarChart3, Trophy, ArrowUpRight, Search, Users,
    Pipette, ChevronDown, Activity, Factory, PieChart as PieChartIcon, Info
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    AreaChart, Area, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const THEME = {
    gradient: "from-indigo-500 to-indigo-700",
    bgGradient: "bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800",
    lightBg: "bg-indigo-50",
    textColor: "text-indigo-700",
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#14b8a6", "#ec4899", "#84cc16"];

// StatCard removed — using ekonomi-style inline cards directly in each section

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SANITASI & LINGKUNGAN
// ─────────────────────────────────────────────────────────────────────────────
function SanitasiSection({ sanitation, kelurahans, selectedKelurahan }: { sanitation: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const filtered = selectedKelurahan ? sanitation.filter(s => s.kelurahan_id === selectedKelurahan) : sanitation;
    const years = Array.from(new Set(filtered.map(s => s.tahun))).sort((a, b) => b - a);
    const latestYear = years[0] || new Date().getFullYear();
    const latestData = filtered.filter(s => s.tahun === latestYear);

    const avgAir = latestData.length ? (latestData.reduce((s, r) => s + (r.akses_air_bersih_persen || 0), 0) / latestData.length).toFixed(1) : "0";
    const avgSanitasi = latestData.length ? (latestData.reduce((s, r) => s + (r.akses_sanitasi_persen || 0), 0) / latestData.length).toFixed(1) : "0";
    const totalJamban = latestData.reduce((s, r) => s + (r.rt_jamban_sehat || 0), 0);
    const odfCount = latestData.filter(r => r.status_odf === "ODF").length;

    const [page, setPage] = useState(1);
    const limit = 10;
    const totalPages = Math.ceil(latestData.length / limit);
    const paginatedTable = latestData.slice((page - 1) * limit, page * limit);

    // Chart: Cakupan per Kelurahan
    const chartData = kelurahans.map(k => {
        const d = latestData.find(x => x.kelurahan_id === k.id);
        return { name: k.nama, AirBersih: d?.akses_air_bersih_persen || 0, Sanitasi: d?.akses_sanitasi_persen || 0 };
    }).sort((a, b) => b.AirBersih - a.AirBersih).filter(c => c.AirBersih > 0 || c.Sanitasi > 0).slice(0, 10);

    // Radar: Agregat 5 Pilar STBM
    const totalRT = latestData.reduce((s, r) => s + (r.rt_jamban_sehat || 0) + (r.rt_tanpa_jamban || 0), 0) || 1;
    const radarData = [
        { pilar: "SBS/ODF", value: Math.min(100, Math.round((latestData.reduce((s, r) => s + (r.rt_jamban_sehat || 0), 0) / totalRT) * 100)) },
        { pilar: "CTPS", value: Math.min(100, Math.round((latestData.reduce((s, r) => s + (r.rt_ctps || 0), 0) / totalRT) * 100)) },
        { pilar: "Air Minum", value: Math.round(Number(avgAir)) },
        { pilar: "Sampah", value: Math.min(100, Math.round((latestData.reduce((s, r) => s + (r.rt_pemilahan_sampah || 0), 0) / totalRT) * 100)) },
        { pilar: "Limbah Cair", value: Math.round(Number(avgSanitasi)) },
    ];

    const statusOdfColors: Record<string, string> = {
        ODF: "bg-emerald-100 text-emerald-700",
        "Proses Verifikasi": "bg-amber-100 text-amber-700",
        "Belum ODF": "bg-red-100 text-red-700",
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Akses Air Bersih', value: `${avgAir}%`, sub: `SDGs 6.1.1 • ${latestYear}`, icon: Droplets, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
                    { label: 'Sanitasi Layak', value: `${avgSanitasi}%`, sub: `SDGs 6.2.1 • ${latestYear}`, icon: Activity, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
                    { label: 'RT Jamban Sehat', value: totalJamban.toLocaleString('id-ID'), sub: 'STBM Pilar 1', icon: CheckCircle, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Kelurahan ODF', value: `${odfCount} / ${latestData.length}`, sub: 'Open Defecation Free', icon: Trophy, color: 'bg-rose-50 text-rose-600', border: 'border-rose-100' },
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
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Droplets className="w-5 h-5 text-indigo-600" /> Cakupan Air Bersih & Sanitasi (%)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                                <Bar dataKey="AirBersih" name="Air Bersih (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                                <Bar dataKey="Sanitasi" name="Sanitasi Layak (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-indigo-600" /> Radar 5 Pilar STBM</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="pilar" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                                <Radar name="Capaian (%)" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800">Detail Sanitasi per Kelurahan</h3></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 font-semibold">
                            <tr>
                                <th className="px-5 py-4">Kelurahan</th>
                                <th className="px-5 py-4">Air Bersih</th>
                                <th className="px-5 py-4">Sanitasi</th>
                                <th className="px-5 py-4">Jamban Sehat</th>
                                <th className="px-5 py-4">Air Minum Layak</th>
                                <th className="px-5 py-4">TPS</th>
                                <th className="px-5 py-4">Petugas</th>
                                <th className="px-5 py-4 text-center">Status ODF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedTable.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4 font-semibold text-slate-800">{kelurahans.find(k => k.id === row.kelurahan_id)?.nama}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-blue-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.akses_air_bersih_persen || 0}%` }} /></div>
                                            <span className="text-xs font-bold text-blue-700">{(row.akses_air_bersih_persen || 0).toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-emerald-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.akses_sanitasi_persen || 0}%` }} /></div>
                                            <span className="text-xs font-bold text-emerald-700">{(row.akses_sanitasi_persen || 0).toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 font-medium text-slate-700">{(row.rt_jamban_sehat || 0).toLocaleString('id-ID')} <span className="text-slate-400 text-xs">KK</span></td>
                                    <td className="px-5 py-4 font-medium text-slate-700">{(row.rt_air_minum_layak || 0).toLocaleString('id-ID')} <span className="text-slate-400 text-xs">KK</span></td>
                                    <td className="px-5 py-4 font-medium">{row.tps_sementara || row.tps_jumlah || 0}</td>
                                    <td className="px-5 py-4 font-medium">{row.petugas_kebersihan || 0} <span className="text-slate-400 text-xs">org</span></td>
                                    <td className="px-5 py-4 text-center">
                                        <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${statusOdfColors[row.status_odf] || statusOdfColors["Belum ODF"]}`}>
                                            {row.status_odf || "Belum ODF"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(latestData.length, (page - 1) * limit + 1)} - {Math.min(latestData.length, page * limit)} dari {latestData.length}</span>
                            <span className="sm:hidden">{latestData.length} data</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">←</button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">→</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: PEMBANGUNAN
// ─────────────────────────────────────────────────────────────────────────────
function PembangunanSection({ development, kelurahans, selectedKelurahan }: { development: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const filtered = selectedKelurahan ? development.filter(s => s.kelurahan_id === selectedKelurahan) : development;
    const years = Array.from(new Set(filtered.map(s => s.tahun))).sort((a, b) => b - a);
    const latestYear = years[0] || new Date().getFullYear();
    const latestData = filtered.filter(s => s.tahun === latestYear);

    // Normalize legacy status values to standard form values
    const normalizeStatus = (raw: string | null | undefined): string => {
        const map: Record<string, string> = {
            selesai: "Selesai", berjalan: "Proses", terhenti: "Bermasalah",
            rencana: "Rencana", proses: "Proses", bermasalah: "Bermasalah",
        };
        if (!raw) return "Rencana";
        return map[raw.toLowerCase()] || raw;
    };

    const totalProyek = latestData.length;
    const selesai = latestData.filter(s => normalizeStatus(s.status) === "Selesai").length;
    const proses = latestData.filter(s => normalizeStatus(s.status) === "Proses").length;
    const avgProgress = latestData.length ? Math.round(latestData.reduce((s, r) => s + (r.progress_persen || 0), 0) / latestData.length) : 0;
    const [page, setPage] = useState(1);
    const limit = 10;
    const paginationData = latestData.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(totalProyek / limit);

    const statusMap = new Map<string, number>();
    latestData.forEach(d => { const key = normalizeStatus(d.status); statusMap.set(key, (statusMap.get(key) || 0) + 1); });
    const barData = Array.from(statusMap.entries()).map(([name, jumlah]) => ({ name, jumlah })).sort((a, b) => b.jumlah - a.jumlah);

    const danaMap = new Map<string, number>();
    latestData.forEach(d => { const sum = d.sumber_dana || "Lainnya"; danaMap.set(sum, (danaMap.get(sum) || 0) + 1); });
    const pieData = Array.from(danaMap.entries()).map(([name, value]) => ({ name, value }));

    const statusColors: Record<string, string> = { "Selesai": "bg-emerald-100 text-emerald-700", "Proses": "bg-amber-100 text-amber-700", "Rencana": "bg-blue-100 text-blue-700", "Bermasalah": "bg-rose-100 text-rose-700" };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Proyek', value: totalProyek, sub: `Tahun ${latestYear}`, icon: Hammer, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
                    { label: 'Selesai', value: selesai, sub: 'Proyek tuntas', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
                    { label: 'Dalam Proses', value: proses, sub: 'Tahap konstruksi', icon: Clock, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Rata-rata Progress', value: `${avgProgress}%`, sub: 'Realisasi lapangan', icon: BarChart3, color: 'bg-rose-50 text-rose-600', border: 'border-rose-100' },
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
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Hammer className="w-5 h-5 text-indigo-600" /> Distribusi Proyek per Status</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={barData} margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                                <Bar dataKey="jumlah" name="Jumlah Proyek" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16}>
                                    {barData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Banknote className="w-5 h-5 text-indigo-600" /> Sumber Pendanaan Proyek</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={false}>
                                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800">Daftar Proyek Infrastruktur</h3></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 font-semibold">
                            <tr><th className="px-6 py-4">Nama Proyek</th><th className="px-6 py-4">Kelurahan</th><th className="px-6 py-4">Instansi Pelaksana</th><th className="px-6 py-4">Sumber Dana</th><th className="px-6 py-4">Volume</th><th className="px-6 py-4">Progress</th><th className="px-6 py-4 text-center">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginationData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{row.nama_proyek}</p>
                                        {row.keterangan && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{row.keterangan}</p>}
                                    </td>
                                    <td className="px-6 py-4"><p className="font-semibold text-slate-700">{kelurahans.find(k => k.id === row.kelurahan_id)?.nama}</p></td>
                                    <td className="px-6 py-4"><span className="text-sm text-slate-600">{row.instansi_pelaksana || "-"}</span></td>
                                    <td className="px-6 py-4"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">{row.sumber_dana || "-"}</span></td>
                                    <td className="px-6 py-4">
                                        {row.volume != null
                                            ? <span className="text-sm font-medium text-slate-700">{Number(row.volume).toLocaleString('id-ID')} <span className="text-slate-400 text-xs">{row.satuan || ''}</span></span>
                                            : <span className="text-slate-400 text-xs">-</span>}
                                    </td>
                                    <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${row.progress_persen || 0}%` }} /></div><span className="text-xs font-bold w-8">{row.progress_persen || 0}%</span></div></td>
                                    <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-lg ${statusColors[normalizeStatus(row.status)] || "bg-slate-100 text-slate-700"}`}>{normalizeStatus(row.status)}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(latestData.length, (page - 1) * limit + 1)} - {Math.min(latestData.length, page * limit)} dari {latestData.length}</span>
                            <span className="sm:hidden">{latestData.length} proyek</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">←</button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">→</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: OLAHRAGA
// ─────────────────────────────────────────────────────────────────────────────
function OlahragaSection({ sports, kelurahans, selectedKelurahan }: { sports: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const filtered = selectedKelurahan ? sports.filter(s => s.kelurahan_id === selectedKelurahan) : sports;
    const totalFasilitas = filtered.length;
    const kondisiBaik = filtered.filter(s => s.kondisi === "Baik").length;
    const perluPerbaikan = totalFasilitas - kondisiBaik;
    const uniqueTypes = new Set(filtered.map(s => s.jenis_nama)).size;
    const [page, setPage] = useState(1);
    const limit = 12;
    const paginationData = filtered.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(totalFasilitas / limit);

    const jenisMap = new Map<string, number>();
    filtered.forEach(d => { jenisMap.set(d.jenis_nama || "Lainnya", (jenisMap.get(d.jenis_nama || "Lainnya") || 0) + 1); });
    const pieData = Array.from(jenisMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const kelMap = new Map<string, { total: number; baik: number }>();
    filtered.forEach(d => {
        const kelName = kelurahans.find(k => k.id === d.kelurahan_id)?.nama;
        if (!kelName) return; // skip records with no matching kelurahan
        const curr = kelMap.get(kelName) || { total: 0, baik: 0 };
        kelMap.set(kelName, { total: curr.total + 1, baik: curr.baik + (d.kondisi === "Baik" ? 1 : 0) });
    });
    const barData = Array.from(kelMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total).slice(0, 10);
    const kondisiColors: Record<string, string> = { "Baik": "bg-emerald-100 text-emerald-700", "Rusak Ringan": "bg-amber-100 text-amber-700", "Rusak Berat": "bg-rose-100 text-rose-700" };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Fasilitas', value: totalFasilitas, sub: `${filtered.length} unit terdata`, icon: Trophy, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
                    { label: 'Kondisi Baik', value: kondisiBaik, sub: 'Layak pakai', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
                    { label: 'Perlu Perbaikan', value: perluPerbaikan, sub: 'Rusak ringan / berat', icon: Activity, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Jenis Sarana', value: uniqueTypes, sub: 'Kategori berbeda', icon: PieChartIcon, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
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
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Trophy className="w-5 h-5 text-indigo-600" /> Sebaran Fasilitas per Wilayah</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                                <Bar dataKey="total" name="Total Fasilitas" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
                                <Bar dataKey="baik" name="Kondisi Baik" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-indigo-600" /> Komposisi Jenis Fasilitas</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" label={false}>
                                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-600" /> Sarana Olahraga</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginationData.map((f, i) => {
                        return (
                            <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all overflow-hidden group">
                                {/* Gradient Header */}
                                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-white text-sm line-clamp-1">{f.nama}</h4>
                                        <p className="text-[10px] text-white/70 font-mono mt-0.5">{f.jenis_nama || "Lainnya"}</p>
                                    </div>
                                    {f.kondisi && (
                                        <span className="shrink-0 ml-2 px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold border border-white/30">{f.kondisi}</span>
                                    )}
                                </div>

                                <div className="p-4">
                                    {/* Badges */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-indigo-50 text-indigo-600 border-indigo-200">{f.jenis_nama || "Lainnya"}</span>
                                        {f.status_kepemilikan && (
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-200">{f.status_kepemilikan}</span>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    {f.luas > 0 && (
                                        <div className="grid grid-cols-1 gap-1 bg-slate-50 rounded-lg p-2.5 mb-2.5">
                                            <div className="text-center">
                                                <p className="text-sm font-black text-indigo-600">{Number(f.luas).toLocaleString('id-ID')} m²</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Luas Area</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center text-[10px] text-slate-500">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {kelurahans.find(k => k.id === f.kelurahan_id)?.nama || "—"}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {totalPages > 1 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                        <span className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                            <span className="hidden sm:inline">Menampilkan {Math.min(filtered.length, (page - 1) * limit + 1)} - {Math.min(filtered.length, page * limit)} dari {filtered.length}</span>
                            <span className="sm:hidden">{filtered.length} fasilitas</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">←</button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">→</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: ANALISIS & INSIGHT
// ─────────────────────────────────────────────────────────────────────────────
function AnalisisSection({ sanitation, development, sports, kelurahans, selectedKelurahan }: { sanitation: any[]; development: any[]; sports: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelsToAnalyze = selectedKelurahan ? kelurahans.filter(k => k.id === selectedKelurahan) : kelurahans;
    const analysisData = kelsToAnalyze.map(k => {
        const san = sanitation.filter(s => s.kelurahan_id === k.id).sort((a, b) => b.tahun - a.tahun)[0] || {};
        const devCount = development.filter(s => s.kelurahan_id === k.id).length;
        const sportCount = sports.filter(s => s.kelurahan_id === k.id).length;

        // Skor per dimensi (0–100)
        const airScore = san.akses_air_bersih_persen || 0;
        const sanScore = san.akses_sanitasi_persen || 0;

        // Jamban: % KK yang punya jamban sehat (Pilar 1 STBM)
        const totalKK = (san.rt_jamban_sehat || 0) + (san.rt_tanpa_jamban || 0);
        const jambanScore = totalKK > 0 ? Math.min(100, Math.round(((san.rt_jamban_sehat || 0) / totalKK) * 100)) : 0;

        const devScore = Math.min(devCount * 5, 100);
        const sportScore = Math.min(sportCount * 10, 100);
        const kumuhPenalty = Math.max(0, 100 - (san.rumah_kumuh || 0) * 10);

        // ODF bonus
        const odfBonus = san.status_odf === "ODF" ? 100 : san.status_odf === "Proses Verifikasi" ? 50 : 0;

        // Komposit 7 dimensi → rata-rata
        const totalScore = (airScore + sanScore + jambanScore + devScore + sportScore + kumuhPenalty + odfBonus) / 7;

        return {
            name: k.nama, id: k.id, score: totalScore,
            air: airScore, sanitasi: sanScore, jamban: jambanScore,
            pembangunan: devScore, olahraga: sportScore, kumuh: kumuhPenalty, odf: odfBonus,
            rawDev: devCount, rawSport: sportCount, statusOdf: san.status_odf || "Belum ODF",
        };
    }).sort((a, b) => b.score - a.score);
    const topPerformer = analysisData.filter(d => d.score > 0).slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600" /> Analisis Kapasitas Infrastruktur (Top 5)</h3>
                    <p className="text-sm text-slate-500 mb-6">Indeks komposit 7 dimensi: Air Bersih, Sanitasi, Jamban, Pembangunan, Olahraga, Bebas Kumuh, ODF</p>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart outerRadius="70%" data={topPerformer}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                <Radar name="Air Bersih" dataKey="air" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                                <Radar name="Sanitasi" dataKey="sanitasi" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                                <Radar name="Jamban (STBM)" dataKey="jamban" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
                                <Radar name="Pembangunan" dataKey="pembangunan" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                                <Radar name="Olahraga" dataKey="olahraga" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                                <Radar name="Bebas Kumuh" dataKey="kumuh" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Leaderboard Wilayah</h3>
                        <p className="text-xs text-slate-500 mt-1">Komposit 7 dimensi infrastruktur & sanitasi</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: "400px" }}>
                        {analysisData.slice(0, 10).map((kel, index) => (
                            <div key={kel.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? "bg-amber-100 text-amber-600" : index === 1 ? "bg-slate-200 text-slate-600" : index === 2 ? "bg-orange-100 text-orange-700" : "bg-indigo-50 text-indigo-500"}`}>
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-slate-800 truncate">{kel.name}</h4>
                                    <p className="text-xs text-slate-500 truncate">
                                        ODF: <span className={`font-semibold ${kel.statusOdf === "ODF" ? "text-emerald-600" : "text-slate-500"}`}>{kel.statusOdf}</span>
                                        {" | "}Proyek: <span className="font-semibold text-slate-700">{kel.rawDev}</span>
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-indigo-600 font-extrabold text-xl">{kel.score.toFixed(1)}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Catatan Metodologi */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-slate-400" />
                    <h4 className="text-sm font-bold text-slate-600">Catatan Metodologi Perhitungan</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-500">
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <p className="font-bold text-blue-700 mb-1">💧 Air Bersih (SDGs 6.1.1)</p>
                        <p>Data survei <code className="bg-blue-100 px-1 rounded">akses_air_bersih_persen</code> (0–100). Target SDGs 100% tahun 2030.</p>
                    </div>
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <p className="font-bold text-emerald-700 mb-1">🚰 Sanitasi (SDGs 6.2.1)</p>
                        <p>Data survei <code className="bg-emerald-100 px-1 rounded">akses_sanitasi_persen</code> (0–100). Target SDGs 100% tahun 2030.</p>
                    </div>
                    <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100">
                        <p className="font-bold text-cyan-700 mb-1">🚽 Jamban Sehat (STBM Pilar 1)</p>
                        <p>Skor = <code className="bg-cyan-100 px-1 rounded">rt_jamban_sehat / (rt_jamban + rt_tanpa_jamban) × 100</code>. Standar STBM.</p>
                    </div>
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                        <p className="font-bold text-amber-700 mb-1">🏗️ Pembangunan</p>
                        <p>Skor = <code className="bg-amber-100 px-1 rounded">min(jumlah_proyek × 5, 100)</code>. Setiap proyek bernilai 5 poin, maks 100.</p>
                    </div>
                    <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100">
                        <p className="font-bold text-violet-700 mb-1">🏟️ Olahraga</p>
                        <p>Skor = <code className="bg-violet-100 px-1 rounded">min(jumlah_fasilitas × 10, 100)</code>. Setiap fasilitas bernilai 10 poin, maks 100.</p>
                    </div>
                    <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                        <p className="font-bold text-rose-700 mb-1">🏘️ Bebas Kumuh (BPS)</p>
                        <p>Skor = <code className="bg-rose-100 px-1 rounded">max(0, 100 − rumah_kumuh × 10)</code>. Standar BPS Podes.</p>
                    </div>
                    <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                        <p className="font-bold text-teal-700 mb-1">✅ Status ODF (STBM)</p>
                        <p>ODF = 100, Proses = 50, Belum = 0. Berdasarkan verifikasi status Open Defecation Free.</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2 lg:col-span-2">
                        <p className="font-bold text-slate-700 mb-1">📊 Skor Akhir</p>
                        <p>Rata-rata dari 7 dimensi di atas. Bukan indeks resmi BPS — hanya untuk perbandingan relatif antar kelurahan berdasarkan standar STBM, SDGs, dan Prodeskel.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function DataInfrastrukturPage() {
    const { tenant, kelurahans } = useTenant();
    const toTenantPath = useTenantPath();
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("sanitasi");
    const [sanitation, setSanitation] = useState<any[]>([]);
    const [development, setDevelopment] = useState<any[]>([]);
    const [sports, setSports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/tenants/${tenant.slug}/data/infrastruktur`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok || result.error || !result.data) {
                throw new Error(result.error?.message ?? "Gagal memuat data infrastruktur.");
            }
            setSanitation(result.data.sanitation || []);
            setDevelopment(result.data.development || []);
            setSports(result.data.sports || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Memuat data infrastruktur...</p>
                    </div>
                </div>
            </div>
        );
    }

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
                                <Hammer className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                    Modul Data Dedicated
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-white mb-2">Data Infrastruktur</h1>
                                <p className="text-lg text-white/80 max-w-2xl leading-relaxed font-light">
                                    Pusat informasi lengkap mengenai sanitasi wilayah, progres pembangunan fisik, dan fasilitas olahraga publik se-Kota Bogor.
                                </p>
                            </div>
                        </div>
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

            <main className="px-6 max-w-7xl mx-auto -mt-16 relative z-20 pb-20 flex-1 w-full flex flex-col">
                {/* Section Tabs - 2x2 grid on mobile, single row on desktop */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-8">
                    <button onClick={() => setActiveTab("sanitasi")} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${activeTab === "sanitasi" ? "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                        <Pipette className="w-4 h-4 flex-shrink-0" />
                        <span className="leading-tight">Sanitasi &amp; Lingkungan</span>
                    </button>
                    <button onClick={() => setActiveTab("pembangunan")} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${activeTab === "pembangunan" ? "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                        <Hammer className="w-4 h-4 flex-shrink-0" />
                        <span className="leading-tight">Proyek Pembangunan</span>
                    </button>
                    <button onClick={() => setActiveTab("olahraga")} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${activeTab === "olahraga" ? "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                        <Trophy className="w-4 h-4 flex-shrink-0" />
                        <span className="leading-tight">Sarana Olahraga</span>
                    </button>
                    <button onClick={() => setActiveTab("analisis")} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${activeTab === "analisis" ? "bg-slate-800 text-white shadow-md border-slate-700 ring-1 ring-slate-900/10" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                        <Activity className="w-4 h-4 flex-shrink-0" />
                        <span className="leading-tight">Analisis &amp; Insight</span>
                    </button>
                </div>
                <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "sanitasi" && <SanitasiSection sanitation={sanitation} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "pembangunan" && <PembangunanSection development={development} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "olahraga" && <OlahragaSection sports={sports} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "analisis" && <AnalisisSection sanitation={sanitation} development={development} sports={sports} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                </div>
            </main>

            <Footer />
        </div>
    );
}
