"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Droplets, Trash2, Trees, BarChart3, X, Loader2, Save, Leaf, ShieldAlert } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; tahun: number;
    akses_air_bersih_pct: number; akses_sanitasi_layak_pct: number;
    jumlah_tps: number; volume_sampah_m3: number;
    jumlah_rw_kumuh: number; luas_kawasan_kumuh_ha: number;
    saluran_drainase_km: number; ruang_terbuka_hijau_ha: number;
};

const columns: Column<Row>[] = [
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "akses_air_bersih_pct", label: "Air Bersih (%)", sortable: true,
        render: (v) => <span className="font-medium text-teal-600">{Number(v ?? 0).toFixed(1)}%</span>
    },
    {
        key: "akses_sanitasi_layak_pct", label: "Sanitasi Layak (%)", sortable: true,
        render: (v) => <span className="font-medium text-emerald-600">{Number(v ?? 0).toFixed(1)}%</span>
    },
    { key: "jumlah_tps", label: "TPS", sortable: true },
    { key: "volume_sampah_m3", label: "Sampah (m³)", render: (v) => Number(v ?? 0).toLocaleString("id-ID") },
    { key: "saluran_drainase_km", label: "Drainase (km)", render: (v) => Number(v ?? 0).toFixed(1) },
    { key: "ruang_terbuka_hijau_ha", label: "RTH (ha)", render: (v) => Number(v ?? 0).toFixed(1) },
];

