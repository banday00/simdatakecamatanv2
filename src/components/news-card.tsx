"use client";

import Link from "next/link";
import { Calendar, Newspaper, ArrowRight, User, Tag } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";

interface NewsItem {
    id: string;
    judul: string;
    slug: string;
    ringkasan?: string;
    gambar?: string;
    kategori?: string;
    published_at: string;
}

export default function NewsCard({ item }: { item: NewsItem }) {
    const toTenantPath = useTenantPath();

    return (
        <div className="group relative flex flex-col h-full bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden hover:-translate-y-1">
            {/* Image Container */}
            <div className="h-48 relative overflow-hidden bg-slate-100">
                {item.gambar ? (
                    <img
                        src={item.gambar}
                        alt={item.judul}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <Newspaper className="w-12 h-12 text-slate-300" />
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full bg-white/90 backdrop-blur-sm text-primary-600 shadow-sm">
                        {item.kategori || "Umum"}
                    </span>
                </div>

                {/* Overlay gradient */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
            </div>

            {/* Content */}
            <div className="flex-1 p-6 flex flex-col">
                {/* Meta */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-3">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <time dateTime={item.published_at}>
                            {format(new Date(item.published_at), "d MMMM yyyy", { locale: id })}
                        </time>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-800 mb-3 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                    <Link href={toTenantPath(`/berita/${item.slug}`)} className="focus:outline-none">
                        <span className="absolute inset-0" aria-hidden="true" />
                        {item.judul}
                    </Link>
                </h3>

                {/* Excerpt */}
                <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-1">
                    {item.ringkasan || "Tidak ada ringkasan berita."}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    <span className="text-xs font-medium text-primary-600 flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        Baca Selengkapnya
                        <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                </div>
            </div>
        </div>
    );
}
