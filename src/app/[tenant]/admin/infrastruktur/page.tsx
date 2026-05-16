"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { Hammer, Droplets, Trophy, ChevronRight } from "lucide-react";

const subModules = [
    {
        title: "Pembangunan",
        description: "Data proyek pembangunan infrastruktur",
        href: "/admin/infrastruktur/pembangunan",
        icon: Hammer,
        color: "bg-orange-100 text-orange-700",
    },
    {
        title: "Sanitasi",
        description: "Data sanitasi, air bersih, dan drainase",
        href: "/admin/infrastruktur/sanitasi",
        icon: Droplets,
        color: "bg-sky-100 text-sky-700",
    },
    {
        title: "Sarana Olahraga",
        description: "Data fasilitas olahraga dan rekreasi",
        href: "/admin/infrastruktur/olahraga",
        icon: Trophy,
        color: "bg-lime-100 text-lime-700",
    },
];

export default function InfrastrukturPage() {
    const toTenantPath = useTenantPath();

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Infrastruktur"
                description="Modul data infrastruktur dan pembangunan"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Infrastruktur" },
                ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subModules.map((m) => (
                    <Link key={m.href} href={toTenantPath(m.href)} className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
                        <div className={`inline-flex p-3 rounded-xl ${m.color} mb-4`}><m.icon className="w-6 h-6" /></div>
                        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">{m.title}<ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" /></h3>
                        <p className="text-sm text-gray-500">{m.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