export default function SanitasiPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "infra_sanitation" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    const avgAir = data.length ? (data.reduce((s, r) => s + (r.akses_air_bersih_pct || 0), 0) / data.length).toFixed(1) : "0";
    const avgSanitasi = data.length ? (data.reduce((s, r) => s + (r.akses_sanitasi_layak_pct || 0), 0) / data.length).toFixed(1) : "0";
    const totalTPS = data.reduce((s, r) => s + (r.jumlah_tps || 0), 0);
    const totalRTH = data.reduce((s, r) => s + (r.ruang_terbuka_hijau_ha || 0), 0);

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await update(editRow.id, fd) : await create(fd); setModalOpen(false); setEditRow(null); }
        catch { alert("Gagal menyimpan data sanitasi."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data sanitasi."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Sanitasi & Lingkungan" description="Data kualitas pasokan air bersih, pengelolaan sampah, cakupan sanitasi warga, dan ruang terbuka hijau."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Infrastruktur", href: "/admin/infrastruktur" }, { label: "Sanitasi" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Cakupan Air Bersih" value={`${avgAir}%`} icon={Droplets} gradient="stat-gradient-soft-blue" />
                <StatCard label="Sanitasi Layak" value={`${avgSanitasi}%`} icon={BarChart3} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Infrastruktur TPS" value={totalTPS} icon={Trash2} gradient="stat-gradient-soft-amber" />
                <StatCard label="Ruang Terbuka Hijau" value={`${totalRTH.toFixed(1)} ha`} icon={Trees} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={data} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Catat Data Baru" searchPlaceholder="Cari observasi tahun/kelurahan..." />

            <SanitasiFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SanitasiFormModal (Teal/Emerald/Cyan Theme)
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
        akses_air_bersih_pct: 0, akses_sanitasi_layak_pct: 0,
        jumlah_tps: 0, volume_sampah_m3: 0,
        jumlah_rw_kumuh: 0, luas_kawasan_kumuh_ha: 0,
        saluran_drainase_km: 0, ruang_terbuka_hijau_ha: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "", tahun: editRow.tahun ?? new Date().getFullYear(),
                akses_air_bersih_pct: editRow.akses_air_bersih_pct ?? 0, akses_sanitasi_layak_pct: editRow.akses_sanitasi_layak_pct ?? 0,
                jumlah_tps: editRow.jumlah_tps ?? 0, volume_sampah_m3: editRow.volume_sampah_m3 ?? 0,
                jumlah_rw_kumuh: editRow.jumlah_rw_kumuh ?? 0, luas_kawasan_kumuh_ha: editRow.luas_kawasan_kumuh_ha ?? 0,
                saluran_drainase_km: editRow.saluran_drainase_km ?? 0, ruang_terbuka_hijau_ha: editRow.ruang_terbuka_hijau_ha ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "", tahun: new Date().getFullYear(),
                akses_air_bersih_pct: 0, akses_sanitasi_layak_pct: 0,
                jumlah_tps: 0, volume_sampah_m3: 0,
                jumlah_rw_kumuh: 0, luas_kawasan_kumuh_ha: 0,
                saluran_drainase_km: 0, ruang_terbuka_hijau_ha: 0,
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
                {/* Gradient accent - Sky/Blue/Indigo Theme per user request */}
                <div className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Leaf className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Update Data Sanitasi & Lingkungan" : "Catat Data Sanitasi & Lingkungan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Masukkan log kualitas penyediaan air bersih, pembuangan akhir, serta tata ruang ekologis kelurahan.
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

                            {/* Left Column: Identitas & Dasar Lingkungan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-teal-100">
                                    <Droplets className="w-4 h-4 text-teal-500" />
                                    <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Identitas & Akses Dasar</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Tahun Data <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required type="number" min={2000} max={2100}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
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
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
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

                                    {/* Akses Air Bersih Slider */}
                                    <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="block text-sm font-semibold text-teal-900">
                                                Cakupan Akses Air Bersih
                                            </label>
                                            <span className="text-xs font-bold px-2 py-1 bg-white text-teal-700 border border-teal-200 rounded-md">
                                                {String(form.akses_air_bersih_pct)}%
                                            </span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100" step="0.1"
                                            className="w-full h-2 mt-2 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                            value={(form.akses_air_bersih_pct as number) || 0}
                                            onChange={(e) => set("akses_air_bersih_pct", Number(e.target.value))}
                                        />
                                        <div className="flex justify-between text-[10px] text-teal-600/70 mt-1.5 font-medium px-1 uppercase">
                                            <span>Rendah</span>
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
                                                {String(form.akses_sanitasi_layak_pct)}%
                                            </span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100" step="0.1"
                                            className="w-full h-2 mt-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                            value={(form.akses_sanitasi_layak_pct as number) || 0}
                                            onChange={(e) => set("akses_sanitasi_layak_pct", Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Jumlah TPS <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required type="number" min={0}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
                                                value={(form.jumlah_tps as number) || 0}
                                                onChange={(e) => set("jumlah_tps", Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Vol. Sampah (m³)/Bulan
                                            </label>
                                            <input
                                                type="number" min={0} step="0.1"
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
                                                value={(form.volume_sampah_m3 as number) || 0}
                                                onChange={(e) => set("volume_sampah_m3", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Kawasan Kumuh & Tata Ruang */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-cyan-100">
                                    <ShieldAlert className="w-4 h-4 text-cyan-600" />
                                    <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Kawasan Kumuh & Tata Ruang</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 space-y-4">
                                        <p className="text-xs text-orange-800 font-medium">Catatan Pemetaan Lingkungan Kumuh</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                    Jumlah RW Kumuh
                                                </label>
                                                <input
                                                    type="number" min={0}
                                                    className="w-full px-4 py-2 bg-white border border-orange-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                                    value={(form.jumlah_rw_kumuh as number) || 0}
                                                    onChange={(e) => set("jumlah_rw_kumuh", Number(e.target.value))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                    Luas Area Kumuh (ha)
                                                </label>
                                                <input
                                                    type="number" min={0} step="0.1"
                                                    className="w-full px-4 py-2 bg-white border border-orange-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                                    value={(form.luas_kawasan_kumuh_ha as number) || 0}
                                                    onChange={(e) => set("luas_kawasan_kumuh_ha", Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Saluran Drainase (km)
                                            </label>
                                            <input
                                                type="number" min={0} step="0.1"
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm"
                                                value={(form.saluran_drainase_km as number) || 0}
                                                onChange={(e) => set("saluran_drainase_km", Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Ruang Terbuka Hijau (ha)
                                            </label>
                                            <input
                                                type="number" min={0} step="0.1"
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm"
                                                value={(form.ruang_terbuka_hijau_ha as number) || 0}
                                                onChange={(e) => set("ruang_terbuka_hijau_ha", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 rounded-xl bg-cyan-50/50 border border-cyan-100 flex items-start gap-3">
                                        <Trees className="w-5 h-5 text-cyan-600 mt-0.5 shrink-0" />
                                        <p className="text-xs text-cyan-800 leading-relaxed">
                                            Berdasarkan tata ruang kota modern, disarankan alokasi profil drainase mencakup minim 10% dan ketersediaan kawasan Ruang Terbuka Hijau seluas 30% dari geometri area.
                                        </p>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Wajib diisi parameter vital
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
                                {isEdit ? "Update Kapasitas & Evaluasi" : "Simpan Arsip Lingkungan"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
