import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, MapPinned } from "lucide-react";
import { listActiveTenants } from "@/lib/tenant/server";

export default async function TenantLandingPage() {
    const tenants = await listActiveTenants();

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
            <Image
                src="/img_landingpage.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/65" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.72)_0%,rgba(2,6,23,0.36)_48%,rgba(2,6,23,0.82)_100%)]" />

            <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 md:px-10">
                <header className="mx-auto max-w-4xl text-center">
                    <div className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100/90">
                        <Building2 className="h-4 w-4" />
                        SIMDATA Kecamatan
                    </div>
                    <h1 className="mt-5 text-3xl font-extrabold leading-tight md:text-5xl">
                        Sistem Informasi Manajemen Data Kecamatan
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-100/90 md:text-lg">
                        Data terhubung, layanan cepat, keputusan tepat.
                    </p>
                </header>

                <section className="flex flex-1 items-center justify-center py-12">
                    <div className="grid w-full max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {tenants.map((tenant) => (
                            <Link
                                key={tenant.id}
                                href={`/${tenant.slug}`}
                                className="group flex min-h-36 flex-col items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-6 text-center shadow-2xl shadow-black/25 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-cyan-200/70 hover:bg-white/[0.18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
                            >
                                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-100/35 bg-cyan-100/15 text-cyan-50 shadow-lg shadow-cyan-950/40 transition-transform group-hover:scale-105">
                                    <MapPinned className="h-7 w-7" />
                                </div>
                                <h2 className="mt-4 text-base font-extrabold leading-snug text-white md:text-lg">
                                    {tenant.nama}
                                </h2>
                                <div className="mt-3 flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100/85">
                                    Buka
                                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {tenants.length === 0 && (
                    <div className="mx-auto mb-16 rounded-lg border border-white/15 bg-white/10 px-6 py-5 text-center text-slate-100 backdrop-blur-md">
                        Belum ada kecamatan aktif yang tersedia.
                    </div>
                )}
            </div>
        </main>
    );
}
