"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Accessibility, Users, HandHeart, BarChart3, X, Loader2, Save, PersonStanding, CircleUserRound } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; tahun: number;
    jenis_disabilitas: string; jumlah: number;
    laki_laki: number; perempuan: number;
    usia_anak: number; usia_dewasa: number; usia_lansia: number;
    penerima_bantuan: number;
};

const columns: Column<Row>[] = [
    { key: "kelurahan_nama" as keyof Row, label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "jenis_disabilitas", label: "Jenis Disabilitas", sortable: true,
        render: (v) => <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">{String(v)}</span>
    },
    { key: "jumlah", label: "Total Jiwa", sortable: true, render: (v) => <span className="font-semibold text-gray-900">{Number(v ?? 0).toLocaleString("id-ID")}</span> },
    { key: "laki_laki", label: "Laki-laki", render: (v) => Number(v ?? 0).toLocaleString("id-ID") },
    { key: "perempuan", label: "Perempuan", render: (v) => Number(v ?? 0).toLocaleString("id-ID") },
    { key: "penerima_bantuan", label: "Menerima Bantuan", render: (v) => <span className="text-emerald-600 font-medium">{Number(v ?? 0).toLocaleString("id-ID")}</span> },
];

export default function DisabilitasPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "social_disability" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));
    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach(k => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    // Enrich data with kelurahan name + sort newest first
    const enrichedData = useMemo(() =>
        [...data]
            .sort((a, b) => {
                const da = (a as any).created_at || '';
                const db = (b as any).created_at || '';
                return db.localeCompare(da);
            })
            .map(r => ({
                ...r,
                kelurahan_nama: kelMap.get(r.kelurahan_id) || '-',
            })),
        [data, kelMap]
    );

    // Calculate dynamic stats
    const totalDis = data.reduce((s, r) => s + (r.jumlah || 0), 0);
    const totalBantuan = data.reduce((s, r) => s + (r.penerima_bantuan || 0), 0);
    const prosentaseBantuan = totalDis ? ((totalBantuan / totalDis) * 100).toFixed(1) : "0";

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await update(editRow.id, fd) : await create(fd); setModalOpen(false); setEditRow(null); }
        catch { alert("Gagal menyimpan data disabilitas."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data disabilitas."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Penyandang Disabilitas" description="Database warga difabel per kelurahan untuk rujukan program inklusi sosial."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Sosial", href: "/admin/sosial" }, { label: "Disabilitas" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Entri Data" value={data.length} icon={BarChart3} gradient="stat-gradient-soft-blue" />
                <StatCard label="Penyandang Disabilitas" value={totalDis.toLocaleString("id-ID")} icon={Accessibility} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Menerima Bantuan" value={totalBantuan.toLocaleString("id-ID")} icon={HandHeart} gradient="stat-gradient-soft-amber" />
                <StatCard label="Cakupan Intervensi" value={`${prosentaseBantuan}%`} icon={Users} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Registrasi Identitas" searchPlaceholder="Cari jenis disabilitas/kelurahan..." />

            <DisabilitasFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                message={deleteRow ? `Hapus data disabilitas "${deleteRow.jenis_disabilitas}" tahun ${deleteRow.tahun}?` : undefined} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   DisabilitasFormModal (Blue/Sky/Indigo Theme)
   ═══════════════════════════════════════════════════════ */

function DisabilitasFormModal({
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
        jenis_disabilitas: "Fisik", jumlah: 0,
        laki_laki: 0, perempuan: 0,
        usia_anak: 0, usia_dewasa: 0, usia_lansia: 0,
        penerima_bantuan: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "", tahun: editRow.tahun ?? new Date().getFullYear(),
                jenis_disabilitas: editRow.jenis_disabilitas ?? "Fisik", jumlah: editRow.jumlah ?? 0,
                laki_laki: editRow.laki_laki ?? 0, perempuan: editRow.perempuan ?? 0,
                usia_anak: editRow.usia_anak ?? 0, usia_dewasa: editRow.usia_dewasa ?? 0, usia_lansia: editRow.usia_lansia ?? 0,
                penerima_bantuan: editRow.penerima_bantuan ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "", tahun: new Date().getFullYear(),
                jenis_disabilitas: "Fisik", jumlah: 0,
                laki_laki: 0, perempuan: 0,
                usia_anak: 0, usia_dewasa: 0, usia_lansia: 0,
                penerima_bantuan: 0,
            });
        }
    }, [open, editRow, kelurahanOptions]);

    // Auto-calculate total from gender
    useEffect(() => {
        const l = Number(form.laki_laki) || 0;
        const p = Number(form.perempuan) || 0;
        if (l + p > 0) {
            setForm(prev => ({ ...prev, jumlah: l + p }));
        }
    }, [form.laki_laki, form.perempuan]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    const jenisDisabilitasOptions = ["Fisik", "Intelektual", "Mental", "Sensorik", "Ganda"];

    const totalCalculated = (Number(form.laki_laki) || 0) + (Number(form.perempuan) || 0);

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
                            <Accessibility className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Update Kelompok Disabilitas" : "Kartu Registrasi Identitas Disabilitas"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Masukkan profil demografi penyandang disabilitas berbasis area dan tingkat penerimaan program rehabilitasi.
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

                            {/* Left Column: Identitas & Klasifikasi Gender */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <PersonStanding className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas Wilayah & Gender</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Tahun Data <span className="text-red-500">*</span>
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
                                                Kelurahan <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.kelurahan_id as string) || ""}
                                                onChange={(e) => set("kelurahan_id", e.target.value)}
                                            >
                                                <option value="" disabled>Pilih Kelurahan</option>
                                                {kelurahanOptions.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Kategori Disabilitas <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-blue-50/30"
                                            value={(form.jenis_disabilitas as string) || "Fisik"}
                                            onChange={(e) => set("jenis_disabilitas", e.target.value)}
                                        >
                                            {jenisDisabilitasOptions.map(j => (
                                                <option key={j} value={j}>{j}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
                                        <p className="text-sm font-semibold text-gray-800">Distribusi Berdasarkan Gender</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                                    Laki-laki (Jiwa)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number" min={0}
                                                        className="w-full pl-3 pr-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-blue-900"
                                                        value={(form.laki_laki as number) || 0}
                                                        onChange={(e) => set("laki_laki", Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                                    Perempuan (Jiwa)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number" min={0}
                                                        className="w-full pl-3 pr-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-rose-900"
                                                        value={(form.perempuan as number) || 0}
                                                        onChange={(e) => set("perempuan", Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-500">Total Akumulasi Gender</span>
                                            <span className="text-lg font-bold text-gray-900 px-3 py-1 bg-gray-100 rounded-lg">{totalCalculated}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                                            <span>Target Penerima Bantuan Sosial</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                <HandHeart className="w-5 h-5 text-emerald-500" />
                                            </span>
                                            <input
                                                type="number" min={0}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm text-emerald-700 placeholder:text-gray-300"
                                                placeholder="0"
                                                value={(form.penerima_bantuan as number) || 0}
                                                onChange={(e) => set("penerima_bantuan", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Demografi Usia & Bantuan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <CircleUserRound className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Demografi Usia</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
                                        <p className="text-xs text-indigo-800 font-medium">Klasifikasi Usia Rawan & Dewasa</p>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                    Anak-anak (&lt;18 Tahun)
                                                </label>
                                                <input
                                                    type="number" min={0}
                                                    className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                    value={(form.usia_anak as number) || 0}
                                                    onChange={(e) => set("usia_anak", Number(e.target.value))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                    Usia Produktif Dewasa
                                                </label>
                                                <input
                                                    type="number" min={0}
                                                    className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                    value={(form.usia_dewasa as number) || 0}
                                                    onChange={(e) => set("usia_dewasa", Number(e.target.value))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                    Lansia (&gt;60 Tahun)
                                                </label>
                                                <input
                                                    type="number" min={0}
                                                    className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                    value={(form.usia_lansia as number) || 0}
                                                    onChange={(e) => set("usia_lansia", Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Override master amount  */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Total Keseluruhan (Manual Override)
                                        </label>
                                        <input
                                            type="number" min={0}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all shadow-inner text-gray-500"
                                            value={form.jumlah as number}
                                            onChange={(e) => set("jumlah", Number(e.target.value))}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Hanya ubah manual jika akumulasi Laki-laki + Perempuan tidak valid dengan data lapangan sebenarnya.</p>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Kolom identitas primer wajib
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Update Profil Disabilitas" : "Simpan Profil Entitas Identitas"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
