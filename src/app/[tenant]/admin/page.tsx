"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import Link from "next/link";
import {
    Users,
    Building2,
    GraduationCap,
    Hospital,
    Newspaper,
    Store,
    Landmark,
    ChevronRight,
    BarChart3,
    Shield,
    MapPin,
    Hammer,
    Heart,
    HandHeart,
    TrendingUp,
    ArrowUpRight,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from "recharts";

const CHART_COLORS = ["#4f46e5", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const modules = [
    { label: "Pemerintahan", href: "/admin/pemerintahan/profil", icon: Landmark, color: "from-indigo-500 to-blue-600", desc: "Profil & Kependudukan" },
    { label: "Kesehatan", href: "/admin/kesehatan/fasilitas", icon: Heart, color: "from-rose-500 to-pink-600", desc: "Faskes & Stunting" },
    { label: "Pendidikan", href: "/admin/pendidikan/sarana", icon: GraduationCap, color: "from-amber-500 to-orange-600", desc: "Sarana & Partisipasi" },
    { label: "Ekonomi", href: "/admin/ekonomi/sarana", icon: TrendingUp, color: "from-emerald-500 to-teal-600", desc: "Potensi & Sektor" },
    { label: "Infrastruktur", href: "/admin/infrastruktur/olahraga", icon: Hammer, color: "from-sky-500 to-cyan-600", desc: "Sarana & Prasarana" },
    { label: "Sosial", href: "/admin/sosial/bantuan", icon: HandHeart, color: "from-purple-500 to-violet-600", desc: "Bantuan & PMKS" },
    { label: "Ketentraman", href: "/admin/ketentraman/kader", icon: Shield, color: "from-slate-500 to-slate-700", desc: "Kader & Insiden" },
    { label: "Berita", href: "/admin/berita", icon: Newspaper, color: "from-fuchsia-500 to-pink-600", desc: "Artikel & Konten" },
    { label: "WebGIS", href: "/admin/peta", icon: MapPin, color: "from-lime-500 to-green-600", desc: "Peta Interaktif" },
];

type KelurahanStats = { nama: string; penduduk: number; lembaga: number; fasilitas: number };

export default function AdminDashboard() {
    const { tenant, kelurahans } = useTenant();
    const toTenantPath = useTenantPath();
    const [totalPenduduk, setTotalPenduduk] = useState(0);
    const [totalLembaga, setTotalLembaga] = useState(0);
    const [totalFasilitas, setTotalFasilitas] = useState(0);
    const [totalBerita, setTotalBerita] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenant?.slug) return;

        async function loadStats() {
            setLoading(true);
            try {
                const response = await fetch(`/api/tenants/${tenant!.slug}/admin/dashboard`, { cache: "no-store" });
                const result = await response.json();
                if (!response.ok || result.error || !result.data) {
                    throw new Error(result.error?.message ?? "Gagal memuat dashboard.");
                }

                setTotalPenduduk(result.data.total_penduduk ?? 0);
                setTotalLembaga(result.data.total_lembaga ?? 0);
                setTotalFasilitas(result.data.total_fasilitas ?? 0);
                setTotalBerita(result.data.total_berita ?? 0);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [tenant?.slug]);

    // Chart: kelurahan distribution
    const kelurahanChart = kelurahans.slice(0, 8).map((k) => ({
        nama: k.nama.length > 12 ? k.nama.slice(0, 11) + "…" : k.nama,
        jumlah_rw: k.jumlah_rw || 0,
        jumlah_rt: k.jumlah_rt || 0,
    }));

    const pieData = [
        { name: "Pemerintahan", value: 30 },
        { name: "Kesehatan", value: 22 },
        { name: "Pendidikan", value: 18 },
        { name: "Ekonomi", value: 15 },
        { name: "Infrastruktur", value: 10 },
        { name: "Sosial", value: 5 },
    ];

    const trendData = [
        { bulan: "Jan", kelengkapan: 45 },
        { bulan: "Feb", kelengkapan: 52 },
        { bulan: "Mar", kelengkapan: 58 },
        { bulan: "Apr", kelengkapan: 63 },
        { bulan: "Mei", kelengkapan: 68 },
        { bulan: "Jun", kelengkapan: 72 },
        { bulan: "Jul", kelengkapan: 78 },
        { bulan: "Agu", kelengkapan: 82 },
    ];

    const statCards = [
        { label: "Total Penduduk", value: totalPenduduk.toLocaleString("id-ID"), icon: Users, color: "from-blue-500 to-indigo-600", iconBg: "bg-blue-500/20" },
        { label: "Lembaga", value: totalLembaga, icon: Building2, color: "from-emerald-500 to-teal-600", iconBg: "bg-emerald-500/20" },
        { label: "Fasilitas Kesehatan", value: totalFasilitas, icon: Hospital, color: "from-amber-500 to-orange-600", iconBg: "bg-amber-500/20" },
        { label: "Artikel Berita", value: totalBerita, icon: Newspaper, color: "from-rose-500 to-pink-600", iconBg: "bg-rose-500/20" },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:border-slate-200 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </div>
                            <p className="text-2xl font-extrabold text-slate-800 mb-1">
                                {loading ? <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" /> : stat.value}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Jumlah RW & RT per Kelurahan</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{kelurahans.length} kelurahan terdaftar</p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg uppercase tracking-wider">Wilayah</span>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kelurahanChart} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="nama" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "12px" }} cursor={{ fill: "#f8fafc" }} />
                                <Bar dataKey="jumlah_rw" name="RW" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="jumlah_rt" name="RT" fill="#93c5fd" radius={[6, 6, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-shadow">
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-800">Distribusi Data</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Per modul data aktif</p>
                    </div>
                    <div className="h-52 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                                    {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: "11px", border: "1px solid #e2e8f0" }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-800">100%</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Data</span>
                        </div>
                    </div>
                    <div className="space-y-2 mt-4">
                        {pieData.map((d, i) => (
                            <div key={d.name} className="flex justify-between items-center text-xs">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                                    <span className="text-slate-600">{d.name}</span>
                                </span>
                                <span className="font-bold text-slate-700">{d.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Tren Kelengkapan Data</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Persentase kelengkapan data per bulan</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg">+37% YTD</span>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="adminColorKelengkapan" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "12px" }}
                                formatter={(val: number) => [`${val}%`, "Kelengkapan"]}
                            />
                            <Area type="monotone" dataKey="kelengkapan" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#adminColorKelengkapan)" dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Module Quick Access */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Akses Cepat Modul</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Pilih modul data untuk mengelola</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">{modules.length} Modul</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {modules.map((m) => {
                        const Icon = m.icon;
                        return (
                            <Link
                                key={m.href}
                                href={toTenantPath(m.href)}
                                className="group flex flex-col items-center gap-3 bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:border-slate-200 transition-all hover:-translate-y-0.5 text-center"
                            >
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors flex items-center justify-center gap-0.5">
                                        {m.label}
                                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Kelurahan List */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Daftar Kelurahan</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Wilayah administratif di bawah kecamatan</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg">{kelurahans.length} Kelurahan</span>
                </div>
                <div className="divide-y divide-slate-50">
                    {kelurahans.map((kel, i) => (
                        <div
                            key={kel.id}
                            className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                                    {i + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">{kel.nama}</p>
                                    <p className="text-[11px] text-slate-400">{kel.kode_wilayah || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg font-medium">
                                    {kel.jumlah_rw ?? "—"} RW
                                </span>
                                <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg font-medium">
                                    {kel.jumlah_rt ?? "—"} RT
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
