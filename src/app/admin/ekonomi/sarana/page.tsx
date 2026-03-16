"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Store, Briefcase, TrendingUp, Building2, X, Loader2, Save, Tags, MapPin } from "lucide-react";

/* ── Type matching DB table sidakota.econ_facilities ──
   Columns: id, tenant_id, kelurahan_id, nama, jenis, alamat, koordinat_lat, koordinat_lng, created_at
── */
type FacilityRow = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    kelurahan_nama?: string;
    nama: string;
    jenis: string;
    alamat: string;
    koordinat_lat?: number;
    koordinat_lng?: number;
    created_at?: string;
};

/* ── Jenis badge colors ── */
const JENIS_COLORS: Record<string, string> = {
    "Pasar": "bg-amber-50 text-amber-700 border-amber-200",
    "Toko/Warung": "bg-blue-50 text-blue-700 border-blue-200",
    "Koperasi": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Bank": "bg-indigo-50 text-indigo-700 border-indigo-200",
    "BPR": "bg-violet-50 text-violet-700 border-violet-200",
    "Minimarket": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Restoran/Rumah Makan": "bg-rose-50 text-rose-700 border-rose-200",
    "Hotel/Penginapan": "bg-teal-50 text-teal-700 border-teal-200",
};

const columns: Column<FacilityRow>[] = [
    { key: "nama", label: "Nama Sarana", sortable: true },
    {
        key: "jenis",
        label: "Jenis",
        sortable: true,
        render: (val) => {
            const cls = JENIS_COLORS[String(val)] || "bg-slate-50 text-slate-700 border-slate-200";
            return (
                <span className={`inline-flex px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded-md border ${cls}`}>
                    {String(val)}
                </span>
            );
        },
    },
    {
        key: "alamat",
        label: "Alamat",
        render: (val) => <span className="text-gray-500 text-sm">{String(val || "-")}</span>,
    },
    {
        key: "kelurahan_nama",
        label: "Kelurahan",
        sortable: true,
        render: (val) => <span className="text-gray-500 text-xs">{String(val || "-")}</span>,
    },
];

const JENIS_OPTIONS = [
    "Pasar", "Toko/Warung", "Koperasi", "Bank", "BPR", "Minimarket", "Restoran/Rumah Makan", "Hotel/Penginapan"
];

export default function SaranaEkonomiPage() {
    const { kelurahans } = useTenant();
    const { user } = useAuth();
    const isKelurahanAdmin = user?.role === "admin_kelurahan";
    const filterKelurahanId = isKelurahanAdmin ? (user as any)?.kelurahan_id : null;

    const { data, isLoading, create, update, remove } = useCrud<FacilityRow>({ table: "econ_facilities" });

    // Enrich data with kelurahan_nama + filter for admin_kelurahan
    const enrichedData = data
        .map(r => ({ ...r, kelurahan_nama: kelurahans.find(k => k.id === r.kelurahan_id)?.nama || "-" }))
        .filter(r => !filterKelurahanId || r.kelurahan_id === filterKelurahanId);

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<FacilityRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<FacilityRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter(k => k.id === filterKelurahanId).map(k => ({ label: k.nama, value: k.id }))
        : kelurahans.map(k => ({ label: k.nama, value: k.id }));

    // Stat calculations based on actual DB columns
    const total = enrichedData.length;
    const jenisCount = enrichedData.reduce((acc, r) => {
        const j = r.jenis || "Lainnya";
        acc[j] = (acc[j] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const pasar = jenisCount["Pasar"] || 0;
    const toko = jenisCount["Toko/Warung"] || 0;
    const koperasi = jenisCount["Koperasi"] || 0;

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch {
            alert(editRow ? "Gagal memperbarui data sarana ekonomi." : "Gagal menyimpan data sarana ekonomi.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try {
            await remove(deleteRow.id);
            setDeleteRow(null);
        } catch {
            alert("Gagal menghapus data sarana ekonomi.");
        } finally {
            setIsSubmitting(false);
        }
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
                <StatCard label="Pasar" value={pasar} icon={Building2} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Toko/Warung" value={toko} icon={TrendingUp} gradient="stat-gradient-soft-amber" />
                <StatCard label="Koperasi" value={koperasi} icon={Briefcase} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable
                columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Sarana" searchPlaceholder="Cari nama sarana, jenis..."
            />

            <SaranaEkonomiFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahanOptions={kelurahanOptions}
                isKelurahanAdmin={isKelurahanAdmin}
                filterKelurahanId={filterKelurahanId}
            />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Sarana Ekonomi?" message={`Yakin ingin menghapus "${deleteRow?.nama || ""}"? Data tidak dapat dikembalikan.`} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SaranaEkonomiFormModal — Blue Theme
   DB columns: kelurahan_id, nama, jenis, alamat
   ═══════════════════════════════════════════════════════ */

function SaranaEkonomiFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: FacilityRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        nama: "",
        jenis: "Pasar",
        alamat: "",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                jenis: editRow.jenis ?? "Pasar",
                alamat: editRow.alamat ?? "",
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : (kelurahanOptions[0]?.value || ""),
                nama: "",
                jenis: "Pasar",
                alamat: "",
            });
        }
    }, [open, editRow, kelurahanOptions, isKelurahanAdmin, filterKelurahanId]);

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
                className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent — Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Sarana Ekonomi" : "Tambah Sarana Ekonomi"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat informasi sarana ekonomi seperti pasar, toko, koperasi, dan lainnya.
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
                                            disabled={isKelurahanAdmin}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
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
                                            Nama Sarana <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Contoh: Pasar Anyar, Koperasi Jaya..."
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

                            {/* Right Column: Lokasi */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <MapPin className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Lokasi</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Alamat Lengkap
                                        </label>
                                        <textarea
                                            rows={4}
                                            placeholder="Tuliskan nama jalan, blok, RT/RW, atau detail lokasi..."
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                                            value={(form.alamat as string) || ""}
                                            onChange={(e) => set("alamat", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-2">
                                    <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">📌 Tips Pendataan</h4>
                                    <p className="text-sm text-blue-700 leading-relaxed">
                                        Pastikan nama sarana diisi dengan jelas dan lengkap agar mudah dicari. Alamat bersifat opsional, namun sangat disarankan untuk diisi demi kemudahan pemetaan.
                                    </p>
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
