"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
    BarChart3, MapPin, Newspaper, Shield, ChevronDown,
    Landmark, Heart, GraduationCap, Hammer, HandHeart, ShieldCheck, TrendingUp, LayoutGrid,
} from "lucide-react";

const TOPIK_ITEMS = [
    {
        label: "Pemerintahan",
        href: "/data/pemerintahan",
        icon: Landmark,
        desc: "Profil kecamatan, demografi & lembaga",
        color: "from-indigo-500 to-blue-600",
    },
    {
        label: "Kesehatan",
        href: "/data/kesehatan",
        icon: Heart,
        desc: "Faskes, stunting, posyandu & maternal",
        color: "from-rose-500 to-pink-600",
    },
    {
        label: "Pendidikan",
        href: "/data/pendidikan",
        icon: GraduationCap,
        desc: "Satuan pendidikan & tenaga pengajar",
        color: "from-amber-500 to-orange-600",
    },
    {
        label: "Infrastruktur",
        href: "/data/infrastruktur",
        icon: Hammer,
        desc: "Fasilitas umum & sarana prasarana",
        color: "from-emerald-500 to-teal-600",
    },
    {
        label: "Sosial",
        href: "/data/sosial",
        icon: HandHeart,
        desc: "PMKS, disabilitas & tempat ibadah",
        color: "from-purple-500 to-violet-600",
    },
    {
        label: "Ketentraman",
        href: "/data/ketentraman",
        icon: ShieldCheck,
        desc: "Insiden, zona rawan & kader keamanan",
        color: "from-sky-500 to-cyan-600",
    },
    {
        label: "Ekonomi",
        href: "/data/ekonomi",
        icon: TrendingUp,
        desc: "Pasar, komoditas & harga pangan",
        color: "from-lime-500 to-green-600",
    },
];

export function Navbar() {
    const [topikOpen, setTopikOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setTopikOpen(true);
    };
    const handleLeave = () => {
        timeoutRef.current = setTimeout(() => setTopikOpen(false), 200);
    };

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setTopikOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-3 group">
                    <img
                        src="https://svc-supabase.kotabogor.go.id/storage/v1/object/public/public/logo_pemkot.png"
                        alt="Logo Pemkot Bogor"
                        className="w-10 h-11 object-contain group-hover:scale-105 transition-transform drop-shadow-lg"
                    />
                    <div>
                        <h1 className="text-lg font-extrabold tracking-tight leading-tight text-white group-hover:text-cyan-100 transition-colors">
                            SIDAKOTA
                        </h1>
                        <p className="text-[10px] font-medium text-cyan-200 uppercase tracking-[0.2em] drop-shadow-sm">
                            Smart City Dashboard
                        </p>
                    </div>
                </Link>
            </div>
            <div className="flex items-center gap-2">
                {/* ─── Topik Mega Menu ─── */}
                <div
                    ref={dropdownRef}
                    className="relative hidden sm:block"
                    onMouseEnter={handleEnter}
                    onMouseLeave={handleLeave}
                >
                    <button
                        onClick={() => setTopikOpen(o => !o)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all border ${topikOpen
                            ? "text-white bg-white/15 border-white/20"
                            : "text-slate-200 hover:text-white hover:bg-white/10 border-transparent hover:border-white/10"
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Topik
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${topikOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Mega Menu Dropdown */}
                    <div
                        className={`absolute right-0 top-full mt-3 w-[520px] rounded-2xl overflow-hidden transition-all duration-200 origin-top-right ${topikOpen
                            ? "opacity-100 scale-100 pointer-events-auto"
                            : "opacity-0 scale-95 pointer-events-none"
                            }`}
                        style={{ zIndex: 50 }}
                    >
                        {/* Glassy backdrop */}
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-2">
                            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Modul Data</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-md">{TOPIK_ITEMS.length} Kategori</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 p-1.5">
                                {TOPIK_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setTopikOpen(false)}
                                            className="group flex items-start gap-3 p-3.5 rounded-xl hover:bg-white/8 transition-all"
                                        >
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors leading-tight">
                                                    {item.label}
                                                </p>
                                                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <Link
                    href="/peta"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-slate-200 hover:text-white rounded-lg hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                >
                    <MapPin className="w-4 h-4" /> Peta
                </Link>
                <Link
                    href="/berita"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-slate-200 hover:text-white rounded-lg hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                >
                    <Newspaper className="w-4 h-4" /> Berita
                </Link>
                <Link
                    href="/login"
                    className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 flex items-center gap-2"
                >
                    <Shield className="w-4 h-4" />
                    Masuk Panel
                </Link>
            </div>
        </nav>
    );
}
