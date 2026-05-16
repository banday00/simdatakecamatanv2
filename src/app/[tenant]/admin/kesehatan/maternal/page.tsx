"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Baby, Activity, HeartPulse, Stethoscope, Save, X, Loader2, Calendar, MapPin } from "lucide-react";

type MaternalRow = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    tahun: number;
    ibu_hamil: number;
    ibu_bersalin: number;
    bayi_lahir_hidup: number;
    kematian_ibu: number;
    kematian_bayi: number;
    kb_aktif: number;
};

const columns: Column<MaternalRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "ibu_hamil",
        label: "Ibu Hamil",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "ibu_bersalin",
        label: "Ibu Bersalin",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "bayi_lahir_hidup",
        label: "Bayi Lahir",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "kematian_ibu",
        label: "Kematian Ibu",
        sortable: true,
        render: (val) => {
            const v = Number(val ?? 0);
            return <span className={`font-medium ${v > 0 ? "text-red-600" : "text-slate-400"}`}>{v.toLocaleString("id-ID")}</span>;
        },
    },
    {
        key: "kematian_bayi",
        label: "Kematian Bayi",
        sortable: true,
        render: (val) => {
            const v = Number(val ?? 0);
            return <span className={`font-medium ${v > 0 ? "text-red-600" : "text-slate-400"}`}>{v.toLocaleString("id-ID")}</span>;
        },
    },
    {
        key: "kb_aktif",
        label: "KB Aktif",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
];

const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function MaternalAdminPage() {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();

    const [data, setData] = useState<MaternalRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<MaternalRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<MaternalRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isKelurahanAdmin = profile?.role === "admin_kelurahan";
    const filterKelurahanId = isKelurahanAdmin ? profile?.kelurahan_id ?? null : null;

    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/kesehatan/maternal`);
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal memuat data KIA");
            }
            setData(json.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal memuat data KIA";
            setError(message);
            console.error("[Maternal] fetchData:", err);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Enrich data with kelurahan_nama
    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    const totalIbuHamil = data.reduce((acc, curr) => acc + (curr.ibu_hamil || 0), 0);
    const totalIbuBersalin = data.reduce((acc, curr) => acc + (curr.ibu_bersalin || 0), 0);
    const totalBayiLahir = data.reduce((acc, curr) => acc + (curr.bayi_lahir_hidup || 0), 0);
    const totalKB = data.reduce((acc, curr) => acc + (curr.kb_aktif || 0), 0);

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (!tenant?.slug) throw new Error("Tenant belum tersedia.");
            const url = editRow
                ? `/api/tenants/${tenant.slug}/admin/kesehatan/maternal/${editRow.id}`
                : `/api/tenants/${tenant.slug}/admin/kesehatan/maternal`;
            const res = await fetch(url, {
                method: editRow ? "PATCH" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(formData),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menyimpan data KIA");
            }
            await fetchData();
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            console.error("[Maternal] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/kesehatan/maternal/${deleteRow.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menghapus data KIA");
            }
            await fetchData();
            setDeleteRow(null);
        }
        catch (err: any) {
            console.error("[Maternal] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Kesehatan Ibu & Anak (KIA)"
                description="Pemantauan persalinan, kehamilan, dan akseptor KB"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kesehatan", href: "/admin/kesehatan" },
                    { label: "Ibu & Anak" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Ibu Hamil" value={totalIbuHamil} icon={HeartPulse} gradient="stat-gradient-soft-amber" />
                <StatCard label="Total Ibu Bersalin" value={totalIbuBersalin} icon={Activity} gradient="stat-gradient-soft-blue" />
                <StatCard label="Bayi Lahir Hidup" value={totalBayiLahir} icon={Baby} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Akseptor KB Aktif" value={totalKB} icon={Stethoscope} gradient="stat-gradient-soft-indigo" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Data"
                searchPlaceholder="Cari data berdasarkan tahun..."
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <MaternalFormModal
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
                title="Hapus Data Ibu & Anak"
                message={`Apakah Anda yakin ingin menghapus data tahun ${deleteRow?.tahun}? Tindakan ini tidak dapat dibatalkan.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   MaternalFormModal
   ═══════════════════════════════════════════════════════ */

function MaternalFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: MaternalRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        tahun: new Date().getFullYear(),
        ibu_hamil: 0,
        ibu_bersalin: 0,
        bayi_lahir_hidup: 0,
        kematian_ibu: 0,
        kematian_bayi: 0,
        kb_aktif: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                ibu_hamil: editRow.ibu_hamil ?? 0,
                ibu_bersalin: editRow.ibu_bersalin ?? 0,
                bayi_lahir_hidup: editRow.bayi_lahir_hidup ?? 0,
                kematian_ibu: editRow.kematian_ibu ?? 0,
                kematian_bayi: editRow.kematian_bayi ?? 0,
                kb_aktif: editRow.kb_aktif ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
                tahun: new Date().getFullYear(),
                ibu_hamil: 0,
                ibu_bersalin: 0,
                bayi_lahir_hidup: 0,
                kematian_ibu: 0,
                kematian_bayi: 0,
                kb_aktif: 0,
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
                {/* Gradient accent - Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <Baby className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Data Ibu & Anak" : "Tambah Data Ibu & Anak"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Masukkan indikator cakupan pelayanan kesehatan maternal dan akseptor KB.
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
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Konteks Laporan</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Kelurahan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.kelurahan_id as string) || ""}
                                        onChange={(e) => set("kelurahan_id", e.target.value)}
                                        disabled={kelurahanOptions.length === 1}
                                    >
                                        <option value="" disabled>— Pilih Kelurahan —</option>
                                        {kelurahanOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Tahun <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.tahun as number) || new Date().getFullYear()}
                                        onChange={(e) => set("tahun", Number(e.target.value))}
                                    >
                                        {availableYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right Column: Key Indicators */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Indikator Pelayanan</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Ibu Hamil <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.ibu_hamil as number) || 0}
                                            onChange={(e) => set("ibu_hamil", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Ibu Bersalin <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.ibu_bersalin as number) || 0}
                                            onChange={(e) => set("ibu_bersalin", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Bayi Lahir Hidup <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.bayi_lahir_hidup as number) || 0}
                                            onChange={(e) => set("bayi_lahir_hidup", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Akseptor KB Aktif <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.kb_aktif as number) || 0}
                                            onChange={(e) => set("kb_aktif", Number(e.target.value))}
                                        />
                                    </div>

                                    {/* Kematian Section */}
                                    <div className="sm:col-span-2 mt-2 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Kematian Ibu
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm bg-red-50/30"
                                                value={(form.kematian_ibu as number) || 0}
                                                onChange={(e) => set("kematian_ibu", Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Kematian Bayi
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm bg-red-50/30"
                                                value={(form.kematian_bayi as number) || 0}
                                                onChange={(e) => set("kematian_bayi", Number(e.target.value))}
                                            />
                                        </div>
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
