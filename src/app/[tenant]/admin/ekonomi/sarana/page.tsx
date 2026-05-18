"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Store, Briefcase, TrendingUp, Building2, X, Loader2, Save, Tags, MapPin } from "lucide-react";

/* ── Types ── */
type RefJenisSarana = {
    id: number;
    nama: string;
    urut: number;
    aktif: boolean;
};

type FacilityRow = {
    id: string;
    tenant_id?: string;
    kelurahan_id?: string;
    kelurahan_nama?: string;
    nama: string;
    jenis_id?: number | null; // FK → ref_ekonomi_sarana
    jenis_nama?: string;    // resolved from join
    alamat?: string;
    koordinat_lat?: number;
    koordinat_lng?: number;
    created_at?: string;
    [key: string]: unknown;
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
        key: "jenis_nama",
        label: "Jenis",
        sortable: true,
        render: (val) => {
            const label = String(val || "-");
            const cls = JENIS_COLORS[label] || "bg-slate-50 text-slate-700 border-slate-200";
            return (
                <span className={`inline-flex px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded-md border ${cls}`}>
                    {label}
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

export default function SaranaEkonomiPage() {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();
    const isKelurahanAdmin = profile?.role === "admin_kelurahan";
    const filterKelurahanId = isKelurahanAdmin ? profile?.kelurahan_id ?? null : null;

    const [rawData, setRawData] = useState<FacilityRow[]>([]);
    const [jenisOptions, setJenisOptions] = useState<RefJenisSarana[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/ekonomi/sarana`);
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal memuat sarana ekonomi");
            }
            setRawData(json.data?.rows || []);
            setJenisOptions(json.data?.refs?.jenisSarana || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal memuat sarana ekonomi";
            setError(message);
            console.error("[SaranaEkonomi] fetchData:", err);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Enrich with kelurahan_nama + filter
    const enrichedData = rawData
        .map(r => ({
            ...r,
            kelurahan_nama: kelurahans.find(k => k.id === r.kelurahan_id)?.nama || "-",
            jenis_nama: jenisOptions.find(j => j.id === Number(r.jenis_id))?.nama || "-",
        }));

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<FacilityRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<FacilityRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter(k => k.id === filterKelurahanId).map(k => ({ label: k.nama, value: k.id }))
        : kelurahans.map(k => ({ label: k.nama, value: k.id }));

    // Stats
    const total = enrichedData.length;
    const jenisCount = enrichedData.reduce((acc, r) => {
        const j = r.jenis_nama || "Lainnya";
        acc[j] = (acc[j] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const pasar = jenisCount["Pasar"] || 0;
    const toko = jenisCount["Toko/Warung"] || 0;
    const koperasi = jenisCount["Koperasi"] || 0;

    async function handleSubmit(formData: Record<string, unknown>) {
        if (!tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                jenis_id: Number(formData.jenis_id) || null,
            };

            const url = editRow
                ? `/api/tenants/${tenant.slug}/admin/ekonomi/sarana/${editRow.id}`
                : `/api/tenants/${tenant.slug}/admin/ekonomi/sarana`;
            const res = await fetch(url, {
                method: editRow ? "PATCH" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menyimpan sarana ekonomi");
            }
            setModalOpen(false);
            setEditRow(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : editRow ? "Gagal memperbarui data sarana ekonomi." : "Gagal menyimpan data sarana ekonomi.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/ekonomi/sarana/${deleteRow.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menghapus sarana ekonomi");
            }
            setDeleteRow(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menghapus data sarana ekonomi.");
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
                <StatCard size="sm" label="Total Sarana" value={total} icon={Store} gradient="stat-gradient-soft-blue" />
                <StatCard size="sm" label="Pasar" value={pasar} icon={Building2} gradient="stat-gradient-soft-emerald" />
                <StatCard size="sm" label="Toko/Warung" value={toko} icon={TrendingUp} gradient="stat-gradient-soft-amber" />
                <StatCard size="sm" label="Koperasi" value={koperasi} icon={Briefcase} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable
                columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Sarana" searchPlaceholder="Cari nama sarana, jenis..."
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <SaranaEkonomiFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahanOptions={kelurahanOptions}
                isKelurahanAdmin={isKelurahanAdmin}
                filterKelurahanId={filterKelurahanId}
                jenisOptions={jenisOptions}
            />

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                isDeleting={isSubmitting}
                title="Hapus Sarana Ekonomi?"
                message={`Yakin ingin menghapus "${deleteRow?.nama || ""}"? Data tidak dapat dikembalikan.`}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SaranaEkonomiFormModal — Blue Theme
   ═══════════════════════════════════════════════════════ */
function SaranaEkonomiFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId, jenisOptions,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: FacilityRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
    jenisOptions: RefJenisSarana[];
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        nama: "",
        jenis_id: "",
        alamat: "",
    });

    useEffect(() => {
        if (!open) return;
        const firstJenisId = jenisOptions[0]?.id ?? "";
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                jenis_id: editRow.jenis_id ?? jenisOptions.find(j => j.nama === editRow.jenis)?.id ?? firstJenisId,
                alamat: editRow.alamat ?? "",
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : (kelurahanOptions[0]?.value || ""),
                nama: "",
                jenis_id: firstJenisId,
                alamat: "",
            });
        }
    }, [open, editRow, kelurahanOptions, isKelurahanAdmin, filterKelurahanId, jenisOptions]);

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

                            {/* Left Column */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <Tags className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas &amp; Kategori</span>
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
                                            value={(form.jenis_id as number | string) || ""}
                                            onChange={(e) => set("jenis_id", Number(e.target.value))}
                                        >
                                            <option value="" disabled>— Pilih Jenis Sarana —</option>
                                            {jenisOptions.map((opt) => (
                                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
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

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                    <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">📌 Tips Pendataan</h4>
                                    <p className="text-sm text-blue-700 leading-relaxed">
                                        Pastikan nama sarana diisi dengan jelas dan lengkap agar mudah dicari. Alamat bersifat opsional, namun sangat disarankan untuk diisi demi kemudahan pemetaan.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
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
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
