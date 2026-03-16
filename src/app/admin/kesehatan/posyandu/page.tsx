"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Heart, Activity, Target, ShieldCheck, X, Loader2, Save, MapPin } from "lucide-react";

type PosyanduRow = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    nama: string;
    strata: string;
    jumlah_kader: number;
    jumlah_balita: number;
    jumlah_lansia: number;
};

const STRATA_COLORS: Record<string, string> = {
    "Mandiri": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Purnama": "bg-blue-100 text-blue-700 border-blue-200",
    "Madya": "bg-amber-100 text-amber-700 border-amber-200",
    "Pratama": "bg-indigo-100 text-indigo-700 border-indigo-200"
};

const columns: Column<PosyanduRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "nama", label: "Nama Posyandu", sortable: true },
    {
        key: "strata",
        label: "Strata",
        sortable: true,
        render: (val) => (
            <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${STRATA_COLORS[String(val) || "Pratama"] || STRATA_COLORS["Pratama"]}`}>
                {String(val || "Pratama")}
            </span>
        ),
    },
    {
        key: "jumlah_kader",
        label: "Jml Kader",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "jumlah_balita",
        label: "Sasaran Balita",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "jumlah_lansia",
        label: "Sasaran Lansia",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
];

const strataOptions = [
    { label: "Pratama", value: "Pratama" },
    { label: "Madya", value: "Madya" },
    { label: "Purnama", value: "Purnama" },
    { label: "Mandiri", value: "Mandiri" },
];

export default function PosyanduAdminPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove, isKelurahanAdmin, filterKelurahanId } = useCrud<PosyanduRow>({ table: "health_posyandu" });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<PosyanduRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<PosyanduRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Enrich data with kelurahan_nama
    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    const totalPosyandu = data.length;
    const totalMandiri = data.filter((r) => r.strata === "Mandiri").length;
    const totalKader = data.reduce((acc, curr) => acc + (curr.jumlah_kader || 0), 0);
    const totalSasaran = data.reduce((acc, curr) => acc + (curr.jumlah_balita || 0) + (curr.jumlah_lansia || 0), 0);

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            console.error("[Posyandu] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch (err: any) {
            console.error("[Posyandu] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Posyandu & Layanan Dasar"
                description="Kelola data posyandu, jumlah kader, sasaran balita, dan lansia"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kesehatan", href: "/admin/kesehatan" },
                    { label: "Posyandu" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Posyandu" value={totalPosyandu} icon={Heart} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Strata Mandiri" value={totalMandiri} icon={ShieldCheck} gradient="stat-gradient-soft-blue" />
                <StatCard label="Total Kader" value={totalKader} icon={Activity} gradient="stat-gradient-soft-indigo" />
                <StatCard label="Total Sasaran" value={totalSasaran} icon={Target} gradient="stat-gradient-soft-amber" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Data"
                searchPlaceholder="Cari posyandu..."
            />

            <PosyanduFormModal
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
                title="Hapus Data Posyandu"
                message={`Apakah Anda yakin ingin menghapus posyandu "${deleteRow?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PosyanduFormModal
   ═══════════════════════════════════════════════════════ */

function PosyanduFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: PosyanduRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        nama: "",
        strata: "Pratama",
        jumlah_kader: 0,
        jumlah_balita: 0,
        jumlah_lansia: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                strata: editRow.strata ?? "Pratama",
                jumlah_kader: editRow.jumlah_kader ?? 0,
                jumlah_balita: editRow.jumlah_balita ?? 0,
                jumlah_lansia: editRow.jumlah_lansia ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
                nama: "",
                strata: "Pratama",
                jumlah_kader: 0,
                jumlah_balita: 0,
                jumlah_lansia: 0,
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

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Emerald/Teal Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <Heart className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Posyandu" : "Tambah Posyandu"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat informasi operasional dan jumlah cakupan sasaran pelayanan posyandu.
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
                                <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Konteks Laporan</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Kelurahan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
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
                                        Nama Posyandu <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                        value={(form.nama as string) || ""}
                                        onChange={(e) => set("nama", e.target.value)}
                                        placeholder="Contoh: Posyandu Mawar 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Strata / Tingkat
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                        value={(form.strata as string) || "Pratama"}
                                        onChange={(e) => set("strata", e.target.value)}
                                    >
                                        {strataOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right Column: Data Sasaran & Kapasitas */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                                    <Target className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Kapasitas & Sasaran</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <label className="flex flex-col mb-1.5">
                                            <span className="text-sm font-semibold text-gray-700">Jumlah Kader <span className="text-red-500">*</span></span>
                                            <span className="text-xs text-gray-500 mb-2">Total tenaga kesehatan dan sukarelawan aktif di posyandu.</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                            value={(form.jumlah_kader as number) || 0}
                                            onChange={(e) => set("jumlah_kader", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Sasaran Balita <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                            value={(form.jumlah_balita as number) || 0}
                                            onChange={(e) => set("jumlah_balita", Number(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Sasaran Lansia <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                            value={(form.jumlah_lansia as number) || 0}
                                            onChange={(e) => set("jumlah_lansia", Number(e.target.value))}
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
