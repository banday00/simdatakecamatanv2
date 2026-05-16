"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import NewsCard from "@/components/news-card";

export default function NewsDetail() {
    const { tenant } = useTenant();
    const toTenantPath = useTenantPath();
    const params = useParams();
    const slug = params?.slug as string;

    const [article, setArticle] = useState<any>(null);
    const [relatedNews, setRelatedNews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchArticle = useCallback(async () => {
        if (!tenant || !slug) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/berita/${encodeURIComponent(slug)}`);
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Artikel tidak ditemukan");
            }

            setArticle(json.data.article);
            setRelatedNews(json.data.related || []);
            setError(null);
        } catch (error) {
            console.error("Error fetching article:", error);
            setError("Artikel tidak ditemukan");
        }
        setIsLoading(false);
    }, [tenant, slug]);

    useEffect(() => {
        fetchArticle();
    }, [fetchArticle]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Artikel Tidak Ditemukan</h2>
                <p className="text-slate-500 mb-8">Maaf, artikel yang Anda cari tidak tersedia atau telah dihapus.</p>
                <Link href={toTenantPath("/berita")}>
                    <Button variant="outline">Kembali ke Berita</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col">
            {/* ─── Header ─── */}
            <header className="relative overflow-hidden text-white bg-digital-batik">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />

                <Navbar />

                <div className="relative z-10 px-6 pt-8 pb-32 max-w-7xl mx-auto">
                    <Link href={toTenantPath("/berita")} className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm font-medium mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Indeks Berita
                    </Link>
                    <div className="max-w-4xl">
                        <div className="flex items-center gap-3 mb-6 flex-wrap">
                            <span className="px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                                {article.kategori || "Umum"}
                            </span>
                            <span className="text-white/40 text-sm">•</span>
                            <div className="flex items-center gap-2 text-sm text-white/60">
                                <Calendar className="w-4 h-4" />
                                <time dateTime={article.published_at}>
                                    {format(new Date(article.published_at), "d MMMM yyyy", { locale: id })}
                                </time>
                            </div>
                            <span className="text-white/40 text-sm hidden sm:inline">•</span>
                            <div className="flex items-center gap-2 text-sm text-white/60 hidden sm:flex">
                                <User className="w-4 h-4" />
                                <span>Oleh: Admin {tenant?.nama}</span>
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 text-white">
                            {article.judul}
                        </h1>
                    </div>
                </div>
            </header>

            {/* ─── Main Content Area ─── */}
            <main className="px-6 max-w-7xl mx-auto -mt-20 relative z-20 pb-16 w-full flex-grow">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Left Column: Article Content */}
                    <div className="lg:col-span-3 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                        {/* Featured Image */}
                        {article.gambar && (
                            <div className="w-full aspect-[21/9] relative bg-slate-100">
                                <img
                                    src={article.gambar}
                                    alt={article.judul}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className="p-8 md:p-12">
                            {/* Content */}
                            <article className="prose prose-lg prose-slate max-w-none">
                                {/* Simple rendering of markdown-like content since we don't have react-markdown installed yet */}
                                {article.konten.split('\n').map((paragraph: string, idx: number) => {
                                    if (paragraph.startsWith('## ')) return <h2 key={idx} className="text-2xl font-bold mt-8 mb-4 text-slate-800">{paragraph.replace('## ', '')}</h2>;
                                    if (paragraph.startsWith('### ')) return <h3 key={idx} className="text-xl font-bold mt-6 mb-3 text-slate-800">{paragraph.replace('### ', '')}</h3>;
                                    if (paragraph.startsWith('- ')) return <li key={idx} className="ml-4 list-disc mb-2 text-slate-600">{paragraph.replace('- ', '')}</li>;
                                    if (paragraph.trim() === '') return <div key={idx} className="h-4"></div>;
                                    return <p key={idx} className="mb-4 text-slate-600 leading-relaxed">{paragraph}</p>;
                                })}
                            </article>

                            {/* Share Section */}
                            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm font-medium text-slate-500">
                                    Bagikan artikel ini:
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-10 w-10 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                                        <Facebook className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-10 w-10 text-slate-600 hover:text-sky-500 hover:border-sky-200 hover:bg-sky-50 transition-colors">
                                        <Twitter className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-10 w-10 text-slate-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                                        <Linkedin className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-10 w-10 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sidebar (Related News) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 sticky top-24">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                Berita Lainnya
                            </h3>

                            <div className="flex flex-col gap-5">
                                {relatedNews.length > 0 ? (
                                    relatedNews.map((newsItem) => (
                                        <Link href={toTenantPath(`/berita/${newsItem.slug}`)} key={newsItem.id} className="group block">
                                            <div className="flex gap-4 items-start">
                                                {newsItem.gambar ? (
                                                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                                                        <img src={newsItem.gambar} alt={newsItem.judul} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    </div>
                                                ) : (
                                                    <div className="w-20 h-20 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                        <FileText className="w-8 h-8 text-indigo-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug mb-1">
                                                        {newsItem.judul}
                                                    </h4>
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <time dateTime={newsItem.published_at}>
                                                            {format(new Date(newsItem.published_at), "d MMM yyyy", { locale: id })}
                                                        </time>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-sm text-slate-500 text-center py-4">Belum ada berita lainnya.</div>
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <Link href={toTenantPath("/berita")}>
                                    <Button variant="outline" className="w-full justify-center">Lihat Semua Berita</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
