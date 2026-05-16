"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAdminKetentramanResource } from "../use-admin-ketentraman-resource";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { AlertOctagon, TriangleAlert, MapPin, Users, X, Loader2, Save, CloudLightning, Info, BoxSelect, ActivitySquare } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string;
    jenis_bencana: string; tingkat_risiko: string; jumlah_kk_terdampak: number;
    jalur_evakuasi: string; posko_bencana: string; tahun_data: number;
};

const riskColors: Record<string, string> = {
    Rendah: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Sedang: "bg-amber-100 text-amber-700 border-amber-200",
    Tinggi: "bg-rose-100 text-rose-700 border-rose-200",
};

const columns: Column<Row>[] = [
    {
        key: "jenis_bencana", label: "Jenis Bencana", sortable: true,
        render: (v) => <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">{String(v)}</span>
    },
    {
        key: "tingkat_risiko", label: "Skala Risiko", sortable: true,
        render: (v) => {
            const risk = String(v || "Rendah");
            const label = risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase();
            return <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full border ${riskColors[label] || riskColors.Rendah}`}>{label}</span>;
        }
    },
    { key: "jumlah_kk_terdampak", label: "KK Terdampak", sortable: true, render: (v) => <span className="text-rose-600 font-bold">{Number(v ?? 0).toLocaleString("id-ID")} KK</span> },
    { key: "jalur_evakuasi", label: "Jalur Evakuasi", render: (v) => <span className="text-gray-600 truncate max-w-[150px] inline-block" title={String(v)}>{String(v)}</span> },
    { key: "posko_bencana", label: "Posko Darurat", render: (v) => <span className="text-blue-700 font-medium">{String(v)}</span> },
    { key: "tahun_data", label: "Validasi (Thn)", sortable: true },
];

export default function BencanaPage() {
    const { data, isLoading, error, kelurahanOptions, createRow, updateRow, deleteRow: deleteData } =
        useAdminKetentramanResource<Row>("bencana", "pemetaan bencana");
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const tinggi = data.filter((r) => String(r.tingkat_risiko).toLowerCase() === "tinggi").length;
    const sedang = data.filter((r) => String(r.tingkat_risiko).toLowerCase() === "sedang").length;
    const totalKK = data.reduce((s, r) => s + Number(r.jumlah_kk_terdampak || 0), 0);

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await updateRow(editRow.id, fd) : await createRow(fd); setModalOpen(false); setEditRow(null); }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menyimpan pemetaan bencana."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await deleteData(deleteRow.id); setDeleteRow(null); }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menghapus data zona rawan."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Peta Kerawanan Bencana" description="Pemetaan zona risiko tinggi, sarana mitigasi, dan infrastruktur kedaruratan wilayah."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Ketentraman & Keamanan", href: "/admin/ketentraman" }, { label: "Titik Bencana" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Zonasi Petakan" value={data.length.toLocaleString("id-ID")} icon={MapPin} gradient="stat-gradient-soft-blue" />
                <StatCard label="Kawasan Risiko Tinggi" value={tinggi.toLocaleString("id-ID")} icon={AlertOctagon} gradient="stat-gradient-soft-rose" />
                <StatCard label="Kawasan Risiko Sedang" value={sedang.toLocaleString("id-ID")} icon={TriangleAlert} gradient="stat-gradient-soft-amber" />
                <StatCard label="Estimasi Terdampak" value={totalKK.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-soft-emerald" />
            </div>

            <DataTable columns={columns} data={data} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Registrasi Zona Bencana" searchPlaceholder="Telusuri jenis atau status musibah..." />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <BencanaFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   BencanaFormModal (Blue/Sky/Indigo Theme + Radio Cards)
   ═══════════════════════════════════════════════════════ */

function BencanaFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: Row | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
}) {
    const isEdit = !!editRow;

    const currentYear = new Date().getFullYear();

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "", jenis_bencana: "Banjir", jalur_evakuasi: "", posko_bencana: "",
        tingkat_risiko: "Sedang", jumlah_kk_terdampak: 0, tahun_data: currentYear,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                jenis_bencana: editRow.jenis_bencana ?? "Banjir",
                jalur_evakuasi: editRow.jalur_evakuasi ?? "",
                posko_bencana: editRow.posko_bencana ?? "",
                tingkat_risiko: editRow.tingkat_risiko ?? "Sedang",
                jumlah_kk_terdampak: editRow.jumlah_kk_terdampak ?? 0,
                tahun_data: editRow.tahun_data ?? currentYear,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "", jenis_bencana: "Banjir", jalur_evakuasi: "", posko_bencana: "",
                tingkat_risiko: "Sedang", jumlah_kk_terdampak: 0, tahun_data: currentYear,
            });
        }
    }, [open, editRow, kelurahanOptions, currentYear]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    const jenisOptions = ["Banjir", "Longsor", "Kebakaran", "Gempa Bumi", "Puting Beliung", "Kekeringan", "Lainnya"];

    // Radio Cards Definitions for Tingkat Risiko
    const riskCards = [
        { id: "Rendah", title: "Rendah", desc: "Aman", icon: ActivitySquare, colorClass: "text-emerald-600", bgActive: "bg-emerald-50", borderActive: "border-emerald-500", ringProps: "ring-emerald-500" },
        { id: "Sedang", title: "Sedang", desc: "Waspada", icon: TriangleAlert, colorClass: "text-amber-600", bgActive: "bg-amber-50", borderActive: "border-amber-500", ringProps: "ring-amber-500" },
        { id: "Tinggi", title: "Tinggi", desc: "Bahaya", icon: AlertOctagon, colorClass: "text-rose-600", bgActive: "bg-rose-50", borderActive: "border-rose-500", ringProps: "ring-rose-500" },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue/Sky/Indigo Theme */}
                <div className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <CloudLightning className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Revisi Pemetaan Bencana" : "Registrasi Zona Kerawanan Bencana"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Tandai lokus kejadian, taksir skala risiko, dan rencanakan infrastruktur evakuasinya.
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                            {/* Left Column: Identitas & Infrastruktur Geodetik */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas & Infrastruktur Geodetik</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Koordinat (Kelurahan) <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 hover:bg-slate-50 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.kelurahan_id as string) || ""}
                                                onChange={(e) => set("kelurahan_id", e.target.value)}
                                            >
                                                <option value="" disabled>Pilih Wilayah</option>
                                                {kelurahanOptions.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Klasifikasi Bencana <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    className="w-full px-4 py-2 hover:bg-slate-50 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-gray-900 appearance-none"
                                                    value={(form.jenis_bencana as string) || "Banjir"}
                                                    onChange={(e) => set("jenis_bencana", e.target.value)}
                                                >
                                                    {jenisOptions.map(j => (
                                                        <option key={j} value={j}>{j}</option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Penetapan Posko Bencana
                                        </label>
                                        <input
                                            type="text" placeholder="Cth: SD Negeri 1 / Balai RW 03..."
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.posko_bencana as string) || ""}
                                            onChange={(e) => set("posko_bencana", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Pemetaan Jalur Evakuasi Cepat
                                        </label>
                                        <textarea
                                            rows={4} placeholder="Deskripsikan rute utama untuk evakuasi warga..."
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-300 resize-none"
                                            value={(form.jalur_evakuasi as string) || ""}
                                            onChange={(e) => set("jalur_evakuasi", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Matriks Dampak & Risiko */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <BoxSelect className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Matriks Dampak & Skala Risiko Akhir</span>
                                </div>

                                <div className="space-y-6">

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">Tahun Validasi Data <span className="text-red-500">*</span></label>
                                            <input
                                                required type="number" min={2000} max={2100}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-mono"
                                                value={(form.tahun_data as number) || currentYear}
                                                onChange={(e) => set("tahun_data", Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">KK Terisolasi / Terdampak</label>
                                            <div className="relative">
                                                <input
                                                    type="number" min={0}
                                                    className="w-full pl-3 pr-10 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-rose-900 transition-all shadow-sm"
                                                    value={(form.jumlah_kk_terdampak as number) || 0}
                                                    onChange={(e) => set("jumlah_kk_terdampak", Number(e.target.value))}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500 pointer-events-none">KK</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tingkat Risiko - Visual Radio Cards */}
                                    <div className="pt-2">
                                        <label className="block text-sm font-bold text-gray-900 mb-3">
                                            Deklarasi Skala Ancaman / Risiko <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {riskCards.map((card) => {
                                                const isActive = form.tingkat_risiko === card.id;
                                                const Icon = card.icon;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={card.id}
                                                        onClick={() => set("tingkat_risiko", card.id)}
                                                        className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${isActive
                                                            ? `${card.borderActive} ${card.bgActive} shadow-sm ring-1 ${card.ringProps}`
                                                            : `border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 opacity-80`
                                                            }`}
                                                    >
                                                        {isActive && (
                                                            <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${card.colorClass} bg-white flex items-center justify-center`}>
                                                                <div className={`w-2 h-2 rounded-full ${card.colorClass.replace('text', 'bg')}`} />
                                                            </div>
                                                        )}
                                                        <Icon className={`w-6 h-6 mb-2 ${isActive ? card.colorClass : "text-slate-400"}`} />
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



                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            Validasi lapangan wajib dilampirkan via dokumen pelengkap.<br />
                            <span className="text-red-400 font-bold">*</span> Indikator krusial
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors"
                            >
                                Batalkan Operasi
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
                                {isEdit ? "Sinkronisasi Perubahan" : "Tetapkan Eksekusi Pemetaan"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
