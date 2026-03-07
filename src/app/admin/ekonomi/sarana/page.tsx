"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Store, Briefcase, TrendingUp, Building2, X, Loader2, Save, Tags, MapPin } from "lucide-react";

type FacilityRow = Record<string, unknown> & {
    id: string;
    nama: string;
    jenis: string;
    jumlah: number;
    status: string;
};

const columns: Column<FacilityRow>[] = [
    { key: "nama", label: "Nama Sarana", sortable: true },
    {
        key: "jenis",
        label: "Jenis",
        sortable: true,
        render: (val) => (
            <span className="inline-flex px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded-md border bg-sky-50 text-sky-700 border-sky-200">
                {String(val)}
            </span>
        ),
    },
    {
        key: "jumlah",
        label: "Jumlah",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    { key: "alamat", label: "Alamat", render: (val) => <span className="text-gray-500">{String(val || "-")}</span> },
    {
        key: "status",
        label: "Status",
        render: (val) => (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${val === "aktif" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {val === "aktif" ? "Aktif" : "Tidak Aktif"}
            </span>
        ),
    },
];

const JENIS_OPTIONS = [
    "Pasar", "Toko/Warung", "Koperasi", "Bank", "BPR", "Minimarket", "Restoran/Rumah Makan", "Hotel/Penginapan"
];

export default function SaranaEkonomiPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<FacilityRow>({ table: "econ_facilities" });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<FacilityRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<FacilityRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    const total = data.length;
    const totalJumlah = data.reduce((s, r) => s + (r.jumlah || 0), 0);
    const pasar = data.filter((r) => r.jenis === "Pasar").length;
    const koperasi = data.filter((r) => r.jenis === "Koperasi").length;

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch { alert("Gagal menyimpan data sarana ekonomi"); }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data sarana"); }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Sarana Ekonomi"
                description="Data pasar, toko, koperasi, dan fasilitas ekonomi lainnya"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Ekonomi", href: "/admin/ekonomi" },
                    { label: "Sarana" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Sarana" value={total} icon={Store} gradient="stat-gradient-soft-blue" />
                <StatCard label="Total Unit" value={totalJumlah.toLocaleString("id-ID")} icon={Building2} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Pasar" value={pasar} icon={TrendingUp} gradient="stat-gradient-soft-amber" />
                <StatCard label="Koperasi" value={koperasi} icon={Briefcase} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable
                columns={columns} data={data} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Sarana" searchPlaceholder="Cari sarana..."
            />

            <SaranaEkonomiFormModal
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
   SaranaEkonomiFormModal
   ═══════════════════════════════════════════════════════ */

function SaranaEkonomiFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: FacilityRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        tahun: new Date().getFullYear(),
        nama: "",
        jenis: "Pasar",
        jumlah: 0,
        alamat: "",
        status: "aktif",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                nama: editRow.nama ?? "",
                jenis: editRow.jenis ?? "Pasar",
                jumlah: editRow.jumlah ?? 0,
                alamat: editRow.alamat ?? "",
                status: editRow.status ?? "aktif",
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "",
                tahun: new Date().getFullYear(),
                nama: "",
                jenis: "Pasar",
                jumlah: 0,
                alamat: "",
                status: "aktif",
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
                {/* Gradient accent - Blue/Sky/Indigo Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-sky-50 text-blue-600">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Sarana Ekonomi" : "Tambah Sarana Ekonomi"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat informasi sarana ekonomi seperti pasar, minimarket, dan UMKM.
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Left Column: Identitas & Kategori */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <Tags className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas & Kategori</span>
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
                                        >
                                            <option value="" disabled>— Pilih Kelurahan —</option>
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
                                            required
                                            type="number"
                                            min={2000}
                                            max={2100}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.tahun as number) || new Date().getFullYear()}
                                            onChange={(e) => set("tahun", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Sarana <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Contoh: Pasar Anyar, Koperasi Jaya"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.nama as string) || ""}
                                            onChange={(e) => set("nama", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jenis Sarana <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.jenis as string) || "Pasar"}
                                            onChange={(e) => set("jenis", e.target.value)}
                                        >
                                            {JENIS_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Lokasi & Operasional */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <MapPin className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Lokasi & Operasional</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Unit / Satuan <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.jumlah as number) || 0}
                                            onChange={(e) => set("jumlah", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Status Operasional <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.status as string) || "aktif"}
                                            onChange={(e) => set("status", e.target.value)}
                                        >
                                            <option value="aktif">Aktif Beroperasi</option>
                                            <option value="tidak_aktif">Tidak Aktif / Tutup</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Alamat Lengkap
                                        </label>
                                        <textarea
                                            rows={4}
                                            placeholder="Tuliskan nama blok, nama jalan, atau detail rute..."
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm resize-none"
                                            value={(form.alamat as string) || ""}
                                            onChange={(e) => set("alamat", e.target.value)}
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
                                {isEdit ? "Simpan Perubahan" : "Tambah Sarana"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
