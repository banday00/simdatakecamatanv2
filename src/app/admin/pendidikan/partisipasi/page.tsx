"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { GraduationCap, TrendingUp, TrendingDown, BarChart3, X, Loader2, Save, Calendar, Activity } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string;
    jenjang: string;
    tahun: number;
    usia_sekolah: number;
    anak_bersekolah: number;
    angka_partisipasi_kasar: number;
    angka_partisipasi_murni: number;
    angka_putus_sekolah: number;
    angka_melanjutkan: number;
};

const columns: Column<Row>[] = [
    {
        key: "jenjang",
        label: "Jenjang",
        sortable: true,
        render: (v) => <span className="inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">{String(v)}</span>
    },
    { key: "usia_sekolah", label: "Usia Sekolah", sortable: true, render: (v) => <span className="text-slate-700">{Number(v ?? 0).toLocaleString("id-ID")}</span> },
    { key: "anak_bersekolah", label: "Bersekolah", sortable: true, render: (v) => <span className="text-slate-700 font-medium">{Number(v ?? 0).toLocaleString("id-ID")}</span> },
    {
        key: "angka_partisipasi_kasar", label: "APK (%)", sortable: true,
        render: (v) => <span className="font-semibold text-indigo-700">{Number(v ?? 0).toFixed(1)}%</span>
    },
    { key: "angka_partisipasi_murni", label: "APM (%)", render: (v) => <span className="font-semibold text-violet-700">{Number(v ?? 0).toFixed(1)}%</span> },
    {
        key: "angka_putus_sekolah", label: "Putus Sekolah", sortable: true,
        render: (v) => <span className={Number(v) > 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-medium"}>{Number(v ?? 0).toLocaleString("id-ID")}</span>
    },
];

const JENJANG_OPTIONS = ["SD/MI", "SMP/MTs", "SMA/MA/SMK"];

export default function PartisipasiPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "edu_participation" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Aggregations
    const avgAPK = data.length ? (data.reduce((s, r) => s + (r.angka_partisipasi_kasar || 0), 0) / data.length).toFixed(1) : "0";
    const totalBersekolah = data.reduce((s, r) => s + (r.anak_bersekolah || 0), 0);
    const totalPutus = data.reduce((s, r) => s + (r.angka_putus_sekolah || 0), 0);

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        }
        catch { alert("Gagal menyimpan data partisipasi pendidikan"); }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data partisipasi pendidikan"); }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Partisipasi Pendidikan"
                description="Angka partisipasi dan putus sekolah per jenjang"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pendidikan", href: "/admin/pendidikan" },
                    { label: "Partisipasi" }
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Data Entries" value={data.length} icon={BarChart3} gradient="stat-gradient-soft-blue" />
                <StatCard label="Rata-rata APK" value={`${avgAPK}%`} icon={GraduationCap} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Total Bersekolah" value={totalBersekolah.toLocaleString("id-ID")} icon={TrendingUp} gradient="stat-gradient-soft-amber" />
                <StatCard label="Putus Sekolah" value={totalPutus.toLocaleString("id-ID")} icon={TrendingDown} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable
                columns={columns}
                data={data}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)}
                addLabel="Tambah Data"
                searchPlaceholder="Cari jenjang..."
            />

            <PartisipasiFormModal
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
   PartisipasiFormModal
   ═══════════════════════════════════════════════════════ */

function PartisipasiFormModal({
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
        jenjang: "SD/MI",
        usia_sekolah: 0,
        anak_bersekolah: 0,
        angka_partisipasi_kasar: 0,
        angka_partisipasi_murni: 0,
        angka_putus_sekolah: 0,
        angka_melanjutkan: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                jenjang: editRow.jenjang ?? "SD/MI",
                usia_sekolah: editRow.usia_sekolah ?? 0,
                anak_bersekolah: editRow.anak_bersekolah ?? 0,
                angka_partisipasi_kasar: editRow.angka_partisipasi_kasar ?? 0,
                angka_partisipasi_murni: editRow.angka_partisipasi_murni ?? 0,
                angka_putus_sekolah: editRow.angka_putus_sekolah ?? 0,
                angka_melanjutkan: editRow.angka_melanjutkan ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "",
                tahun: new Date().getFullYear(),
                jenjang: "SD/MI",
                usia_sekolah: 0,
                anak_bersekolah: 0,
                angka_partisipasi_kasar: 0,
                angka_partisipasi_murni: 0,
                angka_putus_sekolah: 0,
                angka_melanjutkan: 0,
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
                {/* Gradient accent - Violet/Purple/Fuchsia Theme */}
                <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-violet-50 to-purple-50 text-violet-600">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Partisipasi Pendidikan" : "Tambah Partisipasi Pendidikan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat indikator partisipasi siswa dan persebaran angka pendidikan kecamatan.
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
                                <div className="flex items-center gap-2 pb-2 border-b border-violet-100">
                                    <Calendar className="w-4 h-4 text-violet-500" />
                                    <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Konteks Laporan</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Kelurahan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
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
                                            Jenjang Pendidikan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                            value={(form.jenjang as string) || "SD/MI"}
                                            onChange={(e) => set("jenjang", e.target.value)}
                                        >
                                            {JENJANG_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Tahun Data <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={2000}
                                            max={2100}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                            value={(form.tahun as number) || new Date().getFullYear()}
                                            onChange={(e) => set("tahun", Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Key Indicators */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-violet-100">
                                    <Activity className="w-4 h-4 text-violet-500" />
                                    <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Indikator Partisipasi</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                                    {/* Kolom Indikasi Dasar */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Penduduk Usia Sekolah
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                            value={(form.usia_sekolah as number) || 0}
                                            onChange={(e) => set("usia_sekolah", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Anak Bersekolah
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                            value={(form.anak_bersekolah as number) || 0}
                                            onChange={(e) => set("anak_bersekolah", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Angka Partisipasi Kasar (APK) %
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                            value={(form.angka_partisipasi_kasar as number) || 0}
                                            onChange={(e) => set("angka_partisipasi_kasar", Number(e.target.value))}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Gunakan desimal (contoh: 95.5)</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Angka Partisipasi Murni (APM) %
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                            value={(form.angka_partisipasi_murni as number) || 0}
                                            onChange={(e) => set("angka_partisipasi_murni", Number(e.target.value))}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Gunakan desimal (contoh: 88.2)</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Putus Sekolah
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                            value={(form.angka_putus_sekolah as number) || 0}
                                            onChange={(e) => set("angka_putus_sekolah", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Angka Melanjutkan %
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                                            value={(form.angka_melanjutkan as number) || 0}
                                            onChange={(e) => set("angka_melanjutkan", Number(e.target.value))}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Gunakan desimal (contoh: 98.7)</p>
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-lg shadow-violet-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
