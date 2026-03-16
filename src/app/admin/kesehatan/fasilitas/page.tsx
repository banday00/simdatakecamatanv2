"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Hospital, AlertTriangle, Heart, Stethoscope, X, Loader2, Save, MapPin, Activity } from "lucide-react";

type FasilitasRow = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    nama: string;
    jenis: string;
    alamat: string | null;
    penanggung_jawab: string | null;
    jumlah_tenaga_medis: number | null;
    koordinat_lat: number | null;
    koordinat_lng: number | null;
};

const columns: Column<FasilitasRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "nama", label: "Nama Fasilitas", sortable: true },
    {
        key: "jenis",
        label: "Jenis",
        sortable: true,
        render: (val) => (
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                {String(val)}
            </span>
        ),
    },
    { key: "alamat", label: "Alamat" },
    { key: "penanggung_jawab", label: "Penanggung Jawab" },
    {
        key: "jumlah_tenaga_medis",
        label: "Tenaga Medis",
        sortable: true,
        render: (val) => <span className="font-medium">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
];

const jenisOptions = [
    { label: "Rumah Sakit", value: "Rumah Sakit" },
    { label: "Puskesmas", value: "Puskesmas" },
    { label: "Puskesmas Pembantu", value: "Puskesmas Pembantu" },
    { label: "Klinik", value: "Klinik" },
    { label: "Posyandu", value: "Posyandu" },
    { label: "Apotek", value: "Apotek" },
    { label: "Bidan Praktek", value: "Bidan Praktek" },
    { label: "Praktek Dokter", value: "Praktek Dokter" },
    { label: "Bidan", value: "Bidan" },
    { label: "Lainnya", value: "Lainnya" },
];

export default function FasilitasKesehatanPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove, isKelurahanAdmin, filterKelurahanId } = useCrud<FasilitasRow>({ table: "health_facilities" });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<FasilitasRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<FasilitasRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Restrict kelurahan options for admin_kelurahan
    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Enrich data with kelurahan name for display in table
    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    const totalFasilitas = data.length;
    const totalTenagaMedis = data.reduce((s, r) => s + (Number(r.jumlah_tenaga_medis) || 0), 0);
    const puskesmas = data.filter((r) => r.jenis === "Puskesmas").length;
    const rs = data.filter((r) => r.jenis === "Rumah Sakit").length;

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            console.error("[Fasilitas] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch (err: any) {
            console.error("[Fasilitas] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Fasilitas Kesehatan"
                description="Data rumah sakit, puskesmas, klinik, dan fasilitas kesehatan lainnya"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kesehatan", href: "/admin/kesehatan" },
                    { label: "Fasilitas" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Fasilitas" value={totalFasilitas} icon={Hospital} gradient="stat-gradient-blue" />
                <StatCard label="Tenaga Medis" value={totalTenagaMedis} icon={Heart} gradient="stat-gradient-emerald" />
                <StatCard label="Puskesmas" value={puskesmas} icon={Stethoscope} gradient="stat-gradient-amber" />
                <StatCard label="Rumah Sakit" value={rs} icon={AlertTriangle} gradient="stat-gradient-rose" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Fasilitas"
                searchPlaceholder="Cari fasilitas..."
            />

            <FasilitasFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahanOptions={kelurahanOptions}
                isKelurahanAdmin={isKelurahanAdmin}
                filterKelurahanId={filterKelurahanId}
            />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete}
                title="Hapus Fasilitas"
                message={`Apakah Anda yakin ingin menghapus "${deleteRow?.nama}"?`}
                isDeleting={isSubmitting} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   FasilitasFormModal
   ═══════════════════════════════════════════════════════ */

function FasilitasFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: FasilitasRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        nama: "",
        jenis: "Rumah Sakit",
        alamat: "",
        penanggung_jawab: "",
        jumlah_tenaga_medis: 0,
        koordinat_lat: "",
        koordinat_lng: "",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                jenis: editRow.jenis ?? "Rumah Sakit",
                alamat: editRow.alamat ?? "",
                penanggung_jawab: editRow.penanggung_jawab ?? "",
                jumlah_tenaga_medis: editRow.jumlah_tenaga_medis ?? 0,
                koordinat_lat: editRow.koordinat_lat ?? "",
                koordinat_lng: editRow.koordinat_lng ?? "",
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
                nama: "",
                jenis: "Rumah Sakit",
                alamat: "",
                penanggung_jawab: "",
                jumlah_tenaga_medis: 0,
                koordinat_lat: "",
                koordinat_lng: "",
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
                className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <Hospital className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Fasilitas Kesehatan" : "Tambah Fasilitas Kesehatan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Lengkapi data fasilitas pelayanan medis dan kesehatan warga
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
                                    <MapPin className="w-4 h-4 text-primary-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi Dasar</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Kelurahan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={String(form.kelurahan_id)}
                                        onChange={(e) => set("kelurahan_id", e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
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
                                        Nama Fasilitas <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={String(form.nama)}
                                        onChange={(e) => set("nama", e.target.value)}
                                        required
                                        placeholder="RS/Puskesmas/Klinik"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Jenis Fasilitas <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={String(form.jenis)}
                                        onChange={(e) => set("jenis", e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                    >
                                        {jenisOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Alamat
                                    </label>
                                    <textarea
                                        value={String(form.alamat || "")}
                                        onChange={(e) => set("alamat", e.target.value)}
                                        rows={3}
                                        placeholder="Alamat lengkap fasilitas..."
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm resize-none"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Details & Capacity */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Activity className="w-4 h-4 text-primary-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detail Data Lanjutan</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Penanggung Jawab
                                        </label>
                                        <input
                                            type="text"
                                            value={String(form.penanggung_jawab || "")}
                                            onChange={(e) => set("penanggung_jawab", e.target.value)}
                                            placeholder="Nama penanggung jawab"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Tenaga Medis
                                        </label>
                                        <input
                                            type="number"
                                            value={Number(form.jumlah_tenaga_medis)}
                                            onChange={(e) => set("jumlah_tenaga_medis", parseInt(e.target.value) || 0)}
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Koordinat Latitude
                                        </label>
                                        <input
                                            type="text"
                                            value={String(form.koordinat_lat || "")}
                                            onChange={(e) => set("koordinat_lat", e.target.value)}
                                            placeholder="Contoh: -6.175392"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Koordinat Longitude
                                        </label>
                                        <input
                                            type="text"
                                            value={String(form.koordinat_lng || "")}
                                            onChange={(e) => set("koordinat_lng", e.target.value)}
                                            placeholder="Contoh: 106.827153"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                        />
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
                                {isEdit ? "Simpan Perubahan" : "Tambah Fasilitas"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
