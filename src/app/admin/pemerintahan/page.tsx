"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Users, Building2, Landmark, ChevronRight, UserCog } from "lucide-react";

const subModules = [
    {
        title: "Profil Kelurahan",
        description: "Data profil dan informasi kelurahan",
        href: "/admin/pemerintahan/profil",
        icon: Landmark,
        color: "bg-blue-100 text-blue-700",
    },
    {
        title: "Kependudukan",
        description: "Data jumlah penduduk, demografi, dan kepadatan",
        href: "/admin/pemerintahan/kependudukan",
        icon: Users,
        color: "bg-emerald-100 text-emerald-700",
    },
    {
        title: "Lembaga Kemasyarakatan",
        description: "RT, RW, PKK, Karang Taruna, dan lembaga lainnya",
        href: "/admin/pemerintahan/lembaga",
        icon: Building2,
        color: "bg-amber-100 text-amber-700",
    },
    {
        title: "Organisasi Pemerintahan",
        description: "Data pejabat dan struktur organisasi kelurahan",
        href: "/admin/pemerintahan/organisasi",
        icon: UserCog,
        color: "bg-indigo-100 text-indigo-700",
    },
];

export default function PemerintahanPage() {
    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Pemerintahan"
                description="Modul data pemerintahan kelurahan"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pemerintahan" },
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subModules.map((m) => (
                    <Link
                        key={m.href}
                        href={m.href}
                        className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5"
                    >
                        <div className={`inline-flex p-3 rounded-xl ${m.color} mb-4`}>
                            <m.icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                            {m.title}
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className="text-sm text-gray-500">{m.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
