"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import type { Kelurahan } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart3, MapPin, Users, ChevronLeft, Building2,
    Landmark, Activity, Search, ChevronDown, ChevronUp,
    ArrowUpDown, UserCheck, Baby, Home as HomeIcon,
    TrendingUp, LayoutGrid, List, Globe, Phone, Mail, Filter, Clock,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    AreaChart, Area, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line,
} from "recharts";

/* ============================================================
   Animation Variants
============================================================ */
const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
} as const;

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
} as const;

const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
} as const;

/* Menyamarkan 5 digit terakhir NIP untuk perlindungan privasi */
const maskNip = (nip: string | null | undefined): string => {
    if (!nip) return "";
    if (nip.length <= 5) return "x".repeat(nip.length);
    return nip.slice(0, -5) + "xxxxx";
};

/* ============================================================
   Types
============================================================ */
// New fact/dimension types
type RefItem = { id: number; nama: string };
type RefKelompokUmurItem = { id: number; rentang_umur: string };
type PeriodeItem = { id: number; tahun: number; semester: number; keterangan: string | null };

type SummaryRow = {
    id: string; kelurahan_id: string; periode_id: number;
    jml_penduduk_lk: number; jml_penduduk_pr: number; jml_penduduk_total: number;
    jml_kk_lk: number; jml_kk_pr: number; jml_kk_total: number;
};
type DimFactRow = {
    id: string; kelurahan_id: string; periode_id: number;
    dim_id: number; jml_lk: number; jml_pr: number; total: number;
};
type KelompokUmurFactRow = {
    id: string; kelurahan_id: string; periode_id: number;
    kelompok_umur_id: number; jml_lk: number; jml_pr: number; total: number;
};
type UmurTunggalRow = {
    id: string; kelurahan_id: string; periode_id: number;
    umur: number; jml_lk: number; jml_pr: number; total: number;
};
type DokumenKtpRow = {
    id: string; kelurahan_id: string; periode_id: number;
    wajib_ktp_lk: number; wajib_ktp_pr: number; wajib_ktp_total: number;
    punya_ktp_lk: number; punya_ktp_pr: number; punya_ktp_total: number;
};
type DokumenKiaRow = {
    id: string; kelurahan_id: string; periode_id: number;
    wajib_kia_lk: number; wajib_kia_pr: number; wajib_kia_total: number;
    punya_kia_lk: number; punya_kia_pr: number; punya_kia_total: number;
};
type DokumenAktaRow = {
    id: string; kelurahan_id: string; periode_id: number;
    penduduk_0_18_lk: number; penduduk_0_18_pr: number; penduduk_0_18_total: number;
    punya_akta_lk: number; punya_akta_pr: number; punya_akta_total: number;
};

type LembagaRow = {
    id: string;
    kelurahan_id: string;
    nama: string;
    jenis: string;
    ketua: string | null;
    jumlah_anggota: number;
    status: string;
};

type ProfileRow = {
    id: string;
    tenant_id: string;
    kelurahan_id: string | null;
    tahun: number;
    visi: string;
    misi: string;
    peta_wilayah: string | null;
    tentang_wilayah: string | null;
};

type OrganisasiRow = {
    id: string;
    tenant_id: string;
    kelurahan_id: string | null;
    jabatan: string;
    nama_pejabat: string;
    nip: string | null;
    foto: string | null;
    urutan: number;
    is_active: boolean;
};

/* ============================================================
   Constants
============================================================ */
const CHART_COLORS = ["#3b82f6", "#f43f5e", "#10b981", "#eab308", "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6", "#ec4899", "#84cc16"];

const KELURAHAN_ICONS = ["🏘️", "🏠", "🏡", "🏢", "🏫", "🏛️", "🏗️", "🏟️", "🗺️", "📍", "🌆", "🌇"];

const LEMBAGA_ICON_MAP: Record<string, string> = {
    RT: "🏠", RW: "🏘️", PKK: "👩‍👧‍👦", "Karang Taruna": "🧑‍🤝‍🧑", LPM: "🏛️",
    Posyandu: "🩺", "Majelis Taklim": "🕌", Lainnya: "📋",
};

// Storage URL builder
const STORAGE_URL = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || "/uploads";
function buildStorageUrl(path: string | null | undefined, bucket: string): string | null {
    if (!path) return null;
    // Already a full URL
    if (path.startsWith('http') || path.startsWith('/')) return path;
    if (path.includes('/')) return `${STORAGE_URL}/${path}`;
    // Relative path in bucket
    if (!STORAGE_URL) return null;
    return `${STORAGE_URL}/${bucket}/${path}`;
}

/* ============================================================
   Utility: Basic Statistics
============================================================ */
function computeStats(values: number[]) {
    if (values.length === 0) return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, range: 0, count: 0, cv: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median = count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? Math.round((stdDev / mean) * 100) : 0;
    return { mean: Math.round(mean), median: Math.round(median), stdDev: Math.round(stdDev), min: sorted[0], max: sorted[count - 1], range: sorted[count - 1] - sorted[0], count, cv };
}

