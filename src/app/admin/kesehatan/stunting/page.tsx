"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Baby, AlertTriangle, TrendingDown, Target, X, Loader2, Save, MapPin, Activity } from "lucide-react";

type StuntingRow = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    tahun: number;
    bulan?: number;
    balita_total: number;
    balita_stunting: number;
    balita_gizi_buruk?: number;
    balita_gizi_kurang?: number;
};

const columns: Column<StuntingRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "balita_total",
        label: "Balita",
        sortable: true,
        render: (val) => Number(val ?? 0).toLocaleString("id-ID"),
    },
    {
        key: "balita_stunting",
        label: "Stunting",
        sortable: true,
        render: (val) => <span className="font-medium text-red-600">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "prevalensi",
        label: "Prevalensi",
        sortable: true,
        render: (val) => {
            const v = Number(val ?? 0);
            return (
                <span className={`font-semibold ${v > 20 ? "text-red-600" : v > 10 ? "text-amber-600" : "text-green-600"}`}>
                    {v.toFixed(1)}%
                </span>
            );
        },
    },
    {
        key: "balita_gizi_buruk",
        label: "Gizi Buruk",
        render: (val) => Number(val ?? 0).toLocaleString("id-ID"),
    },
];

const bulanOptions = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i).toLocaleString("id-ID", { month: "long" }),
    value: String(i + 1)
}));

export default function StuntingPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove, isKelurahanAdmin, filterKelurahanId } = useCrud<StuntingRow>({ table: "health_stunting" });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<StuntingRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<StuntingRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Enrich data with kelurahan_nama and computed prevalensi for display
    const enrichedData = data.map((row) => {
        const total = Number(row.balita_total) || 0;
        const stunting = Number(row.balita_stunting) || 0;
        const prevalensi = total > 0 ? (stunting / total) * 100 : 0;
        return {
            ...row,
            kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
            prevalensi,
        };
    });

    const totalBalita = data.reduce((s, r) => s + (Number(r.balita_total) || 0), 0);
    const totalStunting = data.reduce((s, r) => s + (Number(r.balita_stunting) || 0), 0);
    const avgPrevalensi = totalBalita > 0 ? (totalStunting / totalBalita) * 100 : 0;

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            // Strip prevalensi (computed field, not in DB)
            const { prevalensi: _prev, ...dbPayload } = formData;
            if (editRow) await update(editRow.id, dbPayload);
            else await create(dbPayload);
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            console.error("[Stunting] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch (err: any) {
            console.error("[Stunting] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Data Stunting"
                description="Pemantauan data stunting dan status gizi balita"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kesehatan", href: "/admin/kesehatan" },
                    { label: "Stunting" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Balita" value={totalBalita.toLocaleString("id-ID")} icon={Baby} gradient="stat-gradient-blue" />
                <StatCard label="Kasus Stunting" value={totalStunting.toLocaleString("id-ID")} icon={AlertTriangle} gradient="stat-gradient-rose" />
                <StatCard label="Prevalensi Rata-rata" value={`${avgPrevalensi.toFixed(1)}%`} icon={TrendingDown} gradient="stat-gradient-amber" />
                <StatCard label="Target Nasional" value="14%" icon={Target} gradient="stat-gradient-emerald" />
            </div>

            <DataTable
                columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Data" searchPlaceholder="Cari data stunting..."
            />

            <StuntingFormModal
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
                title="Hapus Data Stunting"
                message={`Apakah Anda yakin ingin menghapus data stunting${deleteRow?.kelurahan_nama ? ` kelurahan ${deleteRow.kelurahan_nama}` : ""}? Tindakan ini tidak dapat dibatalkan.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   StuntingFormModal
   ═══════════════════════════════════════════════════════ */

function StuntingFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: StuntingRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        tahun: new Date().getFullYear(),
        bulan: new Date().getMonth() + 1,
        balita_total: 0,
        balita_stunting: 0,
        prevalensi: 0,
        balita_gizi_buruk: 0,
        balita_gizi_kurang: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                bulan: editRow.bulan ?? new Date().getMonth() + 1,
                balita_total: editRow.balita_total ?? 0,
                balita_stunting: editRow.balita_stunting ?? 0,
                prevalensi: 0,
                balita_gizi_buruk: editRow.balita_gizi_buruk ?? 0,
                balita_gizi_kurang: editRow.balita_gizi_kurang ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
                tahun: new Date().getFullYear(),
                bulan: new Date().getMonth() + 1,
                balita_total: 0,
                balita_stunting: 0,
                prevalensi: 0,
                balita_gizi_buruk: 0,
                balita_gizi_kurang: 0,
            });
        }
    }, [open, editRow, isKelurahanAdmin, filterKelurahanId]);

    // Auto-calculate prevalensi: (balita_stunting / balita_total) * 100
    useEffect(() => {
        const total = Number(form.balita_total) || 0;
        const stunting = Number(form.balita_stunting) || 0;
        const calc = total > 0 ? parseFloat(((stunting / total) * 100).toFixed(2)) : 0;
        setForm((prev) => ({ ...prev, prevalensi: calc }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.balita_total, form.balita_stunting]);

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
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <Baby className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Data Stunting" : "Tambah Data Stunting"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catatan pemantauan status gizi gizi dan stunting bulanan.
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

                            {/* Left Column: Context / Basic Info */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <MapPin className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Konteks Laporan</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Kelurahan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={String(form.kelurahan_id)}
                                        onChange={(e) => set("kelurahan_id", e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                        disabled={kelurahanOptions.length === 1}
                                    >
                                        <option value="">— Pilih Kelurahan —</option>
                                        {kelurahanOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Tahun <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={Number(form.tahun)}
                                        onChange={(e) => set("tahun", parseInt(e.target.value) || new Date().getFullYear())}
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Bulan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={String(form.bulan)}
                                        onChange={(e) => set("bulan", parseInt(e.target.value))}
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                    >
                                        {bulanOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right Column: Stunting Data */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Activity className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data Sasaran & Kasus</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Balita Sasaran (Total) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={Number(form.balita_total)}
                                            onChange={(e) => set("balita_total", parseInt(e.target.value) || 0)}
                                            min={0}
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Balita Stunting <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={Number(form.balita_stunting)}
                                            onChange={(e) => set("balita_stunting", parseInt(e.target.value) || 0)}
                                            min={0}
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm bg-red-50/30"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Prevalensi (%)
                                            <span className="ml-2 text-[10px] font-normal text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                                                Otomatis
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-semibold pr-10 cursor-not-allowed select-none flex items-center">
                                                {Number(form.prevalensi).toFixed(2)}
                                            </div>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 font-medium">
                                                %
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1.5">
                                            = Jumlah Stunting ÷ Jumlah Balita × 100
                                        </p>
                                    </div>


                                    <div className="sm:col-span-2 mt-2 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Jumlah Gizi Buruk
                                            </label>
                                            <input
                                                type="number"
                                                value={Number(form.balita_gizi_buruk)}
                                                onChange={(e) => set("balita_gizi_buruk", parseInt(e.target.value) || 0)}
                                                min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Jumlah Gizi Kurang
                                            </label>
                                            <input
                                                type="number"
                                                value={Number(form.balita_gizi_kurang)}
                                                onChange={(e) => set("balita_gizi_kurang", parseInt(e.target.value) || 0)}
                                                min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Form Footer */}
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
