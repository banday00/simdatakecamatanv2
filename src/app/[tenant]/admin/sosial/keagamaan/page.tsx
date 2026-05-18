"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAdminSosialResource } from "../use-admin-sosial-resource";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Church, MapPin, BarChart3, Building, X, Loader2, Save, MapPinned, Settings2 } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; jenis: string; nama: string; alamat: string;
    kapasitas: number; kondisi: string; tahun_berdiri: number; tahun_data: number;
    status_tanah: string;
};

const columns: Column<Row>[] = [
    { key: "nama", label: "Nama Tempat Ibadah", sortable: true },
    {
        key: "jenis", label: "Kategori", sortable: true,
        render: (v) => <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">{String(v)}</span>
    },
    { key: "kelurahan_nama" as keyof Row, label: "Kelurahan", sortable: true },
    { key: "kapasitas", label: "Kapasitas Jamaah", render: (v) => v ? <span className="font-medium text-gray-900">{Number(v).toLocaleString("id-ID")}</span> : "—" },
    {
        key: "kondisi", label: "Kondisi Fisik", render: (v) => {
            const c: Record<string, string> = { Baik: "bg-emerald-100 text-emerald-700 border-emerald-200", Sedang: "bg-amber-100 text-amber-700 border-amber-200", Rusak: "bg-rose-100 text-rose-700 border-rose-200" };
            return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${c[String(v)] || c.Baik}`}>{String(v ?? "Baik")}</span>;
        }
    },
    { key: "tahun_berdiri", label: "Tahun Berdiri" },
];

export default function KeagamaanPage() {
    const { data, isLoading, error, kelurahanOptions, kelMap, createRow, updateRow, deleteRow: deleteData } =
        useAdminSosialResource<Row>("keagamaan", "data tempat ibadah");
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const masjid = data.filter((r) => r.jenis === "Masjid" || r.jenis === "Musholla").length;
    const gereja = data.filter((r) => r.jenis === "Gereja").length;
    const totalKelurahan = new Set(data.map((r) => r.kelurahan_id)).size;

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await updateRow(editRow.id, fd) : await createRow(fd); setModalOpen(false); setEditRow(null); }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menyimpan data tempat ibadah."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await deleteData(deleteRow.id); setDeleteRow(null); }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menghapus tempat ibadah."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Sarana Tempat Ibadah" description="Basis data inventarisasi tempat ibadah dan fasilitas keagamaan wilayah."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Sosial", href: "/admin/sosial" }, { label: "Keagamaan" }]} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard size="sm" label="Total Sarana Ibadah" value={data.length} icon={Church} gradient="stat-gradient-soft-blue" />
                <StatCard size="sm" label="Masjid & Musholla" value={masjid} icon={Building} gradient="stat-gradient-soft-emerald" />
                <StatCard size="sm" label="Gereja" value={gereja} icon={MapPin} gradient="stat-gradient-soft-amber" />
                <StatCard size="sm" label="Cakupan Kelurahan" value={totalKelurahan} icon={BarChart3} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Registrasi Baru" searchPlaceholder="Cari nama/kelurahan..." />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <KeagamaanFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                message={deleteRow ? `Hapus data "${deleteRow.nama}" (${deleteRow.jenis})?` : undefined} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   KeagamaanFormModal (Blue/Sky/Indigo Theme)
   ═══════════════════════════════════════════════════════ */

function KeagamaanFormModal({
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
        kelurahan_id: "", tahun_data: new Date().getFullYear(),
        jenis: "Masjid", nama: "", alamat: "",
        kapasitas: 0, kondisi: "Baik", tahun_berdiri: new Date().getFullYear() - 10,
        status_tanah: "Wakaf",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "", tahun_data: editRow.tahun_data ?? new Date().getFullYear(),
                jenis: editRow.jenis ?? "Masjid", nama: editRow.nama ?? "", alamat: editRow.alamat ?? "",
                kapasitas: editRow.kapasitas ?? 0, kondisi: editRow.kondisi ?? "Baik", tahun_berdiri: editRow.tahun_berdiri ?? new Date().getFullYear(),
                status_tanah: editRow.status_tanah ?? "Wakaf",
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "", tahun_data: new Date().getFullYear(),
                jenis: "Masjid", nama: "", alamat: "",
                kapasitas: 0, kondisi: "Baik", tahun_berdiri: new Date().getFullYear(),
                status_tanah: "Wakaf",
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

    const jenisOptions = ["Masjid", "Musholla", "Gereja", "Pura", "Vihara", "Klenteng"];
    const statusTanahOptions = [{ label: "Tanah Wakaf", value: "Wakaf" }, { label: "Milik Sendiri / Yayasan", value: "Milik" }, { label: "Pinjam Pakai", value: "Pinjam" }, { label: "Status Lainnya", value: "Lainnya" }];
    const kondisiOptions = [
        { value: "Baik", label: "Layak & Baik", icon: "✅", activeClass: "border-emerald-500 bg-emerald-50 text-emerald-800", inactiveClass: "border-gray-200 hover:border-emerald-200 text-gray-500" },
        { value: "Sedang", label: "Rusak Ringan", icon: "⚠️", activeClass: "border-amber-500 bg-amber-50 text-amber-800", inactiveClass: "border-gray-200 hover:border-amber-200 text-gray-500" },
        { value: "Rusak", label: "Rusak Parah", icon: "🚨", activeClass: "border-rose-500 bg-rose-50 text-rose-800", inactiveClass: "border-gray-200 hover:border-rose-200 text-gray-500" },
    ];

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
                            <Church className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Update Tempat Ibadah" : "Registrasi Sarana Tempat Ibadah"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat dan pantau kondisi kelayakan operasional sarana pra-sarana keagamaan.
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

                            {/* Left Column: Identitas Utama */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <MapPinned className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas & Lokasi Administratif</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Tahun Pembukuan <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required type="number" min={2000} max={2100}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.tahun_data as number) || new Date().getFullYear()}
                                                onChange={(e) => set("tahun_data", Number(e.target.value))}
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
                                            Kategori Sarana Ibadah <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full px-4 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-blue-900 appearance-none"
                                                value={(form.jenis as string) || "Masjid"}
                                                onChange={(e) => set("jenis", e.target.value)}
                                            >
                                                <option value="" disabled>Pilih Kategori</option>
                                                {jenisOptions.map(j => (
                                                    <option key={j} value={j}>{j}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-blue-500">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Kelengkapan/Bangunan <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required type="text"
                                            placeholder="Contoh: Masjid At-Taqwa / Gereja Tiberias"
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.nama as string) || ""}
                                            onChange={(e) => set("nama", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Catatan Alamat Spesifik Lokasi
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Jln, RT/RW, Blok, Patokan"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                                            value={(form.alamat as string) || ""}
                                            onChange={(e) => set("alamat", e.target.value)}
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Kapasitas & Status Kepemilikan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <Settings2 className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Fasilitas, Tahun & Legalitas Status</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Estimasi Kapasitas Jamaah
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number" min={0}
                                                    className="w-full pl-4 pr-12 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                    value={(form.kapasitas as number) || 0}
                                                    onChange={(e) => set("kapasitas", Number(e.target.value))}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">Jiwa</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Pembangunan/Operasional
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number" min={1800} max={new Date().getFullYear()}
                                                    className="w-full pl-4 pr-12 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                    value={(form.tahun_berdiri as number) || 0}
                                                    onChange={(e) => set("tahun_berdiri", Number(e.target.value))}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">Tahun</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Status Legalitas Tanah/Aset
                                        </label>
                                        <select
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.status_tanah as string) || "Wakaf"}
                                            onChange={(e) => set("status_tanah", e.target.value)}
                                        >
                                            {statusTanahOptions.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Radio Cards for Condition */}
                                    <div className="pt-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Status Kondisi Bangunan Gedung
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {kondisiOptions.map((k) => {
                                                const isActive = form.kondisi === k.value;
                                                return (
                                                    <button
                                                        key={k.value} type="button"
                                                        onClick={() => set("kondisi", k.value)}
                                                        className={`relative flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 transition-all ${isActive ? k.activeClass : k.inactiveClass}`}
                                                    >
                                                        <span className="text-xl sm:text-2xl mb-1.5 block">{k.icon}</span>
                                                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-center">{k.label}</span>
                                                        {isActive && (
                                                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-current" />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Wajib dilengkapi
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
                                {isEdit ? "Update Registrasi Aset" : "Simpan Arsip Keagamaan"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
