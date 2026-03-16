"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Shield, Users, Award, Home, X, Loader2, Save, Users2, Building2 } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; tahun: number;
    jumlah_linmas: number;
    jumlah_satgas: number;
    jumlah_fkdm: number;
    pelatihan_dilaksanakan: number;
    kegiatan_siskamling: number;
    pos_kamling: number;
};

const columns: Column<Row>[] = [
    { key: "kelurahan_nama" as keyof Row, label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Periode", sortable: true },
    { key: "jumlah_linmas", label: "Anggota Linmas", sortable: true, render: (v) => <span className="font-semibold text-blue-700">{Number(v ?? 0).toLocaleString("id-ID")} Orang</span> },
    { key: "jumlah_satgas", label: "Satgas Linmas", render: (v) => <span className="font-medium text-emerald-600">{Number(v ?? 0).toLocaleString("id-ID")} Orang</span> },
    { key: "jumlah_fkdm", label: "Anggota FKDM", render: (v) => <span className="font-medium text-amber-600">{Number(v ?? 0).toLocaleString("id-ID")}</span> },
    { key: "pelatihan_dilaksanakan", label: "Giat Pelatihan", render: (v) => <span className="text-gray-700">{Number(v ?? 0)} Kali</span> },
    { key: "kegiatan_siskamling", label: "Ronda/Siskamling", render: (v) => <span className="text-gray-700">{Number(v ?? 0)} Kegiatan</span> },
    { key: "pos_kamling", label: "Infrastruktur Pos", sortable: true, render: (v) => <span className="text-gray-900 border border-gray-200 bg-gray-50 px-2.5 py-1 rounded-md text-xs font-bold">{Number(v ?? 0)} Unit</span> },
];

export default function KaderPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "security_cadres" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    const kelMap = useMemo(() => new Map(kelurahans.map(k => [k.id, k.nama])), [kelurahans]);
    const enrichedData = useMemo(() => {
        return [...data]
            .map(r => ({ ...r, kelurahan_nama: kelMap.get(r.kelurahan_id) || "-" }))
            .sort((a, b) => {
                const ca = (a as any).created_at || "";
                const cb = (b as any).created_at || "";
                return cb.localeCompare(ca);
            });
    }, [data, kelMap]);

    const totalLinmas = data.reduce((s, r) => s + (r.jumlah_linmas || 0), 0);
    const totalSatgas = data.reduce((s, r) => s + (r.jumlah_satgas || 0), 0);
    const totalPos = data.reduce((s, r) => s + (r.pos_kamling || 0), 0);
    const totalSiskamling = data.reduce((s, r) => s + (r.kegiatan_siskamling || 0), 0);

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await update(editRow.id, fd) : await create(fd); setModalOpen(false); setEditRow(null); }
        catch { alert("Gagal menyimpan data pengawasan kader."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus entri kader."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Inventarisasi Kader Keamanan" description="Pangkalan data linmas, satelit satgas, FKDM, serta evaluasi rasio giat siskamling lingkungan."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Ketentraman & Ketertiban", href: "/admin/ketentraman" }, { label: "Kader Terdaftar" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Personel Linmas" value={totalLinmas.toLocaleString("id-ID")} icon={Shield} gradient="stat-gradient-soft-blue" />
                <StatCard label="Satuan Tugas (Satgas)" value={totalSatgas.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Jaringan Pos Kamling" value={totalPos.toLocaleString("id-ID")} icon={Home} gradient="stat-gradient-soft-amber" />
                <StatCard label="Frekuensi Siskamling" value={totalSiskamling.toLocaleString("id-ID")} icon={Award} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Registrasi Evaluasi Keamanan" searchPlaceholder="Cari riwayat siskamling..." />

            <KaderFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Data Kader"
                message={deleteRow ? `Hapus data kader keamanan tahun ${deleteRow.tahun} untuk kelurahan "${kelMap.get(deleteRow.kelurahan_id) || '-'}"?` : ""} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   KaderFormModal (Blue/Sky/Indigo Theme)
   ═══════════════════════════════════════════════════════ */

function KaderFormModal({
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

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "", tahun: new Date().getFullYear(),
        jenis: "Kader Keamanan", jumlah: 0,
        jumlah_linmas: 0, jumlah_satgas: 0, jumlah_fkdm: 0,
        pelatihan_dilaksanakan: 0,
        kegiatan_siskamling: 0,
        pos_kamling: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "", tahun: editRow.tahun ?? new Date().getFullYear(),
                jenis: (editRow as any).jenis ?? "Kader Keamanan",
                jumlah: (editRow as any).jumlah ?? 0,
                jumlah_linmas: editRow.jumlah_linmas ?? 0,
                jumlah_satgas: editRow.jumlah_satgas ?? 0,
                jumlah_fkdm: editRow.jumlah_fkdm ?? 0,
                pelatihan_dilaksanakan: editRow.pelatihan_dilaksanakan ?? 0,
                kegiatan_siskamling: editRow.kegiatan_siskamling ?? 0,
                pos_kamling: editRow.pos_kamling ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "", tahun: new Date().getFullYear(),
                jenis: "Kader Keamanan", jumlah: 0,
                jumlah_linmas: 0, jumlah_satgas: 0, jumlah_fkdm: 0,
                pelatihan_dilaksanakan: 0,
                kegiatan_siskamling: 0,
                pos_kamling: 0,
            });
        }
    }, [open, editRow, kelurahanOptions]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

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
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Perbarui Formasi Kader" : "Pencatatan Kader & Siskamling"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Pantau kuantitas serapan personel pertahanan sipil serta infrastruktur swadaya keamanan sekitar.
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

                            {/* Left Column: Register SDM Keamanan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <Users2 className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Demografi Pasukan & Administrasi</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Tahun Validasi <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required type="number" min={2000} max={2100}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.tahun as number) || new Date().getFullYear()}
                                                onChange={(e) => set("tahun", Number(e.target.value))}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Wilayah Operasional <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.kelurahan_id as string) || ""}
                                                onChange={(e) => set("kelurahan_id", e.target.value)}
                                            >
                                                <option value="" disabled>Pilih Koordinat Sektor</option>
                                                {kelurahanOptions.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-blue-900 mb-2">
                                                    Jumlah Anggota Linmas <span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex">
                                                    <input
                                                        required type="number" min={0}
                                                        className="w-full pl-4 pr-3 py-2.5 bg-blue-50 border border-blue-200 rounded-l-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-blue-900 placeholder-blue-300"
                                                        value={(form.jumlah_linmas as number) || 0}
                                                        onChange={(e) => set("jumlah_linmas", Number(e.target.value))}
                                                    />
                                                    <span className="inline-flex items-center px-3 text-xs font-semibold text-blue-500 bg-blue-100 border border-l-0 border-blue-200 rounded-r-xl whitespace-nowrap">Personel</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-indigo-900 mb-2">
                                                    Jumlah Satgas Linmas <span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex">
                                                    <input
                                                        required type="number" min={0}
                                                        className="w-full pl-4 pr-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-l-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-indigo-900 placeholder-indigo-300"
                                                        value={(form.jumlah_satgas as number) || 0}
                                                        onChange={(e) => set("jumlah_satgas", Number(e.target.value))}
                                                    />
                                                    <span className="inline-flex items-center px-3 text-xs font-semibold text-indigo-500 bg-indigo-100 border border-l-0 border-indigo-200 rounded-r-xl whitespace-nowrap">Personel</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Dukungan Anggota FKDM
                                            </label>
                                            <input
                                                type="number" min={0}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.jumlah_fkdm as number) || 0}
                                                onChange={(e) => set("jumlah_fkdm", Number(e.target.value))}
                                                placeholder="Contoh: 15"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Infrastruktur & Program Rutin */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <Building2 className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Aset Fisik & Operasional Terpadu</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-semibold text-emerald-900">
                                                Aset Bangunan Pos Kamling
                                            </label>
                                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Infrastruktur</span>
                                        </div>
                                        <div className="flex">
                                            <input
                                                type="number" min={0}
                                                className="w-full pl-4 pr-3 py-3 bg-white border-2 border-emerald-200 rounded-l-xl text-lg font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm text-center text-emerald-800"
                                                value={(form.pos_kamling as number) || 0}
                                                onChange={(e) => set("pos_kamling", Number(e.target.value))}
                                            />
                                            <span className="inline-flex items-center px-3 text-sm font-bold text-emerald-500 bg-emerald-100 border-2 border-l-0 border-emerald-200 rounded-r-xl whitespace-nowrap">Unit Gardu</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">
                                                Intensitas Siskamling/Ronda
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number" min={0}
                                                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-gray-800"
                                                    value={(form.kegiatan_siskamling as number) || 0}
                                                    onChange={(e) => set("kegiatan_siskamling", Number(e.target.value))}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">Giat</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">
                                                Pelatihan Bimbingan Tereksekusi
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number" min={0}
                                                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-gray-800"
                                                    value={(form.pelatihan_dilaksanakan as number) || 0}
                                                    onChange={(e) => set("pelatihan_dilaksanakan", Number(e.target.value))}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">Sesi</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Instrumen kritis yang dipersyaratkan
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors"
                            >
                                Tutup Panel
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
                                {isEdit ? "Mutakhirkan Pangkalan Data" : "Patenkan Rekapitulasi"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