/* ============================================================
   Section 1: Profil Wilayah
============================================================ */
function ProfilSection({ tenant, kelurahans, selectedKelurahan, profiles, organisasi }: { tenant: any; kelurahans: Kelurahan[]; selectedKelurahan: string | null; profiles: ProfileRow[]; organisasi: OrganisasiRow[] }) {
    // Filter if selected
    const displayedKelurahans = selectedKelurahan
        ? kelurahans.filter((k) => k.id === selectedKelurahan)
        : kelurahans;

    const currentKelurahan = selectedKelurahan ? kelurahans.find((k) => k.id === selectedKelurahan) : null;

    // Find Profile — prefer latest tahun, and among same kelurahan prefer one with peta_wilayah
    const candidateProfiles = selectedKelurahan
        ? profiles.filter((p) => p.kelurahan_id === selectedKelurahan)
        : profiles.filter((p) => p.kelurahan_id === null);
    // Sort by tahun desc, then pick first with peta_wilayah, else just pick latest
    const sortedCandidates = [...candidateProfiles].sort((a, b) => b.tahun - a.tahun);
    const currentProfile = sortedCandidates.find((p) => !!p.peta_wilayah) ?? sortedCandidates[0] ?? null;

    // Filter Organisasi for current context
    const currentOrganisasi = organisasi.filter((o) =>
        selectedKelurahan ? o.kelurahan_id === selectedKelurahan : o.kelurahan_id === null
    );

    // Find leader (urutan=1) from organisasi
    const currentLeader = currentOrganisasi.find((o) => o.urutan === 1);

    const totalRW = displayedKelurahans.reduce((s, k) => s + (k.jumlah_rw || 0), 0);
    const totalRT = displayedKelurahans.reduce((s, k) => s + (k.jumlah_rt || 0), 0);
    const totalLuas = displayedKelurahans.reduce((s, k) => s + (Number(k.luas_km2) || 0), 0);

    return (
        <motion.section variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-start gap-4 mb-2">
                <div className="p-2.5 rounded-xl bg-indigo-50 flex-shrink-0 self-start">
                    <Landmark className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h2 className="text-xl font-extrabold text-slate-800">
                            {selectedKelurahan
                                ? `Profil Kelurahan ${currentKelurahan?.nama}`
                                : `Profil ${tenant?.nama ?? "Kecamatan"}`}
                        </h2>
                        {!selectedKelurahan && tenant?.kode_wilayah && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold tracking-wide border border-indigo-200">
                                <Globe className="w-3 h-3" />
                                {tenant.kode_wilayah}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500">Informasi umum, visi misi, dan pimpinan wilayah</p>

                    {/* Quick info strip — only when viewing kecamatan level 
                    {!selectedKelurahan && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            {tenant?.alamat && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                    <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                                    <span className="truncate max-w-[220px]">{tenant.alamat}</span>
                                </span>
                            )}
                            {tenant?.telepon && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                    <Phone className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                    {tenant.telepon}
                                </span>
                            )}
                            {tenant?.website && (
                                <a
                                    href={tenant.website.startsWith("http") ? tenant.website : `https://${tenant.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                                >
                                    <Globe className="w-3 h-3 flex-shrink-0" />
                                    {tenant.website.replace(/^https?:\/\//, "")}
                                </a>
                            )}
                        </div>
                    )} */}
                </div>
            </motion.div>

            {/* Top Grid: Info & Leader */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Leader Card */}
                <motion.div variants={fadeUp} className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center h-full relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-500 to-blue-600 opacity-10" />

                        <div className="relative z-10">
                            <div className="w-32 h-32 mx-auto rounded-full p-1 bg-white border-2 border-indigo-100 shadow-md mb-4 relative">
                                {currentLeader?.foto ? (
                                    <img src={buildStorageUrl(currentLeader.foto, 'gov-profiles') || currentLeader.foto} alt={currentLeader.nama_pejabat} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-4xl">
                                        👨‍💼
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                                    <Activity className="w-4 h-4" />
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800">{currentLeader?.nama_pejabat || (selectedKelurahan ? "Lurah Belum Ditentukan" : "Camat Belum Ditentukan")}</h3>
                            <p className="text-sm text-indigo-600 font-medium mb-1">{currentLeader?.jabatan || (selectedKelurahan ? "Lurah" : "Camat")}</p>
                            {currentLeader?.nip && (
                                <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-500">
                                    NIP. {maskNip(currentLeader.nip)}
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Right: Visi Misi */}
                <motion.div variants={fadeUp} className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 h-full relative">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <QuoteIcon className="w-24 h-24 text-slate-900" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-indigo-500 rounded-full" /> Visi & Misi
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-2">Visi</h4>
                                <blockquote className="text-lg font-medium text-slate-700 italic border-l-4 border-indigo-200 pl-4 py-1">
                                    "{currentProfile?.visi || "Mewujudkan pelayanan publik yang prima dan masyarakat yang sejahtera."}"
                                </blockquote>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3">Misi</h4>
                                <ul className="space-y-2">
                                    {(currentProfile?.misi || "Meningkatkan kualitas SDM;Optimalisasi pelayanan publik;Pembangunan infrastruktur berkelanjutan").split(';').map((m, i) => (
                                        <li key={i} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-100">{i + 1}</span>
                                            <span>{m.trim()}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Middle: Info Stats & Location */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Informasi Wilayah</h3>
                    {!selectedKelurahan && <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">Kecamatan</span>}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column: Portrait Peta Wilayah */}
                    <div className="md:col-span-5 lg:col-span-4 min-h-[400px] md:min-h-[500px] bg-slate-100 rounded-3xl relative overflow-hidden group shadow-inner border border-slate-200">
                        {buildStorageUrl(currentProfile?.peta_wilayah, 'gov-profiles') ? (
                            <>
                                <img
                                    src={buildStorageUrl(currentProfile!.peta_wilayah, 'gov-profiles')!}
                                    alt={`Peta Wilayah ${selectedKelurahan ? currentKelurahan?.nama : (tenant?.nama || 'Kecamatan')}`}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent pointer-events-none" />
                                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="p-2 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30 text-white">
                                            <MapPin className="w-5 h-5" />
                                        </span>
                                        <h4 className="text-white text-base font-bold shadow-sm leading-tight">
                                            Peta Wilayah<br />{selectedKelurahan ? currentKelurahan?.nama : (tenant?.nama || 'Kecamatan')}
                                        </h4>
                                    </div>
                                    <p className="text-white/70 text-[11px] font-medium pl-12 uppercase tracking-widest">
                                        Peta Administrasi
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 border-4 border-white rounded-3xl m-2">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm mb-4">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <p className="font-bold text-sm text-slate-800">Peta Belum Tersedia</p>
                                <p className="text-xs text-slate-500 mt-2 max-w-[200px] text-center leading-relaxed">
                                    Silakan upload gambar peta wilayah menggunakan format portrait di panel admin CMS.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Stats & Information */}
                    <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-6 justify-center">
                        {/* 1. Key Statistics */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "Jumlah RW", value: totalRW, icon: "🏘️", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                                { label: "Jumlah RT", value: totalRT, icon: "🏠", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                                { label: "Luas (km²)", value: totalLuas > 0 ? totalLuas.toFixed(2) : "-", icon: "📐", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                            ].map((item, idx) => (
                                <div key={idx} className={`p-5 rounded-3xl text-center bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group`}>
                                    <div className={`w-14 h-14 mx-auto rounded-2xl ${item.bg} ${item.color} ${item.border} border flex items-center justify-center text-2xl mb-4 group-hover:-translate-y-1 transition-transform`}>
                                        {item.icon}
                                    </div>
                                    <p className="text-3xl font-black text-slate-800 mb-1">{item.value}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* 2. Jam Pelayanan & Kontak Cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Operational Hours */}
                            <div className="p-6 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-3xl border border-indigo-100/50 flex flex-col justify-center">
                                <h4 className="font-bold text-indigo-900 mb-5 flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><Clock className="w-4 h-4" /></div>
                                    Jam Pelayanan
                                </h4>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between items-center pb-2 border-b border-indigo-100/50">
                                        <span className="font-semibold text-slate-600">Senin - Kamis</span>
                                        <span className="font-bold bg-white text-indigo-700 px-3 py-1 rounded-md shadow-sm text-xs">08:00 - 16:00 WIB</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-indigo-100/50">
                                        <span className="font-semibold text-slate-600">Jumat</span>
                                        <span className="font-bold bg-white text-indigo-700 px-3 py-1 rounded-md shadow-sm text-xs">08:00 - 16:30 WIB</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-400 italic pt-1">
                                        <span className="font-medium">Sabtu - Minggu</span>
                                        <span className="font-bold px-3 py-1 bg-slate-100 rounded-md text-slate-500 text-xs shadow-sm">Tutup</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details */}
                            {!selectedKelurahan && (
                                <div className="flex flex-col gap-4">
                                    {tenant?.alamat && (
                                        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors flex-1 flex flex-col justify-center gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-rose-50 rounded-lg text-rose-500"><MapPin className="w-4 h-4" /></div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alamat Kantor</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 leading-relaxed pl-11">{tenant.alamat}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        {tenant?.telepon && (
                                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-600"><Phone className="w-3.5 h-3.5" /></div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telepon</span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 truncate">{tenant.telepon}</p>
                                            </div>
                                        )}
                                        {tenant?.email && (
                                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-sky-50 rounded-md text-sky-600"><Mail className="w-3.5 h-3.5" /></div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Resmi</span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-700 break-all leading-relaxed">{tenant.email}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tentang Wilayah */}
            {currentProfile?.tentang_wilayah && (
                <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                        Tentang {selectedKelurahan ? `Kelurahan ${currentKelurahan?.nama}` : (tenant?.nama || 'Kecamatan')}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                        {currentProfile.tentang_wilayah}
                    </p>
                </motion.div>
            )}

            {/* Struktur Organisasi */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                    Struktur Organisasi
                </h3>
                {currentOrganisasi.length > 0 ? (
                    <div className="flex flex-col gap-8 items-center relative">
                        {/* Connecting line background */}
                        <div className="absolute top-8 bottom-8 left-1/2 w-0.5 bg-slate-100 -translate-x-1/2 z-0 hidden md:block" />

                        {[...new Set(currentOrganisasi.map(o => o.urutan))].sort((a, b) => a - b).map(urutan => {
                            const orgs = currentOrganisasi.filter(o => o.urutan === urutan).sort((a, b) => a.id.localeCompare(b.id));
                            return (
                                <div key={urutan} className="flex flex-wrap justify-center gap-6 w-full relative z-10">
                                    {orgs.map((org) => (
                                        <div key={org.id} className="w-48 text-center p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                                            <div className="w-20 h-20 mx-auto rounded-full bg-slate-50 border-4 border-white outline outline-1 outline-indigo-100 shadow-sm mb-4 flex items-center justify-center overflow-hidden">
                                                {org.foto ? (
                                                    <img src={buildStorageUrl(org.foto, 'gov-profiles') || org.foto} alt={org.nama_pejabat} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl">👨‍💼</span>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-sm text-slate-800 mb-1 leading-tight">{org.nama_pejabat}</h4>
                                            <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mb-2">{org.jabatan}</p>
                                            {org.nip && (
                                                <div className="inline-block px-2 py-1 bg-slate-50 rounded text-[10px] text-slate-500 font-mono border border-slate-100">
                                                    NIP. {maskNip(org.nip)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500">Belum ada data struktur organisasi.</p>
                        <p className="text-xs text-slate-400 mt-1">Tambahkan data melalui panel admin.</p>
                    </div>
                )}
            </motion.div>

            {/* Kelurahan Grid (Icons) - Only show if ALL */}
            {!selectedKelurahan && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Daftar Kelurahan
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {kelurahans.map((kel, i) => (
                            <div key={kel.id} className="group p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:shadow-md transition-all text-center cursor-default border border-transparent hover:border-indigo-100">
                                <span className="text-3xl block mb-3 transform group-hover:scale-110 transition-transform">{KELURAHAN_ICONS[i % KELURAHAN_ICONS.length]}</span>
                                <p className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 truncate">{kel.nama}</p>
                                <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-slate-400">
                                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 group-hover:border-indigo-100"><b className="text-slate-600">{kel.jumlah_rw || 0}</b> RW</span>
                                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-100 group-hover:border-indigo-100"><b className="text-slate-600">{kel.jumlah_rt || 0}</b> RT</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.section>
    );
}

const QuoteIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91197 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46428 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56893 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
    </svg>
);

/* ============================================================
   Section 2: Data Kependudukan (New Star Schema)
============================================================ */
type KependudukanData = {
    periodes: PeriodeItem[];
    summary: SummaryRow[];
    agama: DimFactRow[]; refAgama: RefItem[];
    goldar: DimFactRow[]; refGoldar: RefItem[];
    pendidikan: DimFactRow[]; refPendidikan: RefItem[];
    pekerjaan: DimFactRow[]; refPekerjaan: RefItem[];
    statusKawin: DimFactRow[]; refStatusKawin: RefItem[];
    // New tables
    kelompokUmur: KelompokUmurFactRow[]; refKelompokUmur: RefKelompokUmurItem[];
    umurTunggal: UmurTunggalRow[];
    dokumenKtp: DokumenKtpRow[];
    dokumenKia: DokumenKiaRow[];
    dokumenAkta: DokumenAktaRow[];
};

function KependudukanSection({ kData, kelurahans, selectedKelurahan }: { kData: KependudukanData; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const [selectedPeriode, setSelectedPeriode] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'agama' | 'pendidikan' | 'pekerjaan' | 'status_kawin' | 'goldar' | 'piramida' | 'dokumen'>('agama');

    // Pick latest periode by default
    const latestPeriode = useMemo(() => {
        if (!kData.periodes.length) return null;
        return kData.periodes.reduce((a, b) => (a.tahun > b.tahun || (a.tahun === b.tahun && a.semester > b.semester)) ? a : b);
    }, [kData.periodes]);

    const activePeriodeId = selectedPeriode ?? latestPeriode?.id ?? null;

    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach((k) => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    // Filter summary by periode and kelurahan
    const filteredSummary = useMemo(() => {
        let rows = kData.summary;
        if (activePeriodeId !== null) rows = rows.filter(r => r.periode_id === activePeriodeId);
        if (selectedKelurahan) rows = rows.filter(r => r.kelurahan_id === selectedKelurahan);
        return rows;
    }, [kData.summary, activePeriodeId, selectedKelurahan]);

    const totalLk = filteredSummary.reduce((s, r) => s + (r.jml_penduduk_lk || 0), 0);
    const totalPr = filteredSummary.reduce((s, r) => s + (r.jml_penduduk_pr || 0), 0);
    const totalPenduduk = filteredSummary.reduce((s, r) => s + (r.jml_penduduk_total || 0), 0);
    const totalKK = filteredSummary.reduce((s, r) => s + (r.jml_kk_total || 0), 0);
    const sexRatio = totalPr > 0 ? ((totalLk / totalPr) * 100).toFixed(1) : '-';

    // Helper to aggregate dim fact rows
    function aggregateDim(rows: DimFactRow[], refs: RefItem[], dimKey: 'dim_id'): { name: string; lk: number; pr: number; total: number }[] {
        const filtered = rows.filter(r => {
            const periodeOk = activePeriodeId === null || r.periode_id === activePeriodeId;
            const kelOk = !selectedKelurahan || r.kelurahan_id === selectedKelurahan;
            return periodeOk && kelOk;
        });
        const map: Record<number, { lk: number; pr: number }> = {};
        filtered.forEach(r => {
            if (!map[r.dim_id]) map[r.dim_id] = { lk: 0, pr: 0 };
            map[r.dim_id].lk += r.jml_lk || 0;
            map[r.dim_id].pr += r.jml_pr || 0;
        });
        return refs.map(ref => ({
            name: ref.nama,
            lk: map[ref.id]?.lk || 0,
            pr: map[ref.id]?.pr || 0,
            total: (map[ref.id]?.lk || 0) + (map[ref.id]?.pr || 0),
        })).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
    }

    const agamaData = useMemo(() => aggregateDim(kData.agama, kData.refAgama, 'dim_id'), [kData.agama, kData.refAgama, activePeriodeId, selectedKelurahan]);
    const goldarData = useMemo(() => aggregateDim(kData.goldar, kData.refGoldar, 'dim_id'), [kData.goldar, kData.refGoldar, activePeriodeId, selectedKelurahan]);
    const pendidikanData = useMemo(() => aggregateDim(kData.pendidikan, kData.refPendidikan, 'dim_id'), [kData.pendidikan, kData.refPendidikan, activePeriodeId, selectedKelurahan]);
    const pekerjaanData = useMemo(() => aggregateDim(kData.pekerjaan, kData.refPekerjaan, 'dim_id'), [kData.pekerjaan, kData.refPekerjaan, activePeriodeId, selectedKelurahan]);
    const statusKawinData = useMemo(() => aggregateDim(kData.statusKawin, kData.refStatusKawin, 'dim_id'), [kData.statusKawin, kData.refStatusKawin, activePeriodeId, selectedKelurahan]);

    // Piramida Penduduk: aggregate kelompok umur
    const piramidaData = useMemo(() => {
        const rows = kData.kelompokUmur.filter(r => {
            const periodeOk = activePeriodeId === null || r.periode_id === activePeriodeId;
            const kelOk = !selectedKelurahan || r.kelurahan_id === selectedKelurahan;
            return periodeOk && kelOk;
        });
        const map: Record<number, { lk: number; pr: number }> = {};
        rows.forEach(r => {
            if (!map[r.kelompok_umur_id]) map[r.kelompok_umur_id] = { lk: 0, pr: 0 };
            map[r.kelompok_umur_id].lk += r.jml_lk || 0;
            map[r.kelompok_umur_id].pr += r.jml_pr || 0;
        });
        return kData.refKelompokUmur
            .map(ref => ({
                name: ref.rentang_umur,
                lk: -(map[ref.id]?.lk || 0),   // negative for left (LK) side
                pr: map[ref.id]?.pr || 0,
                lkAbs: map[ref.id]?.lk || 0,
            }))
            .filter(d => d.pr > 0 || d.lkAbs > 0)
            .reverse(); // oldest at top
    }, [kData.kelompokUmur, kData.refKelompokUmur, activePeriodeId, selectedKelurahan]);

    // Dokumen: aggregate (sum) per filter
    const dokumenData = useMemo(() => {
        const filterRow = (r: { kelurahan_id: string; periode_id: number }) => {
            const periodeOk = activePeriodeId === null || r.periode_id === activePeriodeId;
            const kelOk = !selectedKelurahan || r.kelurahan_id === selectedKelurahan;
            return periodeOk && kelOk;
        };
        const ktp = kData.dokumenKtp.filter(filterRow);
        const kia = kData.dokumenKia.filter(filterRow);
        const akta = kData.dokumenAkta.filter(filterRow);
        return {
            ktp: {
                wajib: ktp.reduce((s, r) => s + (r.wajib_ktp_total ?? (r.wajib_ktp_lk + r.wajib_ktp_pr)), 0),
                punya: ktp.reduce((s, r) => s + (r.punya_ktp_total ?? (r.punya_ktp_lk + r.punya_ktp_pr)), 0),
            },
            kia: {
                wajib: kia.reduce((s, r) => s + (r.wajib_kia_total ?? (r.wajib_kia_lk + r.wajib_kia_pr)), 0),
                punya: kia.reduce((s, r) => s + (r.punya_kia_total ?? (r.punya_kia_lk + r.punya_kia_pr)), 0),
            },
            akta: {
                wajib: akta.reduce((s, r) => s + (r.penduduk_0_18_total ?? (r.penduduk_0_18_lk + r.penduduk_0_18_pr)), 0),
                punya: akta.reduce((s, r) => s + (r.punya_akta_total ?? (r.punya_akta_lk + r.punya_akta_pr)), 0),
            },
            // Per-kelurahan for bar chart
            perKelurahan: !selectedKelurahan ? ktp.map(r => ({
                nama: (kelMap.get(r.kelurahan_id) || '?').substring(0, 12),
                ktp: ((r.punya_ktp_total ?? (r.punya_ktp_lk + r.punya_ktp_pr)) / Math.max(1, (r.wajib_ktp_total ?? (r.wajib_ktp_lk + r.wajib_ktp_pr)))) * 100,
                kia: (() => { const k = kia.find(x => x.kelurahan_id === r.kelurahan_id); return k ? ((k.punya_kia_total ?? (k.punya_kia_lk + k.punya_kia_pr)) / Math.max(1, (k.wajib_kia_total ?? (k.wajib_kia_lk + k.wajib_kia_pr)))) * 100 : 0; })(),
                akta: (() => { const a = akta.find(x => x.kelurahan_id === r.kelurahan_id); return a ? ((a.punya_akta_total ?? (a.punya_akta_lk + a.punya_akta_pr)) / Math.max(1, (a.penduduk_0_18_total ?? (a.penduduk_0_18_lk + a.penduduk_0_18_pr)))) * 100 : 0; })(),
            })).sort((a, b) => b.ktp - a.ktp) : [],
        };
    }, [kData.dokumenKtp, kData.dokumenKia, kData.dokumenAkta, activePeriodeId, selectedKelurahan, kelMap]);

    // Per-kelurahan summary bar chart
    const kelBarData = useMemo(() => {
        if (selectedKelurahan) return [];
        const rows = activePeriodeId !== null ? kData.summary.filter(r => r.periode_id === activePeriodeId) : kData.summary;
        return rows.map(r => ({
            nama: (kelMap.get(r.kelurahan_id) || '?').substring(0, 12),
            lk: r.jml_penduduk_lk || 0,
            pr: r.jml_penduduk_pr || 0,
            total: r.jml_penduduk_total || 0,
        })).sort((a, b) => b.total - a.total);
    }, [kData.summary, activePeriodeId, selectedKelurahan, kelMap]);

    type TabData = { key: string; label: string; data: { name: string; lk: number; pr: number; total: number }[]; color: string };
    const TABS: TabData[] = [
        { key: 'agama', label: '🕌 Agama', data: agamaData, color: '#8b5cf6' },
        { key: 'pendidikan', label: '🎓 Pendidikan', data: pendidikanData, color: '#3b82f6' },
        { key: 'pekerjaan', label: '💼 Pekerjaan', data: pekerjaanData, color: '#10b981' },
        { key: 'status_kawin', label: '💍 Status Kawin', data: statusKawinData, color: '#f43f5e' },
        { key: 'goldar', label: '🩸 Gol. Darah', data: goldarData, color: '#f97316' },
        { key: 'piramida', label: '📊 Piramida Umur', data: [], color: '#06b6d4' },
        { key: 'dokumen', label: '📄 Dokumen', data: [], color: '#84cc16' },
    ];

    const activeTabData = TABS.find(t => t.key === activeTab);

    return (
        <motion.section variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800">Data Kependudukan</h2>
                        <p className="text-sm text-slate-500">Demografi penduduk berdasarkan berbagai dimensi</p>
                    </div>
                </div>
                {/* Periode Selector */}
                {kData.periodes.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 uppercase">Periode:</span>
                        {kData.periodes.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPeriode(p.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activePeriodeId === p.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {p.tahun} Sem {p.semester}
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* KPI Cards */}
            <motion.div variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total Penduduk', value: totalPenduduk.toLocaleString('id-ID'), sub: 'jiwa', icon: Users, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
                    { label: 'Laki-laki', value: totalLk.toLocaleString('id-ID'), sub: `${totalPenduduk > 0 ? ((totalLk / totalPenduduk) * 100).toFixed(1) : 0}%`, icon: UserCheck, color: 'bg-cyan-50 text-cyan-600', border: 'border-cyan-100' },
                    { label: 'Perempuan', value: totalPr.toLocaleString('id-ID'), sub: `${totalPenduduk > 0 ? ((totalPr / totalPenduduk) * 100).toFixed(1) : 0}%`, icon: Baby, color: 'bg-rose-50 text-rose-600', border: 'border-rose-100' },
                    { label: 'Jumlah KK', value: totalKK.toLocaleString('id-ID'), sub: 'kepala keluarga', icon: HomeIcon, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
                    { label: 'Sex Ratio', value: sexRatio, sub: 'LK per 100 PR', icon: TrendingUp, color: 'bg-violet-50 text-violet-600', border: 'border-violet-100' },
                ].map((item) => (
                    <motion.div variants={scaleIn} key={item.label} className={`bg-white p-4 rounded-2xl border ${item.border} shadow-sm hover:shadow-md transition-all`}>
                        <div className={`inline-flex p-2 rounded-xl ${item.color} mb-3`}>
                            <item.icon className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider leading-tight h-8 md:h-auto">{item.label}</p>
                        <h4 className="text-lg md:text-xl font-extrabold text-slate-800 mt-1">{item.value}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Main Charts Row: Gender Bar + Gender Pie */}
            {!selectedKelurahan && kelBarData.length > 0 && (
                <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[350px]">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Penduduk per Kelurahan</h3>
                        <div className="h-64 sm:h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kelBarData} barGap={2} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="nama" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={8} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(val: number) => val.toLocaleString('id-ID') + ' jiwa'} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                                    <Bar dataKey="lk" name="Laki-laki" fill="#3b82f6" radius={[0, 0, 4, 4]} stackId="pop" maxBarSize={40} />
                                    <Bar dataKey="pr" name="Perempuan" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="pop" maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[350px]">
                        <h3 className="text-base font-bold text-slate-800 mb-2">Rasio Jenis Kelamin</h3>
                        <div className="flex items-center justify-center flex-1 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ name: 'Laki-laki', value: totalLk }, { name: 'Perempuan', value: totalPr }]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                        <Cell fill="#3b82f6" />
                                        <Cell fill="#f43f5e" />
                                    </Pie>
                                    <Tooltip formatter={(v: number) => v.toLocaleString('id-ID')} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 mt-4">
                            {[{ label: 'Laki-laki', val: totalLk, color: 'bg-blue-500' }, { label: 'Perempuan', val: totalPr, color: 'bg-rose-500' }].map(item => (
                                <div key={item.label} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                                        <span className="text-slate-600">{item.label}</span>
                                    </div>
                                    <span className="font-bold text-slate-800">{item.val.toLocaleString('id-ID')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Dimension Tabs */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Tab Nav */}
                <div className="grid grid-cols-2 sm:flex sm:flex-row border-b border-slate-100">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as 'agama' | 'pendidikan' | 'pekerjaan' | 'status_kawin' | 'goldar' | 'piramida' | 'dokumen')}
                            className={`px-4 py-3.5 text-xs font-bold transition-all border-b-2 text-center
                                sm:flex-shrink-0
                                ${activeTab === tab.key
                                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content: Demographic Dimensions */}
                {activeTab !== 'piramida' && activeTab !== 'dokumen' && activeTabData && (
                    <div className="p-6">
                        {activeTabData.data.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-slate-400">Tidak ada data untuk periode ini</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-3 h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={activeTabData.data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={120} />
                                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(val: number) => val.toLocaleString('id-ID') + ' jiwa'} />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                            <Bar dataKey="lk" name="Laki-laki" fill="#3b82f6" radius={[0, 4, 4, 0]} stackId="g" maxBarSize={24} />
                                            <Bar dataKey="pr" name="Perempuan" fill="#f43f5e" radius={[0, 4, 4, 0]} stackId="g" maxBarSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="flex justify-center">
                                        <PieChart width={180} height={180}>
                                            <Pie data={activeTabData.data.map(d => ({ name: d.name, value: d.total }))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                                                {activeTabData.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => v.toLocaleString('id-ID')} />
                                        </PieChart>
                                    </div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {activeTabData.data.map((d, i) => (
                                            <div key={d.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                    <span className="text-slate-600 truncate">{d.name}</span>
                                                </div>
                                                <span className="font-bold text-slate-800 ml-2 flex-shrink-0">{d.total.toLocaleString('id-ID')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content: Piramida Penduduk */}
                {activeTab === 'piramida' && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800">Piramida Penduduk</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Distribusi penduduk berdasarkan kelompok umur dan jenis kelamin</p>
                            </div>
                            <div className="flex gap-4 text-xs">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" /> Laki-laki</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-400" /> Perempuan</span>
                            </div>
                        </div>
                        {piramidaData.length === 0 ? (
                            <div className="h-80 flex items-center justify-center text-slate-400">Tidak ada data piramida untuk periode ini</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 h-[420px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={piramidaData} layout="vertical" stackOffset="sign" margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barCategoryGap="15%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                                                tickFormatter={(v) => { const abs = Math.abs(v); return abs >= 1000 ? `${(abs / 1000).toFixed(0)}rb` : String(abs); }} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={95} />
                                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                                formatter={(val: number, name: string) => [Math.abs(val).toLocaleString('id-ID') + ' jiwa', name === 'lk' ? 'Laki-laki' : 'Perempuan']} />
                                            <Bar dataKey="lk" name="Laki-laki" fill="#3b82f6" radius={[0, 0, 0, 0]} stackId="pyramid" maxBarSize={20} />
                                            <Bar dataKey="pr" name="Perempuan" fill="#fb7185" radius={[0, 0, 0, 0]} stackId="pyramid" maxBarSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Age Group Table */}
                                <div className="lg:col-span-1">
                                    <div className="bg-slate-50 rounded-xl overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-100 text-slate-500 font-bold">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Kelompok</th>
                                                    <th className="px-2 py-2 text-right text-blue-600">LK</th>
                                                    <th className="px-2 py-2 text-right text-rose-500">PR</th>
                                                    <th className="px-2 py-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {[...piramidaData].reverse().map((d) => (
                                                    <tr key={d.name} className="hover:bg-white transition-colors">
                                                        <td className="px-3 py-1.5 font-medium text-slate-700">{d.name}</td>
                                                        <td className="px-2 py-1.5 text-right text-blue-600">{d.lkAbs.toLocaleString('id-ID')}</td>
                                                        <td className="px-2 py-1.5 text-right text-rose-500">{d.pr.toLocaleString('id-ID')}</td>
                                                        <td className="px-2 py-1.5 text-right font-bold text-slate-700">{(d.lkAbs + d.pr).toLocaleString('id-ID')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content: Dokumen Kependudukan */}
                {activeTab === 'dokumen' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">Cakupan Dokumen Kependudukan</h3>
                            <p className="text-xs text-slate-400">KTP-el, Kartu Identitas Anak (KIA), dan Akta Kelahiran</p>
                        </div>
                        {/* Coverage Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                {
                                    label: 'KTP Elektronik',
                                    emoji: '🪪',
                                    wajib: dokumenData.ktp.wajib,
                                    punya: dokumenData.ktp.punya,
                                    desc: 'Wajib KTP (≥17 tahun)',
                                    color: 'bg-blue-500',
                                    bg: 'bg-blue-50 border-blue-100',
                                },
                                {
                                    label: 'Kartu Identitas Anak',
                                    emoji: '👶',
                                    wajib: dokumenData.kia.wajib,
                                    punya: dokumenData.kia.punya,
                                    desc: 'Wajib KIA (< 17 tahun)',
                                    color: 'bg-violet-500',
                                    bg: 'bg-violet-50 border-violet-100',
                                },
                                {
                                    label: 'Akta Kelahiran',
                                    emoji: '📋',
                                    wajib: dokumenData.akta.wajib,
                                    punya: dokumenData.akta.punya,
                                    desc: 'Penduduk 0–18 tahun',
                                    color: 'bg-emerald-500',
                                    bg: 'bg-emerald-50 border-emerald-100',
                                },
                            ].map((doc) => {
                                const pct = doc.wajib > 0 ? Math.min(100, (doc.punya / doc.wajib) * 100) : 0;
                                return (
                                    <div key={doc.label} className={`p-5 rounded-2xl border ${doc.bg} relative overflow-hidden`}>
                                        <div className="absolute top-3 right-4 text-4xl opacity-20">{doc.emoji}</div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{doc.label}</p>
                                        <div className="flex items-end gap-1 mb-1">
                                            <span className="text-3xl font-extrabold text-slate-800">{pct.toFixed(1)}%</span>
                                            <span className="text-slate-400 text-xs mb-1">cakupan</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3">{doc.punya.toLocaleString('id-ID')} dari {doc.wajib.toLocaleString('id-ID')} {doc.desc}</p>
                                        <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                                            <div className={`h-full ${doc.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Coverage % per Kelurahan Bar Chart */}
                        {dokumenData.perKelurahan.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h4 className="text-sm font-bold text-slate-700 mb-4">Cakupan per Kelurahan (%)</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dokumenData.perKelurahan} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={2}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="nama" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} dy={8} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                                formatter={(val: number) => `${val.toFixed(1)}%`} />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                            <Bar dataKey="ktp" name="KTP-el" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                            <Bar dataKey="kia" name="KIA" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                            <Bar dataKey="akta" name="Akta" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Summary Table per Kelurahan */}
            {!selectedKelurahan && filteredSummary.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100">
                        <h3 className="text-base font-bold text-slate-800">Rekapitulasi Penduduk per Kelurahan</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                                <tr>
                                    <th className="px-5 py-3 text-left">#</th>
                                    <th className="px-5 py-3 text-left">Kelurahan</th>
                                    <th className="px-5 py-3 text-right">Laki-laki</th>
                                    <th className="px-5 py-3 text-right">Perempuan</th>
                                    <th className="px-5 py-3 text-right">Total</th>
                                    <th className="px-5 py-3 text-right">KK</th>
                                    <th className="px-5 py-3 text-right">Sex Ratio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSummary.sort((a, b) => (b.jml_penduduk_total || 0) - (a.jml_penduduk_total || 0)).map((row, i) => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3 text-slate-400 font-medium">{i + 1}</td>
                                        <td className="px-5 py-3 font-semibold text-slate-800">
                                            <span className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                                {kelMap.get(row.kelurahan_id) || '-'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-blue-600">{(row.jml_penduduk_lk || 0).toLocaleString('id-ID')}</td>
                                        <td className="px-5 py-3 text-right text-rose-600">{(row.jml_penduduk_pr || 0).toLocaleString('id-ID')}</td>
                                        <td className="px-5 py-3 text-right font-bold text-slate-800">{(row.jml_penduduk_total || 0).toLocaleString('id-ID')}</td>
                                        <td className="px-5 py-3 text-right text-slate-600">{(row.jml_kk_total || 0).toLocaleString('id-ID')}</td>
                                        <td className="px-5 py-3 text-right text-slate-600">
                                            {row.jml_penduduk_pr > 0 ? ((row.jml_penduduk_lk / row.jml_penduduk_pr) * 100).toFixed(1) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </motion.section>
    );
}



/* ============================================================
   Section 3: Lembaga Kemasyarakatan
============================================================ */
function LembagaSection({ data, kelurahans, selectedKelurahan }: { data: LembagaRow[]; kelurahans: Kelurahan[]; selectedKelurahan: string | null }) {
    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach((k) => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    const [filterJenis, setFilterJenis] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // 1. Filter Data based on Filters (Kelurahan + Jenis + Search)
    const filteredData = useMemo(() => {
        let result = data;
        // Kelurahan Filter
        if (selectedKelurahan) {
            result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        }
        // Jenis Filter
        if (filterJenis) result = result.filter((d) => d.jenis === filterJenis);
        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((d) =>
                d.nama.toLowerCase().includes(q) ||
                (d.ketua || "").toLowerCase().includes(q) ||
                (kelMap.get(d.kelurahan_id) || "").toLowerCase().includes(q)
            );
        }
        return result;
    }, [data, selectedKelurahan, filterJenis, searchQuery, kelMap]);


    // 2. Compute Stats based on filtered data (or base data for charts)
    // For charts, we want to respect the Kelurahan filter but maybe ignoring the Jenis filter
    // unless we want charts to update with filter types too. Usually charts show distribution of the current view context.
    const chartBaseData = useMemo(() => {
        let result = data;
        if (selectedKelurahan) result = result.filter(d => d.kelurahan_id === selectedKelurahan);
        return result;
    }, [data, selectedKelurahan]);

    // Group by jenis for pie chart
    const groupedByJenis = useMemo(() => {
        const map: Record<string, number> = {};
        chartBaseData.forEach((d) => {
            map[d.jenis] = (map[d.jenis] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [chartBaseData]);

    const pieData = groupedByJenis.map(([name, value]) => ({ name, value }));

    // Group by kelurahan for bar chart (Only useful if ALL selected)
    const kelBarData = useMemo(() => {
        if (selectedKelurahan) return []; // No bar chart per kelurahan if specific one selected
        const map: Record<string, number> = {};
        chartBaseData.forEach((d) => {
            const kn = kelMap.get(d.kelurahan_id) || "Lainnya";
            map[kn] = (map[kn] || 0) + 1;
        });
        return Object.entries(map).map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
    }, [chartBaseData, kelMap, selectedKelurahan]);

    const totalAktif = filteredData.filter((d) => d.status === "aktif").length;

    return (
        <motion.section variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-amber-50">
                    <Building2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-slate-800">Lembaga Kemasyarakatan</h2>
                    <p className="text-sm text-slate-500">
                        {selectedKelurahan ? "Daftar Lembaga di Kelurahan" : "RT, RW, PKK, Karang Taruna, dan lembaga lainnya"}
                    </p>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={scaleIn} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider h-8 md:h-auto leading-tight">Total Lembaga</p>
                    <h4 className="text-xl md:text-2xl font-extrabold text-slate-800 mt-1">{chartBaseData.length}</h4>
                </motion.div>
                <motion.div variants={scaleIn} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider h-8 md:h-auto leading-tight">Aktif</p>
                    <h4 className="text-xl md:text-2xl font-extrabold text-emerald-600 mt-1">{totalAktif}</h4>
                </motion.div>
                <motion.div variants={scaleIn} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider h-8 md:h-auto leading-tight">Jenis Lembaga</p>
                    <h4 className="text-xl md:text-2xl font-extrabold text-slate-800 mt-1">{groupedByJenis.length}</h4>
                </motion.div>
                <motion.div variants={scaleIn} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[11px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider h-8 md:h-auto leading-tight">
                        {selectedKelurahan ? "Rata-rata Anggota" : "Rata-rata/Kel"}
                    </p>
                    <h4 className="text-xl md:text-2xl font-extrabold text-slate-800 mt-1">
                        {selectedKelurahan
                            ? Math.round(chartBaseData.reduce((s, d) => s + (d.jumlah_anggota || 0), 0) / (chartBaseData.length || 1))
                            : (kelurahans.length > 0 ? Math.round(chartBaseData.length / kelurahans.length) : 0)
                        }
                    </h4>
                </motion.div>
            </motion.div>

            {/* Jenis Filter Icons */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Filter Jenis Lembaga</h4>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilterJenis(null)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${filterJenis === null ? "bg-amber-100 text-amber-800 border-2 border-amber-300" : "bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100"
                            }`}
                    >
                        🗺️ Semua ({chartBaseData.length})
                    </button>
                    {groupedByJenis.map(([jenis, count]) => (
                        <button
                            key={jenis}
                            onClick={() => setFilterJenis(filterJenis === jenis ? null : jenis)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${filterJenis === jenis ? "bg-amber-100 text-amber-800 border-2 border-amber-300" : "bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100"
                                }`}
                        >
                            {LEMBAGA_ICON_MAP[jenis] || "📋"} {jenis} ({count})
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Charts Row */}
            <motion.div variants={fadeUp} className={`grid grid-cols-1 ${!selectedKelurahan ? "lg:grid-cols-2" : ""} gap-6`}>
                {/* Pie Chart: Always show */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-4">Komposisi Jenis Lembaga</h3>
                    <div className="h-72 relative">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(val: number) => `${val} lembaga`} />
                                    <Legend iconType="circle" layout="vertical" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">Tidak ada data</div>
                        )}
                    </div>
                </div>

                {/* Bar Chart per Kelurahan: Only if ALL selected */}
                {!selectedKelurahan && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Lembaga per Kelurahan</h3>
                        <div className="h-72">
                            {kelBarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={kelBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="nama" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                                        <Bar dataKey="jumlah" name="Jumlah" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                            {kelBarData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400">Tidak ada data</div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Data Cards Grid */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-800">Daftar Lembaga ({filteredData.length})</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari lembaga..."
                            className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm w-full md:w-56"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredData.slice(0, 30).map((row) => (
                        <div key={row.id} className="p-4 rounded-xl border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all bg-white">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{LEMBAGA_ICON_MAP[row.jenis] || "📋"}</span>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm truncate">{row.nama}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">{row.jenis}</span>
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === "aktif" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            {row.status || "aktif"}
                                        </span>
                                    </div>
                                    {row.ketua && <p className="text-xs text-slate-500 mt-1.5">Ketua: <b className="text-slate-700">{row.ketua}</b></p>}
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {kelMap.get(row.kelurahan_id) || "-"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredData.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium">Tidak ada lembaga ditemukan</p>
                    </div>
                )}
            </motion.div>
        </motion.section>
    );
}

/* ============================================================
   Main Page
============================================================ */
function PemerintahanContent() {
    const { tenant, kelurahans, isLoading } = useTenant();
    const toTenantPath = useTenantPath();
    const [kData, setKData] = useState<KependudukanData>({
        periodes: [], summary: [],
        agama: [], refAgama: [],
        goldar: [], refGoldar: [],
        pendidikan: [], refPendidikan: [],
        pekerjaan: [], refPekerjaan: [],
        statusKawin: [], refStatusKawin: [],
        kelompokUmur: [], refKelompokUmur: [],
        umurTunggal: [],
        dokumenKtp: [], dokumenKia: [], dokumenAkta: [],
    });
    const [lembagaData, setLembagaData] = useState<LembagaRow[]>([]);
    const [profiles, setProfiles] = useState<ProfileRow[]>([]);
    const [organisasi, setOrganisasi] = useState<OrganisasiRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<"profil" | "kependudukan" | "lembaga">("profil");

    // Filtering State — initialize from URL query param if present
    const searchParams = useSearchParams();
    const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(
        searchParams.get("kelurahan") || null
    );

    const fetchData = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);

        try {
            const response = await fetch(`/api/tenants/${tenant.slug}/data/pemerintahan`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok || result.error || !result.data) {
                throw new Error(result.error?.message ?? "Gagal memuat data pemerintahan.");
            }

            setKData(result.data.kData as KependudukanData);
            setLembagaData((result.data.lembaga as LembagaRow[]) || []);
            setProfiles((result.data.profiles as ProfileRow[]) || []);
            setOrganisasi((result.data.organisasi as OrganisasiRow[]) || []);
        } catch (err) {
            console.error('Error fetching pemerintahan data:', err);
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sections = [
        { key: "profil" as const, label: "Profil Wilayah", icon: Landmark, color: "indigo" },
        { key: "kependudukan" as const, label: "Kependudukan", icon: Users, color: "blue" },
        { key: "lembaga" as const, label: "Lembaga", icon: Building2, color: "amber" },
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
                                <Landmark className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                    Modul Data
                                </motion.div>
                                <motion.h1 variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="text-3xl md:text-5xl font-extrabold leading-tight">Pemerintahan</motion.h1>
                                <motion.p variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="mt-2 text-base md:text-lg text-white/70 max-w-2xl leading-relaxed">
                                    Data profil kecamatan, demografi kependudukan, dan lembaga kemasyarakatan.
                                </motion.p>
                            </div>
                        </div>

                        {/* Filter Dropdown */}
                        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }} className="w-full md:w-72 relative z-20">
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
                        </motion.div>
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
                            amber: "bg-amber-50 text-amber-700 border-amber-200",
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
                        <p className="text-slate-500 font-medium">Memuat data pemerintahan...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeSection === "profil" && (
                                <ProfilSection tenant={tenant} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} profiles={profiles} organisasi={organisasi} />
                            )}
                            {activeSection === "kependudukan" && (
                                <KependudukanSection kData={kData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                            )}
                            {activeSection === "lembaga" && (
                                <LembagaSection data={lembagaData} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}

export default function PemerintahanPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        }>
            <PemerintahanContent />
        </Suspense>
    );
}
