"use client";

import Link from "next/link";
import { BarChart3, MapPin, Newspaper, GraduationCap, Heart, Landmark, Shield, Hammer, Users, TrendingUp } from "lucide-react";

const navLinks = [
    { label: "BSW", href: "https://bsw.kotabogor.go.id/" },
    { label: "Open Data", href: "https://opendata.kotabogor.go.id/" },
    { label: "Satu Peta", href: "https://satupeta.kotabogor.go.id/" },
    { label: "Satu Data", href: "https://satudata.kotabogor.go.id/" },

];

const dataModules = [
    { label: "Pemerintahan", href: "/data/pemerintahan" },
    { label: "Kesehatan", href: "/data/kesehatan" },
    { label: "Pendidikan", href: "/data/pendidikan" },
    { label: "Infrastruktur", href: "/data/infrastruktur" },
    { label: "Sosial", href: "/data/sosial" },
    { label: "Ketentraman", href: "/data/ketentraman" },
];

import { useTenant } from "@/lib/tenant/context";

export function Footer() {
    const { tenant } = useTenant();

    return (
        <footer className="bg-slate-900 text-slate-400 relative">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <img
                                src={tenant?.logo || "https://svc-supabase.kotabogor.go.id/storage/v1/object/public/public/logo_pemkot.png"}
                                alt="Logo Pemkot"
                                className="w-9 h-10 object-contain drop-shadow-md"
                            />
                            <div>
                                <p className="font-bold text-white text-lg leading-tight">SIPADU KECAMATAN</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Sistem Pengelolaan Data Terpadu</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400">
                            Platform data terpadu untuk pelayanan publik, statistik wilayah, dan transparansi informasi.
                        </p>
                    </div>

                    <div>
                        <h5 className="font-bold text-slate-300 mb-4 uppercase text-xs tracking-widest">Hubungi Kami</h5>
                        <div className="space-y-3">
                            {tenant?.alamat && (
                                <div className="flex items-start gap-3 text-sm group">
                                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0 group-hover:text-blue-400 transition-colors" />
                                    <span className="text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors">{tenant.alamat}</span>
                                </div>
                            )}
                            {tenant?.telepon && (
                                <div className="flex items-center gap-3 text-sm group">
                                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                        <span className="text-slate-500 group-hover:text-amber-400 transition-colors">📞</span>
                                    </div>
                                    <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{tenant.telepon}</span>
                                </div>
                            )}
                            {tenant?.email && (
                                <div className="flex items-center gap-3 text-sm group">
                                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                        <span className="text-slate-500 group-hover:text-rose-400 transition-colors">✉️</span>
                                    </div>
                                    <a href={`mailto:${tenant.email}`} className="text-slate-400 hover:text-slate-200 transition-colors">{tenant.email}</a>
                                </div>
                            )}

                            {!tenant?.alamat && !tenant?.telepon && !tenant?.email && !tenant?.website && (
                                <p className="text-sm text-slate-500 italic">Informasi kontak belum ditambahkan.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h5 className="font-bold text-slate-300 mb-4 uppercase text-xs tracking-widest">Ekosistem Data Kota Bogor</h5>
                        <ul className="space-y-2.5">
                            {navLinks.map((l) => (
                                <li key={l.href}>
                                    <Link href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-bold text-slate-300 mb-4 uppercase text-xs tracking-widest">Modul Data</h5>
                        <ul className="space-y-2.5">
                            {dataModules.map((m) => (
                                <li key={m.href}>
                                    <Link href={m.href} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                        {m.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs">&copy; {new Date().getFullYear()} Pemerintah Kota Bogor. Hak cipta dilindungi.</p>

                </div>
            </div>
        </footer>
    );
}
