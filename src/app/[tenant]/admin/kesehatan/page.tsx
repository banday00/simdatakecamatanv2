"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { Hospital, Baby, Heart, Stethoscope, ChevronRight } from "lucide-react";

const subModules = [
    {
        title: "Fasilitas Kesehatan",
        description: "Rumah sakit, puskesmas, klinik, posyandu",
        href: "/admin/kesehatan/fasilitas",
        icon: Hospital,
        color: "bg-red-100 text-red-700",
    },
    {
        title: "Data Stunting",
        description: "Pemantauan stunting dan gizi balita",
        href: "/admin/kesehatan/stunting",
        icon: Baby,
        color: "bg-amber-100 text-amber-700",
    },
    {
        title: "Posyandu",
        description: "Data posyandu dan kegiatan pelayanan",
        href: "/admin/kesehatan/posyandu",
        icon: Heart,
        color: "bg-pink-100 text-pink-700",
    },
    {
        title: "Ibu & Anak",
        description: "Data kesehatan maternal dan layanan keluarga berencana",
        href: "/admin/kesehatan/maternal",
        icon: Heart,
        color: "bg-rose-100 text-rose-700",
    },
];

export default function KesehatanPage() {
    const toTenantPath = useTenantPath();

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Kesehatan"
                description="Modul data kesehatan masyarakat"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kesehatan" },
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
