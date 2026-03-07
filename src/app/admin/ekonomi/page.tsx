"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Store, TrendingUp, Briefcase, ChevronRight } from "lucide-react";

const subModules = [
    {
        title: "Sarana Ekonomi",
        description: "Data pasar, toko, koperasi, bank",
        href: "/admin/ekonomi/sarana",
        icon: Store,
        color: "bg-emerald-100 text-emerald-700",
    },
    {
        title: "Potensi Usaha",
        description: "Data UMKM dan potensi ekonomi kelurahan",
        href: "/admin/ekonomi/potensi",
        icon: TrendingUp,
        color: "bg-teal-100 text-teal-700",
    },
    {
        title: "Sektor Usaha",
        description: "Distribusi sektor usaha masyarakat",
        href: "/admin/ekonomi/sektor",
        icon: Briefcase,
        color: "bg-cyan-100 text-cyan-700",
    },
];

export default function EkonomiPage() {
    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Ekonomi"
                description="Modul data ekonomi dan perdagangan"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Ekonomi" },
                ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subModules.map((m) => (
                    <Link key={m.href} href={m.href} className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
                        <div className={`inline-flex p-3 rounded-xl ${m.color} mb-4`}><m.icon className="w-6 h-6" /></div>
                        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                            {m.title}<ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className="text-sm text-gray-500">{m.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
