"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/ui/navbar";
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
// COMPONENT: SANITASI & LINGKUNGAN
// ─────────────────────────────────────────────────────────────────────────────
function SanitasiSection({ sanitation, kelurahans, selectedKelurahan }: { sanitation: any[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const filtered = selectedKelurahan ? sanitation.filter(s => s.kelurahan_id === selectedKelurahan) : sanitation;
    const years = Array.from(new Set(filtered.map(s => s.tahun))).sort((a, b) => b - a);
    const latestYear = years[0] || new Date().getFullYear();
    const latestData = filtered.filter(s => s.tahun === latestYear);

    const avgAir = latestData.length ? (latestData.reduce((s, r) => s + (r.akses_air_bersih_persen || 0), 0) / latestData.length).toFixed(1) : "0";
    const avgSanitasi = latestData.length ? (latestData.reduce((s, r) => s + (r.akses_sanitasi_persen || 0), 0) / latestData.length).toFixed(1) : "0";
    const totalTPS = latestData.reduce((s, r) => s + (r.tps_jumlah || 0), 0);
    const totalRTH = latestData.reduce((s, r) => s + (r.ruang_terbuka_hijau_ha || 0), 0);

    const chartData = kelurahans.map(k => {
        const d = latestData.find(x => x.kelurahan_id === k.id);
        return { name: k.nama, AirBersih: d?.akses_air_bersih_persen || 0, Sanitasi: d?.akses_sanitasi_persen || 0, TPS: d?.tps_jumlah || 0 };
    }).sort((a, b) => b.AirBersih - a.AirBersih).filter(c => c.AirBersih > 0 || c.Sanitasi > 0).slice(0, 10);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Akses Air Bersih" value={`${avgAir}%`} icon={Droplets} color="blue" />
                <StatCard label="Sanitasi Layak" value={`${avgSanitasi}%`} icon={Activity} color="emerald" />
                <StatCard label="Total TPS" value={totalTPS} icon={Trash2} color="amber" />
                <StatCard label="Ruang Terbuka Hijau" value={`${totalRTH.toFixed(1)} ha`} icon={Trees} color="green" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Droplets className="w-5 h-5 text-indigo-600" /> Akses Air Bersih & Sanitasi (%)</h3>
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
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Trash2 className="w-5 h-5 text-indigo-600" /> Distribusi TPS per Wilayah</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData.filter(d => d.TPS > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="TPS" label={false}>
                                    {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800">Detail Sanitasi Wilayah</h3></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 font-semibold">
                            <tr><th className="px-6 py-4">Wilayah</th><th className="px-6 py-4">Tahun</th><th className="px-6 py-4">Air Bersih (%)</th><th className="px-6 py-4">Sanitasi (%)</th><th className="px-6 py-4">TPS</th><th className="px-6 py-4">RTH (ha)</th><th className="px-6 py-4">Kumuh (ha)</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {latestData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-800">{kelurahans.find(k => k.id === row.kelurahan_id)?.nama}</td>
                                    <td className="px-6 py-4 text-slate-600">{row.tahun}</td>
                                    <td className="px-6 py-4 font-bold text-emerald-600">{row.akses_air_bersih_persen}%</td>
                                    <td className="px-6 py-4 font-bold text-blue-600">{row.akses_sanitasi_persen}%</td>
                                    <td className="px-6 py-4 font-medium">{row.tps_jumlah || 0}</td>
                                    <td className="px-6 py-4 font-medium">{row.ruang_terbuka_hijau_ha || 0}</td>
                                    <td className="px-6 py-4 font-medium text-rose-600">{row.luas_kawasan_kumuh_ha || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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

    const totalProyek = latestData.length;
    const selesai = latestData.filter(s => s.status === "Selesai" || s.progress_persen === 100).length;
    const proses = latestData.filter(s => s.status === "Proses" || (s.progress_persen < 100 && s.progress_persen > 0)).length;
    const totalAnggaran = latestData.reduce((s, r) => s + (r.anggaran || 0), 0);
    const [page, setPage] = useState(1);
    const limit = 10;
    const paginationData = latestData.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(totalProyek / limit);

    const jenisMap = new Map<string, number>();
    latestData.forEach(d => { const key = d.jenis || "Lainnya"; jenisMap.set(key, (jenisMap.get(key) || 0) + 1); });
    const barData = Array.from(jenisMap.entries()).map(([name, jumlah]) => ({ name, jumlah })).sort((a, b) => b.jumlah - a.jumlah);

    const danaMap = new Map<string, number>();
    latestData.forEach(d => { const sum = d.sumber_dana || "Lainnya"; danaMap.set(sum, (danaMap.get(sum) || 0) + 1); });
    const pieData = Array.from(danaMap.entries()).map(([name, value]) => ({ name, value }));

    const statusColors: Record<string, string> = { "Selesai": "bg-emerald-100 text-emerald-700", "Proses": "bg-amber-100 text-amber-700", "Rencana": "bg-blue-100 text-blue-700", "Bermasalah": "bg-rose-100 text-rose-700" };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Proyek" value={totalProyek} icon={Hammer} color="indigo" />
                <StatCard label="Selesai" value={selesai} icon={CheckCircle} color="emerald" />
                <StatCard label="Dalam Proses" value={proses} icon={Clock} color="amber" />
                <StatCard label="Total Anggaran" value={`Rp ${(totalAnggaran / 1e9).toFixed(1)} M`} icon={Banknote} color="rose" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Hammer className="w-5 h-5 text-indigo-600" /> Distribusi Proyek per Jenis</h3>
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
                            <tr><th className="px-6 py-4">Nama Proyek</th><th className="px-6 py-4">Kelurahan</th><th className="px-6 py-4 text-center">Jenis</th><th className="px-6 py-4">Anggaran</th><th className="px-6 py-4">Progress</th><th className="px-6 py-4 text-center">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginationData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4"><p className="font-bold text-slate-800">{row.nama_proyek}</p><p className="text-xs text-slate-500 mt-1">{row.kontraktor || "-"}</p></td>
                                    <td className="px-6 py-4"><p className="font-semibold text-slate-700">{kelurahans.find(k => k.id === row.kelurahan_id)?.nama}</p>{row.lokasi && <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {row.lokasi}</p>}</td>
                                    <td className="px-6 py-4 text-center"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">{row.jenis}</span></td>
                                    <td className="px-6 py-4"><p className="font-bold text-slate-700">Rp {(row.anggaran || 0).toLocaleString("id-ID")}</p>{row.realisasi > 0 && <p className="text-xs text-emerald-600 font-semibold mt-1">Realisasi: Rp {row.realisasi.toLocaleString("id-ID")}</p>}</td>
                                    <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${row.progress_persen || 0}%` }} /></div><span className="text-xs font-bold w-8">{row.progress_persen || 0}%</span></div></td>
                                    <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-lg ${statusColors[row.status] || "bg-slate-100 text-slate-700"}`}>{row.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                        <span className="text-sm text-slate-500 font-medium">Halaman <span className="font-bold text-slate-800">{page}</span> dari {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Sebelumnya</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Selanjutnya</button>
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
    const uniqueTypes = new Set(filtered.map(s => s.jenis)).size;
    const [page, setPage] = useState(1);
    const limit = 12;
    const paginationData = filtered.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(totalFasilitas / limit);

    const jenisMap = new Map<string, number>();
    filtered.forEach(d => { jenisMap.set(d.jenis || "Lainnya", (jenisMap.get(d.jenis || "Lainnya") || 0) + 1); });
    const pieData = Array.from(jenisMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const kelMap = new Map<string, { total: number; baik: number }>();
    filtered.forEach(d => {
        const kelName = kelurahans.find(k => k.id === d.kelurahan_id)?.nama || "Unknown";
        const curr = kelMap.get(kelName) || { total: 0, baik: 0 };
        kelMap.set(kelName, { total: curr.total + 1, baik: curr.baik + (d.kondisi === "Baik" ? 1 : 0) });
    });
    const barData = Array.from(kelMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total).slice(0, 10);
    const kondisiColors: Record<string, string> = { "Baik": "bg-emerald-100 text-emerald-700", "Rusak Ringan": "bg-amber-100 text-amber-700", "Rusak Berat": "bg-rose-100 text-rose-700" };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Fasilitas" value={totalFasilitas} icon={Trophy} color="indigo" />
                <StatCard label="Kondisi Baik" value={kondisiBaik} icon={CheckCircle} color="emerald" />
                <StatCard label="Perlu Perbaikan" value={perluPerbaikan} icon={Activity} color="amber" />
                <StatCard label="Jenis Sarana" value={uniqueTypes} icon={PieChartIcon} color="blue" />
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
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-600" /> Direktori Sarana Olahraga</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginationData.map((f, i) => (
                        <div key={i} className="group border border-slate-100 rounded-xl p-5 hover:shadow-md hover:border-indigo-100 transition-all bg-slate-50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-slate-800 line-clamp-2 pr-2 leading-tight">{f.nama}</h4>
                                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${kondisiColors[f.kondisi] || "bg-slate-200 text-slate-700"}`}>{f.kondisi}</span>
                            </div>
                            <p className="text-xs text-indigo-600 font-semibold mb-3 tracking-wide uppercase">{f.jenis}</p>
                            <div className="space-y-2 mt-auto text-xs text-slate-500">
                                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> <span className="truncate">{kelurahans.find(k => k.id === f.kelurahan_id)?.nama}</span></div>
                                <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> <span className="truncate">{f.pengelola || "Tidak diketahui"}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
                {totalPages > 1 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">Halaman <span className="font-bold text-slate-800">{page}</span> dari {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Sebelumnya</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Selanjutnya</button>
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
        const airScore = san.akses_air_bersih_persen || 0;
        const sanScore = san.akses_sanitasi_persen || 0;
        const devScore = Math.min(devCount * 5, 100);
        const sportScore = Math.min(sportCount * 10, 100);
        const rthScore = Math.min((san.ruang_terbuka_hijau_ha || 0) * 10, 100);
        const totalScore = (airScore + sanScore + devScore + sportScore + rthScore) / 5;
        return { name: k.nama, id: k.id, score: totalScore, air: airScore, sanitasi: sanScore, pembangunan: devScore, olahraga: sportScore, rth: rthScore, rawDev: devCount, rawSport: sportCount };
    }).sort((a, b) => b.score - a.score);
    const topPerformer = analysisData.filter(d => d.score > 0).slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600" /> Analisis Kapasitas Infrastruktur (Top 5)</h3>
                    <p className="text-sm text-slate-500 mb-6">Indeks komposit ketersediaan sarana prasarana per wilayah</p>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart outerRadius="70%" data={topPerformer}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                <Radar name="Air Bersih" dataKey="air" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                                <Radar name="Sanitasi" dataKey="sanitasi" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                <Radar name="Pembangunan" dataKey="pembangunan" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                                <Radar name="Olahraga" dataKey="olahraga" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Leaderboard Wilayah</h3>
                        <p className="text-xs text-slate-500 mt-1">Berdasarkan komposit ketersediaan infrastruktur</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: "400px" }}>
                        {analysisData.slice(0, 10).map((kel, index) => (
                            <div key={kel.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? "bg-amber-100 text-amber-600" : index === 1 ? "bg-slate-200 text-slate-600" : index === 2 ? "bg-orange-100 text-orange-700" : "bg-indigo-50 text-indigo-500"}`}>
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-slate-800 truncate">{kel.name}</h4>
                                    <p className="text-xs text-slate-500 truncate">Pembangunan: <span className="font-semibold text-slate-700">{kel.rawDev}</span> | Olahraga: <span className="font-semibold text-slate-700">{kel.rawSport}</span></p>
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
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function DataInfrastrukturPage() {
    const { kelurahans } = useTenant();
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("sanitasi");
    const [sanitation, setSanitation] = useState<any[]>([]);
    const [development, setDevelopment] = useState<any[]>([]);
    const [sports, setSports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sanRes, devRes, sportsRes] = await Promise.all([
                supabase.from("infra_sanitation").select("*"),
                supabase.from("infra_development").select("*"),
                supabase.from("infra_sports").select("*")
            ]);
            setSanitation(sanRes.data || []);
            setDevelopment(devRes.data || []);
            setSports(sportsRes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

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
                <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-8 overflow-x-auto">
                    <button onClick={() => setActiveTab("sanitasi")} className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "sanitasi" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-white ring-1 ring-indigo-500/10" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent"}`}>
                        <Pipette className="w-4 h-4" /> Sanitasi & Lingkungan
                    </button>
                    <button onClick={() => setActiveTab("pembangunan")} className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "pembangunan" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-white ring-1 ring-indigo-500/10" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent"}`}>
                        <Hammer className="w-4 h-4" /> Proyek Pembangunan
                    </button>
                    <button onClick={() => setActiveTab("olahraga")} className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "olahraga" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-white ring-1 ring-indigo-500/10" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent"}`}>
                        <Trophy className="w-4 h-4" /> Sarana Olahraga
                    </button>
                    <button onClick={() => setActiveTab("analisis")} className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "analisis" ? "bg-slate-800 text-white shadow-md border border-slate-700 ring-1 ring-slate-900/10" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent"}`}>
                        <Activity className="w-4 h-4" /> Analisis & Insight
                    </button>
                </div>
                <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "sanitasi" && <SanitasiSection sanitation={sanitation} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "pembangunan" && <PembangunanSection development={development} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "olahraga" && <OlahragaSection sports={sports} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "analisis" && <AnalisisSection sanitation={sanitation} development={development} sports={sports} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                </div>
            </main>

            <footer className="bg-white border-t border-slate-200 py-8 mt-auto flex-shrink-0 shrink-0">
                <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
                    <p>&copy; 2024 Command Center Kota Bogor. Hak Cipta Dilindungi.</p>
                </div>
            </footer>
        </div>
    );
}
