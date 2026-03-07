"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Baby, Activity, HeartPulse, Stethoscope, Save, X, Loader2, Calendar } from "lucide-react";

type MaternalRow = Record<string, unknown> & {
    id: string;
    tahun: number;
    ibu_hamil: number;
    ibu_bersalin: number;
    bayi_lahir_hidup: number;
    kb_aktif: number;
};

const columns: Column<MaternalRow>[] = [
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "ibu_hamil",
        label: "Ibu Hamil",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "ibu_bersalin",
        label: "Ibu Bersalin",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "bayi_lahir_hidup",
        label: "Bayi Lahir",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "kb_aktif",
        label: "Akseptor KB Aktif",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
];

const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function MaternalAdminPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<MaternalRow>({ table: "health_maternal" });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<MaternalRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<MaternalRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Calculate totals across all records
    const totalIbuHamil = data.reduce((acc, curr) => acc + (curr.ibu_hamil || 0), 0);
    const totalIbuBersalin = data.reduce((acc, curr) => acc + (curr.ibu_bersalin || 0), 0);
    const totalBayiLahir = data.reduce((acc, curr) => acc + (curr.bayi_lahir_hidup || 0), 0);
    const totalKB = data.reduce((acc, curr) => acc + (curr.kb_aktif || 0), 0);

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch { alert("Gagal menyimpan data ibu & anak"); }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data ibu & anak"); }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Kesehatan Ibu & Anak (KIA)"
                description="Pemantauan persalinan, kehamilan, dan akseptor KB"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kesehatan", href: "/admin/kesehatan" },
                    { label: "Ibu & Anak" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Ibu Hamil" value={totalIbuHamil} icon={HeartPulse} gradient="stat-gradient-soft-amber" />
                <StatCard label="Total Ibu Bersalin" value={totalIbuBersalin} icon={Activity} gradient="stat-gradient-soft-blue" />
                <StatCard label="Bayi Lahir Hidup" value={totalBayiLahir} icon={Baby} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Akseptor KB Aktif" value={totalKB} icon={Stethoscope} gradient="stat-gradient-soft-indigo" />
            </div>

            <DataTable
                columns={columns}
                data={data}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Data"
                searchPlaceholder="Cari data berdasarkan tahun..."
            />

            <MaternalFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahanOptions={kelurahanOptions}
            />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   MaternalFormModal
   ═══════════════════════════════════════════════════════ */

function MaternalFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: MaternalRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        tahun: new Date().getFullYear(),
        ibu_hamil: 0,
        ibu_bersalin: 0,
        bayi_lahir_hidup: 0,
        kb_aktif: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                ibu_hamil: editRow.ibu_hamil ?? 0,
                ibu_bersalin: editRow.ibu_bersalin ?? 0,
                bayi_lahir_hidup: editRow.bayi_lahir_hidup ?? 0,
                kb_aktif: editRow.kb_aktif ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "",
                tahun: new Date().getFullYear(),
                ibu_hamil: 0,
                ibu_bersalin: 0,
                bayi_lahir_hidup: 0,
                kb_aktif: 0,
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
                {/* Gradient accent - Rose/Indigo Theme for Maternal */}
                <div className="h-1.5 bg-gradient-to-r from-rose-400 via-fuchsia-500 to-indigo-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-rose-50 to-indigo-50 text-rose-600">
                            <Baby className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Data Ibu & Anak" : "Tambah Data Ibu & Anak"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Masukkan indikator cakupan pelayanan kesehatan maternal dan akseptor KB.
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
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                            {/* Left Column: Context Data */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-rose-100">
                                    <Calendar className="w-4 h-4 text-rose-500" />
                                    <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Konteks Laporan</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Kelurahan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                                        value={(form.kelurahan_id as string) || ""}
                                        onChange={(e) => set("kelurahan_id", e.target.value)}
                                    >
                                        <option value="" disabled>— Pilih Kelurahan —</option>
                                        {kelurahanOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Tahun <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                                        value={(form.tahun as number) || new Date().getFullYear()}
                                        onChange={(e) => set("tahun", Number(e.target.value))}
                                    >
                                        {availableYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right Column: Key Indicators */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-rose-100">
                                    <Activity className="w-4 h-4 text-rose-500" />
                                    <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Indikator Pelayanan</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Ibu Hamil <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                                            value={(form.ibu_hamil as number) || 0}
                                            onChange={(e) => set("ibu_hamil", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Ibu Bersalin <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                                            value={(form.ibu_bersalin as number) || 0}
                                            onChange={(e) => set("ibu_bersalin", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Bayi Lahir Hidup <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                                            value={(form.bayi_lahir_hidup as number) || 0}
                                            onChange={(e) => set("bayi_lahir_hidup", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Akseptor KB Aktif <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                                            value={(form.kb_aktif as number) || 0}
                                            onChange={(e) => set("kb_aktif", Number(e.target.value))}
                                        />
                                    </div>
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-lg shadow-rose-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Simpan Perubahan" : "Tambah Data"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
