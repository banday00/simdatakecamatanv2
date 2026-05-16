"use client";

import { useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Newspaper, FileCheck, FileClock, Archive, X, Loader2, Save, Send, AlertCircle, Edit3, AlignLeft, Pin, BookmarkX, Globe, Image as ImageIcon } from "lucide-react";

type BeritaRow = Record<string, unknown> & {
    id: string;
    judul: string;
    slug: string;
    kategori: string;
    ringkasan: string;
    konten: string;
    status: string;
    is_pinned: string;
    penulis: string;
    gambar: string | null;
    created_at: string;
};

const statusColors: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700 border-emerald-200",
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    archived: "bg-rose-100 text-rose-700 border-rose-200",
};

const statusLabels: Record<string, string> = {
    published: "Terbit",
    draft: "Draft",
    archived: "Arsip",
};

const columns: Column<BeritaRow>[] = [
    {
        key: "judul",
        label: "Judul Publikasi",
        sortable: true,
        render: (v, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1" title={String(v)}>{String(v)}</span>
                {row.is_pinned === "true" && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-1">
                        <Pin className="w-3 h-3" /> Berita Utama
                    </span>
                )}
            </div>
        )
    },
    {
        key: "kategori",
        label: "Kategori",
        sortable: true,
        render: (val) => (
            <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {String(val)}
            </span>
        ),
    },
    {
        key: "status",
        label: "Status Tampil",
        render: (val) => {
            const v = String(val);
            return (
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full border ${statusColors[v] || statusColors.draft}`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${v === 'published' ? 'bg-emerald-500' : v === 'draft' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    {statusLabels[v] || v}
                </span>
            );
        },
    },
    {
        key: "created_at",
        label: "Tgl. Publikasi",
        sortable: true,
        render: (val) =>
            <span className="text-gray-600 font-medium">
                {val ? new Date(String(val)).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
            </span>,
    },
];

export default function BeritaPage() {
    const { tenant } = useTenant();
    const [data, setData] = useState<BeritaRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<BeritaRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<BeritaRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/berita`);
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal memuat berita");
            }
            setData(json.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal memuat berita";
            setError(message);
            console.error("[BeritaAdmin] fetchData:", err);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const total = data.length;
    const published = data.filter((r) => r.status === "published").length;
    const draft = data.filter((r) => r.status === "draft").length;
    const archived = data.filter((r) => r.status === "archived").length;

    async function handleSubmit(formData: Record<string, unknown>) {
        if (!tenant?.slug) return;
        setIsSubmitting(true);
        try {
            let finalFotoUrl = formData.gambar as string | undefined | null;

            if (formData.gambar_file) {
                const file = formData.gambar_file as File;
                const fileExt = file.name.split(".").pop() || "jpg";
                const fileName = `berita_${Date.now()}.${fileExt.toLowerCase()}`;
                const uploadForm = new FormData();
                uploadForm.set("path", `${tenant.slug}/berita/${fileName}`);
                uploadForm.set("file", file);

                const uploadRes = await fetch("/api/uploads", {
                    method: "POST",
                    body: uploadForm,
                });
                const uploadJson = await uploadRes.json();
                if (!uploadRes.ok || uploadJson.error) {
                    throw new Error(uploadJson.error || "Upload gagal");
                }

                finalFotoUrl = uploadJson.data.publicUrl;
            }

            const payload = { ...formData };
            delete payload.gambar_file;
            delete payload.is_pinned;
            payload.gambar = finalFotoUrl || null;

            const url = editRow
                ? `/api/tenants/${tenant.slug}/admin/berita/${editRow.id}`
                : `/api/tenants/${tenant.slug}/admin/berita`;
            const res = await fetch(url, {
                method: editRow ? "PATCH" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menyimpan berita");
            }

            await fetchData();
            setModalOpen(false);
            setEditRow(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menyimpan berita.");
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/berita/${deleteRow.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menghapus berita");
            }
            await fetchData();
            setDeleteRow(null);
        }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menghapus berita."); }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Sistem Manajemen Berita"
                description="Panel kendali redaksi penerbitan berita, pengumuman, dan arsip artikel informasi kecamatan."
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Publikasi Berita" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Semua Tayangan" value={total.toLocaleString("id-ID")} icon={Newspaper} gradient="stat-gradient-soft-blue" />
                <StatCard label="Telah Mengudara" value={published.toLocaleString("id-ID")} icon={FileCheck} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Konsep Tertunda" value={draft.toLocaleString("id-ID")} icon={FileClock} gradient="stat-gradient-soft-amber" />
                <StatCard label="Masuk Bilik Arsip" value={archived.toLocaleString("id-ID")} icon={Archive} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable
                columns={columns} data={data} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Rakit Tulisan Baru" searchPlaceholder="Telusuri judul berita..."
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <BeritaFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
            />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete}
                title="Hapus Publikasi Permanen" message={`Apakah Anda yakin mencabut berita "${deleteRow?.judul}"? Jurnalisme ini akan hilang selamanya.`} isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   BeritaFormModal (Blue/Sky/Indigo Theme + Radio Cards)
   ═══════════════════════════════════════════════════════ */

function BeritaFormModal({
    open, onClose, onSubmit, editRow, isSubmitting,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: BeritaRow | null;
    isSubmitting: boolean;
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        judul: "", slug: "", kategori: "Berita", ringkasan: "", konten: "", status: "draft", is_pinned: "false", gambar: "", gambar_file: null
    });
    const [previewFoto, setPreviewFoto] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                judul: editRow.judul ?? "",
                slug: editRow.slug ?? "",
                kategori: editRow.kategori ?? "Berita",
                ringkasan: editRow.ringkasan ?? "",
                konten: editRow.konten ?? "",
                status: editRow.status ?? "draft",
                is_pinned: String(editRow.is_pinned ?? "false"),
                gambar: editRow.gambar ?? "",
                gambar_file: null,
            });
            setPreviewFoto(editRow.gambar || null);
        } else {
            setForm({
                judul: "", slug: "", kategori: "Berita", ringkasan: "", konten: "", status: "draft", is_pinned: "false", gambar: "", gambar_file: null
            });
            setPreviewFoto(null);
        }
    }, [open, editRow]);

    function set(field: string, value: string | boolean) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    // Auto-generate slug when title changes IF it's a new article and slug hasn't been manually touched much
    function handleJudulChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setForm(prev => {
            const updates: Record<string, unknown> = { judul: val };
            if (!isEdit && (!prev.slug || String(prev.slug).length < val.length)) {
                updates.slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }
            return { ...prev, ...updates };
        });
    }

    function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Ukuran ilustrasi maksimal 2MB");
                return;
            }
            setForm(prev => ({ ...prev, gambar_file: file }));
            setPreviewFoto(URL.createObjectURL(file));
        }
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    const kategoriOptions = ["Berita", "Pengumuman", "Agenda", "Artikel", "Press Release"];

    // Radio Cards for Status
    const statusCards = [
        { id: "draft", title: "Draft", desc: "Tunda / Edit", icon: Edit3, colorClass: "text-amber-600", bgActive: "bg-amber-50", borderActive: "border-amber-500", ringProps: "ring-amber-500" },
        { id: "published", title: "Terbit", desc: "Publik/Live", icon: Globe, colorClass: "text-emerald-600", bgActive: "bg-emerald-50", borderActive: "border-emerald-500", ringProps: "ring-emerald-500" },
        { id: "archived", title: "Arsip", desc: "Nonaktif / Lama", icon: BookmarkX, colorClass: "text-rose-600", bgActive: "bg-rose-50", borderActive: "border-rose-500", ringProps: "ring-rose-500" },
    ];

    // Radio Cards for Pin Status
    const pinCards = [
        { id: "false", title: "Reguler", desc: "Urutan waktu", icon: AlignLeft, colorClass: "text-slate-600", bgActive: "bg-slate-50", borderActive: "border-slate-500", ringProps: "ring-slate-500" },
        { id: "true", title: "Berita Utama", desc: "Sematkan di atas", icon: Pin, colorClass: "text-blue-600", bgActive: "bg-blue-50", borderActive: "border-blue-500", ringProps: "ring-blue-500" },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue/Sky/Indigo Theme */}
                <div className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Send className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Sunting Editorial Berita" : "Rakit Tulisan Jurnalisme Baru"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Kendalikan alur informasi, meta-data, dan materi liputan untuk konsumsi masyarakat luas.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Tutup">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/30">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                            {/* Left Column: Identitas Publikasi (Span 5/12) */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <AlertCircle className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tanda Pengenal Redaksi</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Judul Siaran Utama <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required type="text" placeholder="Masukkan susunan kata memikat..."
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.judul as string) || ""}
                                            onChange={handleJudulChange}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Penyelaras Link (Slug) URL
                                        </label>
                                        <input
                                            type="text" placeholder="judul-berita-utama-disini..."
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.slug as string) || ""}
                                            onChange={(e) => set("slug", e.target.value)}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1.5 ms-1">Tautan unik otomatis diselaraskan mengikuti kerangka judul.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Klasifikasi Laporan <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full px-4 py-2.5 hover:bg-slate-50 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-gray-900 appearance-none"
                                                value={(form.kategori as string) || "Berita"}
                                                onChange={(e) => set("kategori", e.target.value)}
                                            >
                                                {kategoriOptions.map(j => (
                                                    <option key={j} value={j}>{j}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Ilustrasi / Foto Sampul
                                        </label>
                                        <div className="flex items-center gap-4 mt-1">
                                            <div className="w-24 h-16 sm:w-28 sm:h-20 shrink-0 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                                                {previewFoto ? (
                                                    <>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={previewFoto.startsWith('http') || previewFoto.startsWith('/') || previewFoto.startsWith('blob:') || previewFoto.startsWith('data:') ? previewFoto : `${process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || "/uploads"}/gov-profiles/${previewFoto}`}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover relative z-10"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                                                        />
                                                        <ImageIcon className="w-6 h-6 text-slate-300 absolute z-0" />
                                                    </>
                                                ) : (
                                                    <ImageIcon className="w-6 h-6 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <label className="flex items-center justify-center w-full px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                                                    <span>Unggah Foto</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleFotoChange}
                                                    />
                                                </label>
                                                <p className="mt-2 text-[10px] text-gray-400 leading-tight">
                                                    Format: JPG, PNG, WEBP. Maks 2MB. Rasio optimal: 16:9
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Is Pinned - Interactive Radio Cards */}
                                    <div className="pt-2">
                                        <label className="block text-sm font-bold text-gray-900 mb-3">
                                            Arogansi Tampilan Muka
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {pinCards.map((card) => {
                                                const isActive = form.is_pinned === card.id;
                                                const Icon = card.icon;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={card.id}
                                                        onClick={() => set("is_pinned", card.id)}
                                                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive
                                                            ? `${card.borderActive} ${card.bgActive} shadow-sm ring-1 ${card.ringProps}`
                                                            : `border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 opacity-80`
                                                            }`}
                                                    >
                                                        {isActive && (
                                                            <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${card.colorClass} bg-white flex items-center justify-center`}>
                                                                <div className={`w-2 h-2 rounded-full ${card.colorClass.replace('text', 'bg')}`} />
                                                            </div>
                                                        )}
                                                        <Icon className={`w-5 h-5 mb-1.5 ${isActive ? card.colorClass : "text-slate-400"}`} />
                                                        <span className={`text-xs font-bold text-center block ${isActive ? card.colorClass : "text-slate-600"}`}>
                                                            {card.title}
                                                        </span>
                                                        <span className={`text-[10px] text-center mt-0.5 sm:block hidden ${isActive ? card.colorClass.replace('text-', 'text-opacity-80 text-') : "text-slate-400"}`}>
                                                            {card.desc}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Status Publikasi - Visual Radio Cards */}
                                    <div className="pt-2">
                                        <label className="block text-sm font-bold text-gray-900 mb-3">
                                            Saklar Penyiaran Berita <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                            {statusCards.map((card) => {
                                                const isActive = form.status === card.id;
                                                const Icon = card.icon;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={card.id}
                                                        onClick={() => set("status", card.id)}
                                                        className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border-2 transition-all ${isActive
                                                            ? `${card.borderActive} ${card.bgActive} shadow-sm ring-1 ${card.ringProps}`
                                                            : `border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 opacity-80`
                                                            }`}
                                                    >
                                                        {isActive && (
                                                            <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full ${card.colorClass} bg-white flex items-center justify-center`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${card.colorClass.replace('text', 'bg')}`} />
                                                            </div>
                                                        )}
                                                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 ${isActive ? card.colorClass : "text-slate-400"}`} />
                                                        <span className={`text-[11px] sm:text-xs font-bold text-center block ${isActive ? card.colorClass : "text-slate-600"}`}>
                                                            {card.title}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Substansi Artikel (Span 8/12) */}
                            <div className="lg:col-span-8 flex flex-col space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <AlignLeft className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Materi & Anatomi Artikel</span>
                                </div>

                                <div className="flex flex-col flex-1 space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Cuplikan Intisari Laporan (Ringkasan)
                                        </label>
                                        <textarea
                                            rows={2} placeholder="Sumbangsih kalimat pendek pemikat (lead) bagi warga yang sekilas membaca..."
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-300 resize-none font-medium text-gray-800"
                                            value={(form.ringkasan as string) || ""}
                                            onChange={(e) => set("ringkasan", e.target.value)}
                                        />
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex justify-between items-center">
                                            <span>Ulasan Komprehensif (Konten Berita)</span>
                                            <span className="text-xs font-normal text-gray-400">Dimungkinkan merangkai paragraf bersambung</span>
                                        </label>
                                        <textarea
                                            required rows={14} placeholder="Terapkan reportase mendalam 5W+1H agar masyarakat kecamatan tersibak cakrawalanya..."
                                            className="w-full flex-1 px-5 py-4 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-300 resize-y leading-relaxed text-gray-700"
                                            value={(form.konten as string) || ""}
                                            onChange={(e) => set("konten", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            Setiap kata memengaruhi wawasan sivitas kecamatan.<br />
                            <span className="text-red-400 font-bold">*</span> Wajib diredaksikan
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors"
                            >
                                Abaikan Modifikasi
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Sinkronisasi Perubahan Berita" : "Validasi Publikasi Naskah Baru"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
