"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Droplets, Trash2, BarChart3, Home, X, Loader2, Save, Leaf, MapPin } from "lucide-react";

/* ── DB schema: infra_sanitation ──
   id, tenant_id, kelurahan_id, tahun, akses_air_bersih_persen,
   akses_sanitasi_persen, rumah_kumuh, tps_jumlah, created_at
*/

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; tahun: number;
    akses_air_bersih_persen: number; akses_sanitasi_persen: number;
    tps_jumlah: number; rumah_kumuh: number;
};

export default function SanitasiPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "infra_sanitation" });
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

    // Enrich + sort newest first
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

    // Stats
    const avgAir = data.length ? (data.reduce((s, r) => s + (r.akses_air_bersih_persen || 0), 0) / data.length).toFixed(1) : "0";
    const avgSanitasi = data.length ? (data.reduce((s, r) => s + (r.akses_sanitasi_persen || 0), 0) / data.length).toFixed(1) : "0";
    const totalTPS = data.reduce((s, r) => s + (r.tps_jumlah || 0), 0);
    const totalRumahKumuh = data.reduce((s, r) => s + (r.rumah_kumuh || 0), 0);

    const columns: Column<Row>[] = [
        {
            key: "kelurahan_nama" as any, label: "Kelurahan", sortable: true,
            render: (v) => <span className="text-sm font-medium text-gray-700">{String(v)}</span>
        },
        { key: "tahun", label: "Tahun", sortable: true },
        {
            key: "akses_air_bersih_persen", label: "Air Bersih (%)", sortable: true,
            render: (v) => <span className="font-medium text-blue-600">{Number(v ?? 0).toFixed(1)}%</span>
        },
        {
            key: "akses_sanitasi_persen", label: "Sanitasi (%)", sortable: true,
            render: (v) => <span className="font-medium text-emerald-600">{Number(v ?? 0).toFixed(1)}%</span>
        },
        { key: "tps_jumlah", label: "TPS", sortable: true },
        {
            key: "rumah_kumuh", label: "Rumah Kumuh", sortable: true,
            render: (v) => {
                const val = Number(v ?? 0);
                const cls = val > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700";
                return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>{val}</span>;
            }
        },
    ];

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            editRow ? await update(editRow.id, fd) : await create(fd);
            setModalOpen(false); setEditRow(null);
        } catch { alert("Gagal menyimpan data sanitasi."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data sanitasi."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Sanitasi & Lingkungan" description="Data cakupan air bersih, sanitasi layak, pengelolaan sampah, dan pemetaan kawasan kumuh."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Infrastruktur", href: "/admin/infrastruktur" }, { label: "Sanitasi" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Cakupan Air Bersih" value={`${avgAir}%`} icon={Droplets} gradient="stat-gradient-soft-blue" />
                <StatCard label="Sanitasi Layak" value={`${avgSanitasi}%`} icon={BarChart3} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Infrastruktur TPS" value={totalTPS} icon={Trash2} gradient="stat-gradient-soft-amber" />
                <StatCard label="Rumah Kumuh" value={totalRumahKumuh} icon={Home} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Catat Data Baru" searchPlaceholder="Cari data kelurahan atau tahun..." />

            <SanitasiFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm
                open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Data Sanitasi?"
                message={deleteRow ? `Yakin ingin menghapus data sanitasi kelurahan tahun ${deleteRow.tahun}? Data yang dihapus tidak bisa dikembalikan.` : ""}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SanitasiFormModal (Blue Theme)
   ═══════════════════════════════════════════════════════ */

function SanitasiFormModal({
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
        akses_air_bersih_persen: 0, akses_sanitasi_persen: 0,
        tps_jumlah: 0, rumah_kumuh: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                akses_air_bersih_persen: editRow.akses_air_bersih_persen ?? 0,
                akses_sanitasi_persen: editRow.akses_sanitasi_persen ?? 0,
                tps_jumlah: editRow.tps_jumlah ?? 0,
                rumah_kumuh: editRow.rumah_kumuh ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "",
                tahun: new Date().getFullYear(),
                akses_air_bersih_persen: 0, akses_sanitasi_persen: 0,
                tps_jumlah: 0, rumah_kumuh: 0,
            });
        }
    }, [open, editRow, kelurahanOptions]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            ...form,
            akses_air_bersih_persen: Number(form.akses_air_bersih_persen),
            akses_sanitasi_persen: Number(form.akses_sanitasi_persen),
            tps_jumlah: Number(form.tps_jumlah),
            rumah_kumuh: Number(form.rumah_kumuh),
            tahun: Number(form.tahun),
        };
        onSubmit(payload);
    }

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Leaf className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Data Sanitasi" : "Catat Data Sanitasi Baru"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Data cakupan air bersih, sanitasi, TPS, dan kawasan kumuh per kelurahan.
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
                        <div className="space-y-6">

                            {/* Section: Identitas */}
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas & Periode</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Kelurahan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.kelurahan_id as string) || ""}
                                        onChange={(e) => set("kelurahan_id", e.target.value)}
                                    >
                                        <option value="" disabled>Pilih Kelurahan</option>
                                        {kelurahanOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Tahun Data <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required type="number" min={2000} max={2100}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.tahun as number) || new Date().getFullYear()}
                                        onChange={(e) => set("tahun", Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Section: Cakupan */}
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-100 mt-2">
                                <Droplets className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Cakupan Air & Sanitasi</span>
                            </div>

                            {/* Akses Air Bersih Slider */}
                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-semibold text-blue-900">
                                        Cakupan Akses Air Bersih
                                    </label>
                                    <span className="text-xs font-bold px-2 py-1 bg-white text-blue-700 border border-blue-200 rounded-md">
                                        {String(form.akses_air_bersih_persen)}%
                                    </span>
                                </div>
                                <input
                                    type="range" min="0" max="100" step="0.1"
                                    className="w-full h-2 mt-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    value={(form.akses_air_bersih_persen as number) || 0}
                                    onChange={(e) => set("akses_air_bersih_persen", Number(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-blue-600/70 mt-1.5 font-medium px-1 uppercase">
                                    <span>Rendah (0%)</span>
                                    <span>Merata (100%)</span>
                                </div>
                            </div>

                            {/* Akses Sanitasi Layak Slider */}
                            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-semibold text-emerald-900">
                                        Cakupan Sanitasi Layak
                                    </label>
                                    <span className="text-xs font-bold px-2 py-1 bg-white text-emerald-700 border border-emerald-200 rounded-md">
                                        {String(form.akses_sanitasi_persen)}%
                                    </span>
                                </div>
                                <input
                                    type="range" min="0" max="100" step="0.1"
                                    className="w-full h-2 mt-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={(form.akses_sanitasi_persen as number) || 0}
                                    onChange={(e) => set("akses_sanitasi_persen", Number(e.target.value))}
                                />
                            </div>

                            {/* Section: TPS & Kumuh */}
                            <div className="flex items-center gap-2 pb-2 border-b border-indigo-100 mt-2">
                                <Home className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Sampah & Kawasan Kumuh</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Jumlah TPS <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required type="number" min={0}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.tps_jumlah as number) || 0}
                                        onChange={(e) => set("tps_jumlah", Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Rumah Kumuh
                                    </label>
                                    <input
                                        type="number" min={0}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.rumah_kumuh as number) || 0}
                                        onChange={(e) => set("rumah_kumuh", Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                                <Droplets className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    Data sanitasi dikumpulkan berdasarkan standar SDGs target 6.1 (air bersih universal) dan 6.2 (sanitasi layak). 
                                    Cakupan 100% berarti seluruh rumah tangga di kelurahan sudah memiliki akses.
                                </p>
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Simpan Perubahan" : "Simpan Data"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
