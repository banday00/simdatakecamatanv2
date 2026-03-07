"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/context";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Search, Loader2, Newspaper, ChevronLeft, ChevronDown } from "lucide-react";
import NewsCard from "@/components/news-card";

function NewsContent() {
    const { tenant } = useTenant();
    const searchParams = useSearchParams();
    const [news, setNews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchNews = useCallback(async () => {
        if (!tenant) return;
        setIsLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("news_articles")
            .select("*")
            .eq("tenant_id", tenant.id)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .range((page - 1) * 9, page * 9 - 1);

        if (searchQuery) {
            query = query.ilike("judul", `%${searchQuery}%`);
        }

        if (categoryFilter !== "all") {
            query = query.eq("kategori", categoryFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching news:", error);
        } else {
            if (page === 1) {
                setNews(data || []);
            } else {
                setNews((prev) => [...prev, ...(data || [])]);
            }
            if ((data || []).length < 9) {
                setHasMore(false);
            }
        }
        setIsLoading(false);
    }, [tenant, page, searchQuery, categoryFilter]);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setHasMore(true);
        fetchNews();
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans">
            {/* ─── Header ─── */}
            <header className="relative overflow-hidden text-white bg-digital-batik">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />

                <Navbar />

                <div className="relative z-10 px-6 pt-8 pb-32 max-w-7xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm font-medium mb-6 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Beranda
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
                                <Newspaper className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Portal Informasi
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Berita & Informasi</h1>
                                <p className="mt-2 text-lg text-white/70 max-w-2xl leading-relaxed">
                                    Dapatkan informasi terbaru seputar kegiatan, pengumuman, dan program pemerintahan di wilayah {tenant?.nama}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ─── Search & Filter Bar ─── */}
            <main className="px-6 max-w-7xl mx-auto -mt-16 relative z-20 pb-16">
                <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-100 flex flex-col md:flex-row gap-4 mb-10">
                    <form onSubmit={handleSearch} className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Cari berita berdasarkan judul..."
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                    <div className="relative">
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                                setHasMore(true);
                            }}
                            className="w-full md:w-52 appearance-none bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-4 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
                        >
                            <option value="all">🗂️ Semua Kategori</option>
                            <option value="Pemerintahan">🏛️ Pemerintahan</option>
                            <option value="Pelayanan Publik">🤝 Pelayanan Publik</option>
                            <option value="Lingkungan">🌿 Lingkungan</option>
                            <option value="Kegiatan">🎯 Kegiatan</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* ─── News Grid ─── */}
                {isLoading && page === 1 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-96 rounded-2xl bg-white animate-pulse shadow-sm border border-slate-100" />
                        ))}
                    </div>
                ) : news.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {news.map((item) => (
                                <NewsCard key={item.id} item={item} />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="mt-16 flex justify-center">
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all disabled:opacity-50 shadow-sm"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Memuat...
                                        </>
                                    ) : (
                                        "Muat Lebih Banyak"
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-24">
                        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Newspaper className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Tidak ada berita ditemukan</h3>
                        <p className="text-slate-500 max-w-md mx-auto">Coba ubah kata kunci pencarian atau filter kategori untuk menemukan berita yang Anda cari.</p>
                    </div>
                )}
            </main>

            {/* ─── Footer ─── */}
            <Footer />
        </div>
    );
}

export default function NewsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium animate-pulse">Memuat halaman berita...</p>
            </div>
        }>
            <NewsContent />
        </Suspense>
    );
}
