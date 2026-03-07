"use client";

import Link from "next/link";
import { BarChart3, MapPin, Newspaper, GraduationCap, Heart, Landmark, Shield, Hammer, Users, TrendingUp } from "lucide-react";

const navLinks = [
    { label: "Dashboard", href: "/" },
    { label: "Peta Interaktif", href: "/peta" },
    { label: "Berita", href: "/berita" },
    { label: "Panel Admin", href: "/login" },
];

const dataModules = [
    { label: "Pemerintahan", href: "/data/pemerintahan" },
    { label: "Kesehatan", href: "/data/kesehatan" },
    { label: "Pendidikan", href: "/data/pendidikan" },
    { label: "Infrastruktur", href: "/data/infrastruktur" },
    { label: "Sosial", href: "/data/sosial" },
    { label: "Ketentraman", href: "/data/ketentraman" },
];

export function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-400 relative">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid md:grid-cols-3 gap-10 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <img
                                src="https://svc-supabase.kotabogor.go.id/storage/v1/object/public/public/logo_pemkot.png"
                                alt="Logo Pemkot Bogor"
                                className="w-9 h-10 object-contain drop-shadow-md"
                            />
                            <div>
                                <p className="font-bold text-white text-lg">SIDAKOTA</p>
                                <p className="text-xs text-slate-500">Sistem Data Kecamatan & Kelurahan</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed">
                            Platform data terpadu untuk transparansi informasi kecamatan dan kelurahan se-Kota Bogor.
                        </p>
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-300 mb-4 uppercase text-xs tracking-widest">Navigasi</h5>
                        <ul className="space-y-2">
                            {navLinks.map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="text-sm hover:text-slate-200 transition-colors">{l.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-300 mb-4 uppercase text-xs tracking-widest">Modul Data</h5>
                        <ul className="space-y-2">
                            {dataModules.map((m) => (
                                <li key={m.href}>
                                    <Link href={m.href} className="text-sm hover:text-slate-200 transition-colors">{m.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs">&copy; {new Date().getFullYear()} Pemerintah Kota Bogor. Hak cipta dilindungi.</p>
                    <p className="text-xs">
                        Dibangun dengan <span className="text-blue-400">♥</span> untuk transparansi data publik
                    </p>
                </div>
            </div>
        </footer>
    );
}
