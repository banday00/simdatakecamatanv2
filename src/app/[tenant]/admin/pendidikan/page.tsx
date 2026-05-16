"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { School, GraduationCap, ChevronRight } from "lucide-react";

const subModules = [
    {
        title: "Sarana Pendidikan",
        description: "Data sekolah dari PAUD hingga SMA/SMK",
        href: "/admin/pendidikan/sarana",
        icon: School,
        color: "bg-indigo-100 text-indigo-700",
    },
    {
        title: "Partisipasi Pendidikan",
        description: "Angka partisipasi dan putus sekolah",
        href: "/admin/pendidikan/partisipasi",
        icon: GraduationCap,
        color: "bg-violet-100 text-violet-700",
    },
];

export default function PendidikanPage() {
    const toTenantPath = useTenantPath();

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Pendidikan"
                description="Modul data pendidikan"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pendidikan" },
                ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subModules.map((m) => (
                    <Link key={m.href} href={toTenantPath(m.href)} className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5">
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
