"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { HandHeart, Accessibility, Home, Church, ChevronRight } from "lucide-react";

const subModules = [
    {
        title: "Bantuan Sosial",
        description: "Data penerima PKH, BPNT, dan bantuan lainnya",
        href: "/admin/sosial/bantuan",
        icon: HandHeart,
        color: "bg-rose-100 text-rose-700",
    },
    {
        title: "Disabilitas",
        description: "Data penyandang disabilitas",
        href: "/admin/sosial/disabilitas",
        icon: Accessibility,
        color: "bg-purple-100 text-purple-700",
    },
    {
        title: "Perumahan",
        description: "Data perumahan dan rumah tidak layak huni",
        href: "/admin/sosial/perumahan",
        icon: Home,
        color: "bg-amber-100 text-amber-700",
    },
    {
        title: "Keagamaan",
        description: "Data tempat ibadah dan kegiatan keagamaan",
        href: "/admin/sosial/keagamaan",
        icon: Church,
        color: "bg-teal-100 text-teal-700",
    },
];

export default function SosialPage() {
    const toTenantPath = useTenantPath();

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Sosial"
                description="Modul data sosial kemasyarakatan"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Sosial" },
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
