"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
import {
    BarChart3, MapPin, Newspaper, Users, Building2, ChevronRight,
    TrendingUp, Heart, GraduationCap, Landmark, Shield, Hammer,
    ArrowRight, Search, Calendar, Eye, ExternalLink,
    Home, Droplets, AlertTriangle, Activity,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { motion } from "framer-motion";

import NewsCard from "@/components/news-card";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { HeroBackground } from "@/components/ui/hero-background";

/* ============================================================
   Types
============================================================ */
type Stats = {
    penduduk: number;
    kelurahan: number;
    fasilitas_kesehatan: number;
    sarana_pendidikan: number;
    rw: number;
    rt: number;
    umkm: number;
    stunting_pct: number;
    stunting_kasus: number;
    posyandu: number;
    tempat_ibadah: number;
    sarana_olahraga: number;
    proyek_berjalan: number;
};

type NewsItem = { id: string; judul: string; ringkasan?: string; gambar?: string; published_at: string; kategori?: string; slug: string };
type KelChart = { nama: string; penduduk: number; laki_laki: number; perempuan: number };

// GovTech Palette: Gold (Prestige), Cyan (Tech), Blue (Trust), Emerald (Growth)
const CHART_COLORS = ["#eab308", "#06b6d4", "#3b82f6", "#10b981", "#f43f5e", "#8b5cf6", "#f97316", "#14b8a6"];

/* ============================================================
   Modules Grid
============================================================ */
const modules = [
    { name: "Pemerintahan", href: "/data/pemerintahan", icon: Landmark, desc: "Profil, kependudukan, lembaga", color: "from-indigo-500 to-indigo-700" },
    { name: "Kesehatan", href: "/data/kesehatan", icon: Heart, desc: "Fasilitas, stunting, posyandu", color: "from-rose-500 to-rose-700" },
    { name: "Pendidikan", href: "/data/pendidikan", icon: GraduationCap, desc: "Sarana & partisipasi pendidikan", color: "from-cyan-500 to-cyan-700" },
    { name: "Ekonomi", href: "/data/ekonomi", icon: TrendingUp, desc: "UMKM, potensi, sektor usaha", color: "from-emerald-500 to-emerald-700" },
    { name: "Infrastruktur", href: "/data/infrastruktur", icon: Hammer, desc: "Pembangunan, sanitasi, olahraga", color: "from-amber-500 to-amber-700" },
    { name: "Sosial", href: "/data/sosial", icon: Home, desc: "Bantuan sosial, perumahan, disabilitas", color: "from-purple-500 to-purple-700" },
    { name: "Ketentraman", href: "/data/ketentraman", icon: Shield, desc: "Keamanan, bencana, insiden", color: "from-slate-500 to-slate-700" },
    // { name: "Berita", href: "/berita", icon: Newspaper, desc: "Berita & informasi terkini", color: "from-pink-500 to-pink-700" },
];

/* ============================================================
   Component: Stat Card (Public)
============================================================ */
// GovTech Stat Card Component
function PublicStatCard({
    label, value, icon: Icon, gradient, delay = 0,
}: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; gradient: string; delay?: number }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: delay / 1000, ease: "easeOut" }}
            className={`group relative flex flex-col items-center justify-center p-3 md:p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
        >
            {/* Top colored strip */}
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />

            <div className={`mb-2 p-2 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors text-slate-600 group-hover:text-indigo-600`}>
                <Icon className="w-4 h-4 md:w-6 md:h-6" />
            </div>
            <div className="text-lg md:text-3xl font-extrabold text-slate-800 tracking-tight group-hover:scale-110 transition-transform duration-300">
                {value}
            </div>
            <div className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1 text-center leading-tight">
                {label}
            </div>
        </motion.div>
    );
}


/* ============================================================
   Main Page
============================================================ */
export default function HomePage() {
    const { tenant, kelurahans, isLoading } = useTenant();
    const [stats, setStats] = useState<Stats>({ penduduk: 0, kelurahan: 0, fasilitas_kesehatan: 0, sarana_pendidikan: 0, rw: 0, rt: 0, umkm: 0, stunting_pct: 0, stunting_kasus: 0, posyandu: 0, tempat_ibadah: 0, sarana_olahraga: 0, proyek_berjalan: 0 });
    const [news, setNews] = useState<any[]>([]);
    const [kelChart, setKelChart] = useState<KelChart[]>([]);
    const [moduleDistrib, setModuleDistrib] = useState<{ name: string; value: number }[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const loadStats = useCallback(async () => {
        if (!tenant) return;
        const supabase = createClient();
        const tid = tenant.id;

        try {
            // Fetch counts in parallel
            const results = await Promise.all([
                supabase.from("health_facilities").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
                supabase.from("edu_facilities").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
                supabase.from("econ_potential").select("*", { count: "exact", head: true }).eq("tenant_id", tid).eq("status", "aktif"),
                supabase.from("health_posyandu").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
                supabase.from("social_religious").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
                supabase.from("infra_sports").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
                supabase.from("infra_development").select("*", { count: "exact", head: true }).eq("tenant_id", tid).eq("status", "berjalan"),
            ]);

            const [
                { count: healthCount },
                { count: eduCount },
                { count: umkmCount },
                { count: posyanduCount },
                { count: ibadahCount },
                { count: olahragaCount },
                { count: proyekCount },
            ] = results;

            // Fetch total population (latest period)
            const { data: popData } = await supabase
                .from("gov_fact_populasi_summary")
                .select("jml_penduduk_lk, jml_penduduk_pr")
                .eq("tenant_id", tid)
                .order("periode_id", { ascending: false })
                .limit(kelurahans.length);

            const totalPenduduk = popData?.reduce((sum, row) => sum + (row.jml_penduduk_lk || 0) + (row.jml_penduduk_pr || 0), 0) || 0;

            // Stunting: ambil periode terbaru (tahun+bulan) terlebih dahulu,
            // lalu aggregate SEMUA kelurahan pada periode yang sama persis.
            let stuntingPct = 0;
            let stuntingTotal = 0;
            const { data: latestPeriod } = await supabase
                .from("health_stunting_agregat_view")
                .select("tahun, bulan")
                .eq("tenant_id", tid)
                .order("tahun", { ascending: false })
                .order("bulan", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestPeriod) {
                const { data: stuntingData } = await supabase
                    .from("health_stunting_agregat_view")
                    .select("balita_total, balita_stunting")
                    .eq("tenant_id", tid)
                    .eq("tahun", latestPeriod.tahun)
                    .eq("bulan", latestPeriod.bulan);

                if (stuntingData && stuntingData.length > 0) {
                    const totalBalita = stuntingData.reduce((s, r) => s + (Number(r.balita_total) || 0), 0);
                    const totalStunting = stuntingData.reduce((s, r) => s + (Number(r.balita_stunting) || 0), 0);
                    stuntingTotal = totalStunting;
                    const rawPct = totalBalita > 0 ? Math.round((totalStunting / totalBalita) * 1000) / 10 : 0;
                    // Sanity guard: ≥ 95% tidak realistis → data import belum diverifikasi
                    stuntingPct = rawPct < 95 ? rawPct : 0;
                }
            }

            const totalRW = kelurahans.reduce((s, k) => s + (k.jumlah_rw || 0), 0);
            const totalRT = kelurahans.reduce((s, k) => s + (k.jumlah_rt || 0), 0);

            setStats({
                penduduk: totalPenduduk,
                kelurahan: kelurahans.length,
                fasilitas_kesehatan: healthCount || 0,
                sarana_pendidikan: eduCount || 0,
                rw: totalRW,
                rt: totalRT,
                umkm: umkmCount || 0,
                stunting_pct: stuntingPct,
                stunting_kasus: stuntingTotal,
                posyandu: posyanduCount || 0,
                tempat_ibadah: ibadahCount || 0,
                sarana_olahraga: olahragaCount || 0,
                proyek_berjalan: proyekCount || 0,
            });

            // Distribution pie chart - meaningful facility counts
            setModuleDistrib([
                { name: "Faskes", value: healthCount || 0 },
                { name: "Sekolah", value: eduCount || 0 },
                { name: "UMKM", value: umkmCount || 0 },
                { name: "Posyandu", value: posyanduCount || 0 },
                { name: "Tempat Ibadah", value: ibadahCount || 0 },
                { name: "Sarana Olahraga", value: olahragaCount || 0 },
            ]);

            // Kelurahan chart data - fetch population per kelurahan
            const { data: kelPopData } = await supabase
                .from("gov_fact_populasi_summary")
                .select("kelurahan_id, jml_penduduk_lk, jml_penduduk_pr")
                .eq("tenant_id", tid)
                .order("periode_id", { ascending: false })
                .limit(kelurahans.length);

            const popMap = new Map<string, { l: number; p: number }>();
            kelPopData?.forEach((row) => {
                if (!popMap.has(row.kelurahan_id)) {
                    popMap.set(row.kelurahan_id, { l: row.jml_penduduk_lk || 0, p: row.jml_penduduk_pr || 0 });
                }
            });

            setKelChart(
                kelurahans.slice(0, 10).map((k) => {
                    const pop = popMap.get(k.id) || { l: 0, p: 0 };
                    return {
                        nama: k.nama.length > 12 ? k.nama.substring(0, 12) + "…" : k.nama,
                        penduduk: pop.l + pop.p,
                        laki_laki: pop.l,
                        perempuan: pop.p,
                    };
                })
            );
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }, [tenant, kelurahans]);

    const loadNews = useCallback(async () => {
        if (!tenant) return;
        const supabase = createClient();
        const { data } = await supabase
            .from("news_articles")
            .select("id, judul, slug, ringkasan, gambar, published_at, kategori")
            .eq("tenant_id", tenant.id)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(3);

        if (data) setNews(data);
    }, [tenant]);

    useEffect(() => {
        loadStats();
        loadNews();
    }, [loadStats, loadNews]);

    const filteredKelurahans = kelurahans.filter((k) =>
        k.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f8fafc]">

            {/* ========== HERO — GovTech Future Theme ========== */}
            <header className="relative text-white pb-12 md:pb-24 min-h-[50vh] md:min-h-screen flex flex-col">
                {/* Desktop Background (hidden on mobile) */}
                <div className="hidden md:block absolute inset-0 w-full h-full overflow-hidden">
                    <HeroBackground />
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none z-10" />
                    <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />
                </div>

                {/* Mobile Background: Slate 900 (hidden on desktop) */}
                <div className="md:hidden absolute inset-0 w-full h-full bg-slate-900 z-0 overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-400/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 left-10 w-40 h-40 bg-gold-400/10 rounded-full blur-3xl" />
                    
                    {/* SVG Curve Circle */}
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-[1px]">
                        <svg className="relative block w-full h-[40px] sm:h-[60px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                            <path d="M0,120 L0,0 Q600,120 1200,0 L1200,120 Z" fill="#f8fafc"></path>
                        </svg>
                    </div>
                </div>

                {/* Nav */}
                <div className="relative z-30">
                    <Navbar />
                </div>

                {/* Hero Content Desktop */}
                <div className="hidden md:flex relative z-10 px-6 pt-12 pb-40 max-w-7xl mx-auto w-full flex-grow flex-col justify-end">
                    {/* Tulisan hero header telah dihilangkan sesuai permintaan, div ini sekarang melar memenuhi layar */}
                </div>

                {/* Hero Content Mobile */}
                <div className="md:hidden relative z-20 px-6 pt-12 pb-20 max-w-7xl mx-auto w-full flex-grow flex flex-col justify-center items-center text-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 drop-shadow-sm">
                            SIMDATA <br />
                            <span className="text-cyan-300">KECAMATAN</span>
                        </h1>
                        <p className="text-blue-100 text-xs sm:text-sm max-w-[240px] sm:max-w-xs mx-auto font-medium">
                            Data Transparan untuk Pelayanan Lebih Baik
                        </p>
                    </motion.div>
                </div>
            </header>

            {/* ========== QUICK STATS ========== */}
            <section className="px-6 mt-8 lg:mt-12 relative z-20 max-w-7xl mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <PublicStatCard label="Penduduk" value={stats.penduduk > 0 ? stats.penduduk.toLocaleString("id-ID") + " jiwa" : "-"} icon={Users} gradient="stat-gradient-blue" delay={0} />
                    <PublicStatCard label="Kelurahan" value={stats.kelurahan || kelurahans.length} icon={MapPin} gradient="stat-gradient-cyan" delay={100} />
                    <PublicStatCard label="Faskes" value={stats.fasilitas_kesehatan} icon={Heart} gradient="stat-gradient-emerald" delay={200} />
                    <PublicStatCard label="Sekolah" value={stats.sarana_pendidikan} icon={GraduationCap} gradient="stat-gradient-amber" delay={300} />
                </div>
            </section>

            {/* ========== DATA VISUALIZATION ========== */}
            <section className="px-6 py-20 max-w-7xl mx-auto" id="data">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-8 md:mb-12"
                >
                    <span className="inline-flex px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-primary-50 text-primary-600 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3">
                        Visualisasi Data
                    </span>
                    <h3 className="text-2xl md:text-4xl font-extrabold text-gray-900">Data Kecamatan dalam Angka</h3>
                    <p className="mt-2 md:mt-3 text-sm md:text-base text-gray-500 max-w-xl mx-auto">Ringkasan data terpadu dari seluruh kelurahan se-kecamatan</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Bar Chart - Population per Kelurahan */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="lg:col-span-2 card-gov-tech p-8"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900">Penduduk per Kelurahan</h4>
                                <p className="text-sm text-slate-500 mt-1">Data kependudukan real-time per wilayah</p>
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                                Live Update
                            </div>
                        </div>
                        <div className="h-80">
                            {kelChart.length > 0 && kelChart.some(k => k.penduduk > 0) ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={kelChart} barGap={2} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="nama" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v} />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                            formatter={(value: number) => value.toLocaleString("id-ID") + " jiwa"}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                                        <Bar dataKey="laki_laki" name="Laki-laki" fill="#3b82f6" radius={[0, 0, 4, 4]} stackId="pop" maxBarSize={40} />
                                        <Bar dataKey="perempuan" name="Perempuan" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="pop" maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <Activity className="w-8 h-8 mr-2 animate-spin" /> Memuat data...
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Pie Chart - Facility Distribution */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="card-gov-tech p-5 md:p-8 flex flex-col h-full"
                    >
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div>
                                <h4 className="text-lg md:text-xl font-bold text-slate-900">Statistik Fasilitas</h4>
                                <p className="text-xs md:text-sm text-slate-500 mt-1">Distribusi sarana publik</p>
                            </div>
                        </div>
                        <div className="h-48 md:h-64 relative w-full flex-grow">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={moduleDistrib.filter((d) => d.value > 0)}
                                        cx="50%" cy="50%"
                                        innerRadius="60%" outerRadius="90%"
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {moduleDistrib.filter((d) => d.value > 0).map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                        formatter={(value: number) => `${value} unit`}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center bg-white/50 backdrop-blur-sm rounded-full w-20 h-20 md:w-24 md:h-24 flex flex-col items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                                    <span className="block text-xl md:text-2xl font-bold text-slate-800 leading-none mb-1">
                                        {moduleDistrib.reduce((a, b) => a + b.value, 0)}
                                    </span>
                                    <span className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest">Total</span>
                                </div>
                            </div>
                        </div>
                        {/* Custom HTML Legend */}
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6">
                            {moduleDistrib.filter((d) => d.value > 0).map((entry, index) => (
                                <div key={index} className="flex items-center text-[11px] md:text-xs text-slate-600 font-medium">
                                    <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full mr-2 shadow-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Stats Row 2 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <PublicStatCard label="UMKM Aktif" value={stats.umkm} icon={TrendingUp} gradient="stat-gradient-purple" delay={400} />
                    <PublicStatCard label="Tempat Ibadah" value={stats.tempat_ibadah} icon={Building2} gradient="stat-gradient-rose" delay={500} />
                    <PublicStatCard label="Posyandu" value={stats.posyandu} icon={Heart} gradient="stat-gradient-blue" delay={600} />
                    <PublicStatCard label="Proyek Aktif" value={stats.proyek_berjalan} icon={Hammer} gradient="stat-gradient-cyan" delay={700} />
                </div>
            </section>

            {/* ========== MODULES GRID ========== */}
            <section className="px-6 py-16 max-w-7xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-8 md:mb-12"
                >
                    <span className="inline-flex px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-primary-50 text-primary-600 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3">
                        Kategori
                    </span>
                    <h3 className="text-2xl md:text-4xl font-extrabold text-gray-900">Jelajahi Data Berdasarkan Modul</h3>
                    <p className="mt-2 md:mt-3 text-sm md:text-base text-gray-500">Pilih kategori data yang ingin Anda telusuri</p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {modules.map((mod, i) => (
                        <motion.div
                            key={mod.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                        >
                            <Link
                                href={mod.href}
                                className="group futuristic-card p-4 md:p-6 block h-full"
                            >
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                                    <mod.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-gray-900 mb-1 group-hover:text-primary-700 transition-colors text-sm md:text-base">{mod.name}</h4>
                                <p className="text-xs md:text-sm text-gray-500 mb-3 line-clamp-2 md:line-clamp-none">{mod.desc}</p>
                                <span className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-primary-500 group-hover:gap-2 transition-all">
                                    Lihat Data <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </span>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ========== KELURAHAN GRID ========== */}
            {
                kelurahans.length > 0 && (
                    <section className="px-6 py-16 max-w-7xl mx-auto">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6 }}
                            className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4"
                        >
                            <div>
                                <span className="inline-flex px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-accent-500/10 text-accent-600 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3">
                                    Wilayah
                                </span>
                                <h3 className="text-2xl md:text-4xl font-extrabold text-gray-900">
                                    {stats.kelurahan} Kelurahan
                                </h3>
                                <p className="mt-2 text-sm md:text-base text-gray-500">Wilayah {tenant?.nama || "Kecamatan"} Kota Bogor</p>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari kelurahan..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all shadow-sm"
                                />
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredKelurahans.map((kel, i) => (
                                <motion.div
                                    key={kel.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.4, delay: (i % 8) * 0.05, ease: "easeOut" }}
                                >
                                    <Link
                                        href={`/data/pemerintahan?kelurahan=${kel.id}`}
                                        className="group futuristic-card p-5 block h-full"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                                                <MapPin className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm truncate">
                                                {kel.nama}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {(kel.jumlah_rw ?? 0) > 0 && (
                                                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded-md">
                                                    <span>{kel.jumlah_rw}</span> RW
                                                </span>
                                            )}
                                            {(kel.jumlah_rt ?? 0) > 0 && (
                                                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-md">
                                                    <span>{kel.jumlah_rt}</span> RT
                                                </span>
                                            )}
                                            {!(kel.jumlah_rw ?? 0) && !(kel.jumlah_rt ?? 0) && (
                                                <span className="text-xs text-slate-400 italic">—</span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex items-center gap-1 text-xs text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                            Lihat Detail <ExternalLink className="w-3 h-3" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )
            }

            {/* ========== BERITA ========== */}
            {/* <section className="px-6 py-16 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
                        <div>
                            <span className="inline-flex px-4 py-1.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-widest mb-3">
                                Berita Terkini
                            </span>
                            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900">Informasi & Kegiatan</h3>
                            <p className="mt-2 text-gray-500">Berita dan pengumuman terbaru dari {tenant?.nama || "Kecamatan"}</p>
                        </div>
                        <Link href="/berita" className="mt-4 md:mt-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">
                            Lihat Semua <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {news.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {news.map((item, i) => (
                                <NewsCard key={item.id} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 futuristic-card">
                            <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Belum ada berita yang dipublikasikan</p>
                        </div>
                    )}
                </div>
            </section> */}


            {/* ========== INFOGRAFIS / CTA ========== */}
            <section className="px-4 md:px-6 py-12 md:py-20">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98, y: 30 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-7xl mx-auto"
                >
                    <div className="relative overflow-hidden rounded-3xl bg-digital-batik text-white p-6 md:p-16 shadow-2xl">
                        <div className="absolute inset-0 bg-grid opacity-20" />
                        <div className="absolute top-0 right-0 w-72 h-72 bg-accent-400/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-52 h-52 bg-gold-400/10 rounded-full blur-3xl" />

                        <div className="relative z-10 grid lg:grid-cols-2 gap-8 md:gap-10 items-center">
                            <div className="text-center lg:text-left">
                                <h3 className="text-xl md:text-4xl font-extrabold leading-tight mb-3 md:mb-4">
                                    Data Transparan untuk <span className="gradient-text-gold">Pelayanan Lebih Baik</span>
                                </h3>
                                <p className="text-white/70 md:text-white/50 mb-5 md:mb-8 text-xs md:text-lg leading-relaxed">
                                    SIMDATA KECAMATAN menyediakan data terpadu dari seluruh kelurahan se-kecamatan.
                                    Akses data publik kapan saja, mendukung transparansi dan partisipasi masyarakat
                                    dalam pembangunan.
                                </p>
                                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                                    <Link href="#data" className="px-5 py-2.5 md:px-6 md:py-3 text-xs md:text-base bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-xl">
                                        Jelajahi Data
                                    </Link>
                                    {/* <Link href="/peta" className="px-6 py-3 glass font-bold rounded-xl hover:bg-white/15 transition-all">
                                        Buka Peta Interaktif
                                    </Link> */}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Penduduk", value: stats.penduduk > 0 ? stats.penduduk.toLocaleString("id-ID") : "-", icon: Users },
                                    { label: "Kelurahan", value: stats.kelurahan, icon: MapPin },
                                    { label: "Modul Data", value: `${modules.length}`, icon: BarChart3 },
                                    { label: "Update", value: "Real-time", icon: Activity },
                                ].map((item, idx) => (
                                    <motion.div 
                                        key={item.label}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
                                        className="glass rounded-2xl p-3 md:p-5 text-center"
                                    >
                                        <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white/60 mx-auto mb-1.5 md:mb-2" />
                                        <div className="text-lg md:text-2xl font-extrabold leading-tight">{item.value}</div>
                                        <div className="text-[10px] md:text-xs text-white/50 mt-1">{item.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ========== FOOTER ========== */}
            <Footer />
        </div >
    );
}
