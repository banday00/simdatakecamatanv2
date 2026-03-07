"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Shield, AlertOctagon, Users, ChevronRight } from "lucide-react";

const subModules = [
    {
        title: "Kader Keamanan",
        description: "Data linmas, babinsa, dan kader keamanan",
        href: "/admin/ketentraman/kader",
        icon: Shield,
        color: "bg-slate-100 text-slate-700",
    },
    {
        title: "Zona Rawan Bencana",
        description: "Pemetaan zona rawan dan mitigasi bencana",
        href: "/admin/ketentraman/bencana",
        icon: AlertOctagon,
        color: "bg-red-100 text-red-700",
    },
    {
        title: "Kejadian & Insiden",
        description: "Data kejadian, laporan keamanan dan ketertiban",
        href: "/admin/ketentraman/insiden",
        icon: Users,
        color: "bg-orange-100 text-orange-700",
    },
];

export default function KetentremanPage() {
    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Ketentraman & Ketertiban"
                description="Modul data keamanan dan ketertiban umum"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Ketentraman" },
                ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subModules.map((m) => (
                    <Link key={m.href} href={m.href} className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
                        <div className={`inline-flex p-3 rounded-xl ${m.color} mb-4`}><m.icon className="w-6 h-6" /></div>
                        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">{m.title}<ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" /></h3>
                        <p className="text-sm text-gray-500">{m.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
