"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import {
    BarChart3, MapPin, Newspaper, Shield, ChevronDown, HelpCircle,
    Landmark, Heart, GraduationCap, Hammer, HandHeart, ShieldCheck, TrendingUp, LayoutGrid,
    Car, Home, Users, Menu, X
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

const LAYANAN_ITEMS = [

    {
        label: "PBB",
        href: "/layanan/pbb",
        icon: Home,
        desc: "Pajak Bumi dan Bangunan",
        color: "from-emerald-500 to-teal-600",
    },

];

export function Navbar() {
    const toTenantPath = useTenantPath();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [topikOpen, setTopikOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [layananOpen, setLayananOpen] = useState(false);
    const dropdownLayananRef = useRef<HTMLDivElement>(null);
    const timeoutLayananRef = useRef<NodeJS.Timeout | null>(null);

    const handleEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setTopikOpen(true);
        setLayananOpen(false); // Close other menu
    };
    const handleLeave = () => {
        timeoutRef.current = setTimeout(() => setTopikOpen(false), 200);
    };

    const handleLayananEnter = () => {
        if (timeoutLayananRef.current) clearTimeout(timeoutLayananRef.current);
        setLayananOpen(true);
        setTopikOpen(false); // Close other menu
    };
    const handleLayananLeave = () => {
        timeoutLayananRef.current = setTimeout(() => setLayananOpen(false), 200);
    };

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setTopikOpen(false);
            }
            if (dropdownLayananRef.current && !dropdownLayananRef.current.contains(e.target as Node)) {
                setLayananOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <nav className="relative z-50 flex items-center justify-between px-8 md:px-12 py-5 w-full">
            <div className="flex items-center gap-3">
                <Link href={toTenantPath("/")} className="flex items-center gap-2.5 group">
                    <img
                        src="/favicon-32x32.png"
                        alt="Logo Pemkot Bogor"
                        className="w-8 h-9 object-contain group-hover:scale-105 transition-transform drop-shadow-lg"
                    />
                    <div>
                        <h4 className="text-sm font-semibold tracking-tight leading-tight text-white group-hover:text-cyan-100 transition-colors">
                            SIMDATA KECAMATAN
                        </h4>
                        <p className="text-[8px] font-medium text-cyan-200 uppercase tracking-[0.15em] drop-shadow-sm">
                            KOTA BOGOR
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
                                            href={toTenantPath(item.href)}
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

                {/* ─── Layanan Data Mega Menu ─── */}
                <div
                    ref={dropdownLayananRef}
                    className="relative hidden sm:block"
                    onMouseEnter={handleLayananEnter}
                    onMouseLeave={handleLayananLeave}
                >
                    <button
                        onClick={() => {
                            setLayananOpen(o => !o);
                            setTopikOpen(false);
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all border ${layananOpen
                            ? "text-white bg-white/15 border-white/20"
                            : "text-slate-200 hover:text-white hover:bg-white/10 border-transparent hover:border-white/10"
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Layanan Data
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${layananOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Mega Menu Dropdown */}
                    <div
                        className={`absolute right-0 top-full mt-3 w-[520px] rounded-2xl overflow-hidden transition-all duration-200 origin-top-right ${layananOpen
                            ? "opacity-100 scale-100 pointer-events-auto"
                            : "opacity-0 scale-95 pointer-events-none"
                            }`}
                        style={{ zIndex: 50 }}
                    >
                        {/* Glassy backdrop */}
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-2">
                            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Layanan Eksternal</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md">{LAYANAN_ITEMS.length} Layanan</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 p-1.5">
                                {LAYANAN_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const isExternal = item.href.startsWith("http");
                                    const Component = isExternal ? "a" : Link;
                                    const extraProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

                                    return (
                                        <Component
                                            key={item.href}
                                            href={isExternal ? item.href : toTenantPath(item.href)}
                                            {...extraProps}
                                            onClick={() => setLayananOpen(false)}
                                            className="group flex items-start gap-3 p-3.5 rounded-xl hover:bg-white/8 transition-all"
                                        >
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white group-hover:text-emerald-200 transition-colors leading-tight">
                                                    {item.label}
                                                </p>
                                                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </Component>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>



                {/* <Link
                    href="/peta"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-slate-200 hover:text-white rounded-lg hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                >
                    <MapPin className="w-4 h-4" /> Peta
                </Link> */}
                {/* <Link
                    href="/berita"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-slate-200 hover:text-white rounded-lg hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                >
                    <Newspaper className="w-4 h-4" /> Berita
                </Link> */}
                <Link
                    href={toTenantPath("/faq")}
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm text-slate-200 hover:text-white rounded-lg hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                >
                    <HelpCircle className="w-4 h-4" /> FAQ
                </Link>
                <Link
                    href={toTenantPath("/login")}
                    className="hidden sm:flex px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 items-center gap-2"
                >
                    <Shield className="w-4 h-4" />
                    Masuk Panel
                </Link>

                {/* Mobile Hamburger Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="sm:hidden p-2 text-slate-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-slate-900/95 backdrop-blur-xl border-b border-white/10 sm:hidden flex flex-col p-4 gap-6 z-50 max-h-[80vh] overflow-y-auto shadow-2xl">
                    {/* Topik Section */}
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-2">Topik Modul</div>
                        <div className="grid grid-cols-1 gap-2">
                            {TOPIK_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={toTenantPath(item.href)}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                                        <item.icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="font-semibold text-sm text-slate-200">{item.label}</div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Layanan Data Section */}
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-2">Layanan Data</div>
                        <div className="grid grid-cols-1 gap-2">
                            {LAYANAN_ITEMS.map((item) => {
                                const isExternal = item.href.startsWith("http");
                                const Component = isExternal ? "a" : Link;
                                const extraProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

                                return (
                                    <Component
                                        key={item.href}
                                        href={isExternal ? item.href : toTenantPath(item.href)}
                                        {...extraProps}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                                            <item.icon className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="font-semibold text-sm text-slate-200">{item.label}</div>
                                    </Component>
                                );
                            })}
                        </div>
                    </div>

                    {/* FAQ & Login */}
                    <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
                        <Link
                            href={toTenantPath("/faq")}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-200 text-sm font-semibold"
                        >
                            <HelpCircle className="w-4 h-4" /> FAQ
                        </Link>
                        <Link
                            href={toTenantPath("/login")}
                            onClick={() => setMobileMenuOpen(false)}
                            className="mt-2 flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg"
                        >
                            <Shield className="w-4 h-4" />
                            Masuk Panel
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
