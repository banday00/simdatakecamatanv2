import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, MapPinned } from "lucide-react";
import { listActiveTenants } from "@/lib/tenant/server";

// Render at request time, not build time (DB not available during build)
export const dynamic = "force-dynamic";

export default async function TenantLandingPage() {
    const tenants = await listActiveTenants();

    return (
        <main className="relative h-screen w-screen overflow-hidden bg-white text-slate-900">
            <Image
                src="/img_landingpage.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />
            <div className="relative mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-4 py-6">
                <header className="mx-auto max-w-3xl text-center">
                    <div className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">
                        <Building2 className="h-3 w-3" />
                        SIMDATA Kecamatan
                    </div>
                    <h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900 md:text-4xl">
                        Sistem Informasi Data Kecamatan <br /> Kota Bogor
                    </h1>
                    <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-relaxed text-slate-700 md:text-base">
                        Data terhubung, layanan cepat, keputusan tepat.
                    </p>
                </header>

                <section className="mt-8 flex w-full justify-center">
                    <div className="grid w-full max-w-xl grid-cols-3 gap-3">
                        {tenants.map((tenant) => (
                            <Link
                                key={tenant.id}
                                href={`/${tenant.slug}`}
                                className="group flex flex-col items-center justify-center rounded-lg border border-slate-200/60 bg-white/80 px-2 py-3 text-center shadow-md shadow-slate-200/50 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-cyan-500/50 hover:bg-white hover:shadow-lg hover:shadow-cyan-100/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/50 bg-cyan-50 text-cyan-600 shadow-sm shadow-cyan-100/40 transition-transform group-hover:scale-105">
                                    <MapPinned className="h-4 w-4" />
                                </div>
                                <h2 className="mt-2 text-xs font-bold leading-snug text-slate-900 md:text-sm uppercase">
                                    {tenant.nama.replace(/^Kecamatan\s+/i, '')}
                                </h2>
                                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">
                                    Buka
                                    <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {tenants.length === 0 && (
                    <div className="mx-auto mt-8 rounded-lg border border-slate-200/60 bg-white/80 px-5 py-3 text-center text-sm text-slate-700 backdrop-blur-md shadow-sm">
                        Belum ada kecamatan aktif yang tersedia.
                    </div>
                )}
            </div>
        </main>
    );
}
