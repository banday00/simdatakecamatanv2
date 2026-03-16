"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { GraduationCap, TrendingUp, TrendingDown, BarChart3, X, Loader2, Save, Calendar, Activity, MapPin } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    jenjang: string;
    tahun: number;
    angka_partisipasi: number;
    angka_putus_sekolah: number;
    angka_melek_huruf: number;
};

const JENJANG_COLORS: Record<string, string> = {
    "SD": "bg-blue-100 text-blue-700 border-blue-200",
    "SMP": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "SMA": "bg-violet-100 text-violet-700 border-violet-200",
};

const columns: Column<Row>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "jenjang",
        label: "Jenjang",
        sortable: true,
        render: (v) => (
            <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${JENJANG_COLORS[String(v)] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {String(v)}
            </span>
        ),
    },
    {
        key: "angka_partisipasi",
        label: "Partisipasi (%)",
        sortable: true,
        render: (v) => <span className="font-semibold text-indigo-700">{Number(v ?? 0).toFixed(1)}%</span>,
    },
    {
        key: "angka_putus_sekolah",
        label: "Putus Sekolah",
        sortable: true,
        render: (v) => {
            const val = Number(v ?? 0);
            return <span className={val > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-medium"}>{val.toLocaleString("id-ID")}</span>;
        },
    },
    {
        key: "angka_melek_huruf",
        label: "Melek Huruf (%)",
        sortable: true,
        render: (v) => <span className="font-semibold text-emerald-700">{Number(v ?? 0).toFixed(1)}%</span>,
    },
];

const JENJANG_OPTIONS = ["SD", "SMP", "SMA"];

export default function PartisipasiPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove, isKelurahanAdmin, filterKelurahanId } = useCrud<Row>({ table: "edu_participation" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Enrich data with kelurahan_nama
    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    // Aggregations
    const avgPartisipasi = data.length ? (data.reduce((s, r) => s + (r.angka_partisipasi || 0), 0) / data.length).toFixed(1) : "0";
    const totalPutus = data.reduce((s, r) => s + (r.angka_putus_sekolah || 0), 0);
    const avgMelekHuruf = data.length ? (data.reduce((s, r) => s + (r.angka_melek_huruf || 0), 0) / data.length).toFixed(1) : "0";

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            console.error("[Partisipasi] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch (err: any) {
            console.error("[Partisipasi] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Partisipasi Pendidikan"
                description="Angka partisipasi, melek huruf, dan putus sekolah per jenjang"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pendidikan", href: "/admin/pendidikan" },
                    { label: "Partisipasi" }
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Data Entries" value={data.length} icon={BarChart3} gradient="stat-gradient-soft-blue" />
                <StatCard label="Rata-rata Partisipasi" value={`${avgPartisipasi}%`} icon={GraduationCap} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Total Putus Sekolah" value={totalPutus.toLocaleString("id-ID")} icon={TrendingDown} gradient="stat-gradient-soft-rose" />
                <StatCard label="Rata-rata Melek Huruf" value={`${avgMelekHuruf}%`} icon={TrendingUp} gradient="stat-gradient-soft-amber" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
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
                isKelurahanAdmin={isKelurahanAdmin}
                filterKelurahanId={filterKelurahanId}
            />

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                title="Hapus Data Partisipasi"
                message={`Apakah Anda yakin ingin menghapus data ${deleteRow?.jenjang} tahun ${deleteRow?.tahun}? Tindakan ini tidak dapat dibatalkan.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PartisipasiFormModal
   ═══════════════════════════════════════════════════════ */

function PartisipasiFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: Row | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        tahun: new Date().getFullYear(),
        jenjang: "SD",
        angka_partisipasi: 0,
        angka_putus_sekolah: 0,
        angka_melek_huruf: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                jenjang: editRow.jenjang ?? "SD/MI",
                angka_partisipasi: editRow.angka_partisipasi ?? 0,
                angka_putus_sekolah: editRow.angka_putus_sekolah ?? 0,
                angka_melek_huruf: editRow.angka_melek_huruf ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
                tahun: new Date().getFullYear(),
                jenjang: "SD",
                angka_partisipasi: 0,
                angka_putus_sekolah: 0,
                angka_melek_huruf: 0,
            });
        }
    }, [open, editRow, isKelurahanAdmin, filterKelurahanId]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Partisipasi Pendidikan" : "Tambah Partisipasi Pendidikan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat indikator partisipasi siswa dan angka melek huruf per jenjang pendidikan.
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
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Konteks Laporan</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Kelurahan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.kelurahan_id as string) || ""}
                                            onChange={(e) => set("kelurahan_id", e.target.value)}
                                            disabled={kelurahanOptions.length === 1}
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
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
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
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.tahun as number) || new Date().getFullYear()}
                                            onChange={(e) => set("tahun", Number(e.target.value))}
                                        >
                                            {availableYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Key Indicators */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Indikator Partisipasi</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <label className="flex flex-col mb-1.5">
                                            <span className="text-sm font-semibold text-gray-700">Angka Partisipasi (%) <span className="text-red-500">*</span></span>
                                            <span className="text-xs text-gray-400">Persentase penduduk usia sekolah yang bersekolah pada jenjang ini</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            max={100}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.angka_partisipasi as number) || 0}
                                            onChange={(e) => set("angka_partisipasi", Number(e.target.value))}
                                            placeholder="contoh: 95.5"
                                        />
                                    </div>

                                    <div>
                                        <label className="flex flex-col mb-1.5">
                                            <span className="text-sm font-semibold text-gray-700">Putus Sekolah</span>
                                            <span className="text-xs text-gray-400">Jumlah siswa putus sekolah</span>
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.angka_putus_sekolah as number) || 0}
                                            onChange={(e) => set("angka_putus_sekolah", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="flex flex-col mb-1.5">
                                            <span className="text-sm font-semibold text-gray-700">Angka Melek Huruf (%)</span>
                                            <span className="text-xs text-gray-400">Persentase penduduk yang mampu baca-tulis</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            max={100}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.angka_melek_huruf as number) || 0}
                                            onChange={(e) => set("angka_melek_huruf", Number(e.target.value))}
                                            placeholder="contoh: 98.7"
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
