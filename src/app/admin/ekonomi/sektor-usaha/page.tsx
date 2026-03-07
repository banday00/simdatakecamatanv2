"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Factory, Users, Store, X, Loader2, Save, MapPin, Activity, type LucideIcon } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string;
    sektor: string;
    jumlah_usaha: number;
    jumlah_tenaga_kerja: number;
};

const columns: Column<Row>[] = [
    {
        key: "sektor", label: "Sektor Industri", sortable: true,
        render: (v) => <span className="inline-flex px-3 py-1 text-sm font-bold tracking-wide rounded border bg-indigo-50 text-indigo-700 border-indigo-200">{String(v)}</span>
    },
    { key: "jumlah_usaha", label: "Volume Unit", sortable: true, render: (v) => <span className="font-semibold text-slate-700">{Number(v ?? 0).toLocaleString("id-ID")} Unit</span> },
    { key: "jumlah_tenaga_kerja", label: "Estimasi Pekerja", sortable: true, render: (v) => <span className="font-semibold text-blue-600">{Number(v ?? 0).toLocaleString("id-ID")} Orang</span> },
];

const SEKTOR_OPTIONS = [
    "Pertanian", "Perdagangan", "Jasa", "Industri Makanan", "Industri Kreatif",
    "Manufaktur", "Pariwisata", "Konstruksi", "Transportasi", "Lainnya"
];

export default function SektorUsahaPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "econ_business_sectors" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    const totalData = data.length;
    const totalUnit = data.reduce((s, r) => s + (r.jumlah_usaha || 0), 0);
    const totalTK = data.reduce((s, r) => s + (r.jumlah_tenaga_kerja || 0), 0);

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await update(editRow.id, fd) : await create(fd); setModalOpen(false); setEditRow(null); }
        catch { alert("Gagal menyimpan data sektor"); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus sektor"); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Sektor Usaha" description="Kelola penggolongan dan distribusi usaha berdasarkan sektor"
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Ekonomi", href: "/admin/ekonomi" }, { label: "Sektor Usaha" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Entri Rekam" value={totalData.toLocaleString("id-ID")} icon={Factory} gradient="stat-gradient-soft-blue" />
                <StatCard label="Total Unit Usaha" value={totalUnit.toLocaleString("id-ID")} icon={Store} gradient="stat-gradient-soft-purple" />
                <StatCard label="Serapan Pekerja" value={totalTK.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-soft-emerald" />
            </div>

            <DataTable columns={columns} data={data} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Tambah Sektor" searchPlaceholder="Cari sektor industri..." />

            <SektorUsahaFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SektorUsahaFormModal
   ═══════════════════════════════════════════════════════ */

function SektorUsahaFormModal({
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
        kelurahan_id: "",
        tahun: new Date().getFullYear(),
        sektor: "Perdagangan",
        jumlah_usaha: 0,
        jumlah_tenaga_kerja: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                sektor: editRow.sektor ?? "Perdagangan",
                jumlah_usaha: editRow.jumlah_usaha ?? 0,
                jumlah_tenaga_kerja: editRow.jumlah_tenaga_kerja ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "",
                tahun: new Date().getFullYear(),
                sektor: "Perdagangan",
                jumlah_usaha: 0,
                jumlah_tenaga_kerja: 0,
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
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Indigo/Blue/Violet Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600">
                            <Factory className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Sektor Usaha" : "Tambah Entri Sektor Usaha"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat dan analisis dominasi industri maupun UMKM per Kelurahan.
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Left Column: Konteks Sektor */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <MapPin className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Konteks Sektor & Wilayah</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Kelurahan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.kelurahan_id as string) || ""}
                                            onChange={(e) => set("kelurahan_id", e.target.value)}
                                        >
                                            <option value="" disabled>— Pilih —</option>
                                            {kelurahanOptions.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Tahun Penilaian Data <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={2000}
                                            max={2100}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.tahun as number) || new Date().getFullYear()}
                                            onChange={(e) => set("tahun", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Sektor Utama <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.sektor as string) || "Perdagangan"}
                                            onChange={(e) => set("sektor", e.target.value)}
                                        >
                                            {SEKTOR_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Agregat & Kapasitas */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-violet-100">
                                    <Activity className="w-4 h-4 text-violet-500" />
                                    <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Agregat & Kapasitas Industri</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Total Volume Unit Usaha (Aktor) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                className="w-full pl-4 pr-16 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                                value={(form.jumlah_usaha as number) || 0}
                                                onChange={(e) => set("jumlah_usaha", Number(e.target.value))}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                                <span className="text-gray-500 text-sm">Unit</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Estimasi Serapan Pekerja (Total) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                className="w-full pl-4 pr-16 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                                value={(form.jumlah_tenaga_kerja as number) || 0}
                                                onChange={(e) => set("jumlah_tenaga_kerja", Number(e.target.value))}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                                <span className="text-gray-500 text-sm">Orang</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mt-6">
                                    <h4 className="text-xs font-bold text-indigo-800 mb-2 uppercase tracking-wide">Fokus Entri Data Sektoral</h4>
                                    <p className="text-sm text-indigo-700 leading-relaxed">
                                        Data pada panel ini merupakan agregat gabungan dari ratusan perorangan. Contoh: Jika disebuah wilayah terdapat indikasi 200 Pedagang Kaki Lima, catat sebagai entri baru "Perdagangan" dengan "Volume 200".
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Wajib diisi
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Simpan Pembaruan Sektor" : "Tambahkan Sektor Industri"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
