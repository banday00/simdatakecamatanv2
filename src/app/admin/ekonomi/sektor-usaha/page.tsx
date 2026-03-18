"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Factory, Users, Store, X, Loader2, Save, MapPin, Activity } from "lucide-react";

/* ── Type matching DB table sidakota.econ_business_sectors ──
   Columns: id, tenant_id, kelurahan_id, tahun, sektor, jumlah_usaha, jumlah_tenaga_kerja, created_at
── */
type Row = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    kelurahan_nama?: string;
    tahun: number;
    sektor_id: number;
    sektor?: string; // mapped locally for display
    jumlah_usaha: number;
    jumlah_tenaga_kerja: number;
    created_at?: string;
};

/* ── Sektor badge colors ── */
const SEKTOR_COLORS: Record<string, string> = {
    "Pertanian": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Perdagangan": "bg-amber-50 text-amber-700 border-amber-200",
    "Jasa": "bg-blue-50 text-blue-700 border-blue-200",
    "Industri Makanan": "bg-orange-50 text-orange-700 border-orange-200",
    "Industri Kreatif": "bg-pink-50 text-pink-700 border-pink-200",
    "Manufaktur": "bg-slate-100 text-slate-700 border-slate-200",
    "Pariwisata": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Konstruksi": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Transportasi": "bg-violet-50 text-violet-700 border-violet-200",
    "Lainnya": "bg-gray-50 text-gray-600 border-gray-200",
};

const columns: Column<Row>[] = [
    {
        key: "sektor", label: "Sektor", sortable: true,
        render: (v) => {
            const cls = SEKTOR_COLORS[String(v)] || "bg-indigo-50 text-indigo-700 border-indigo-200";
            return <span className={`inline-flex px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded-md border ${cls}`}>{String(v)}</span>;
        }
    },
    {
        key: "tahun", label: "Tahun", sortable: true,
        render: (v) => <span className="font-medium text-slate-600">{String(v)}</span>
    },
    {
        key: "jumlah_usaha", label: "Unit Usaha", sortable: true,
        render: (v) => <span className="font-semibold text-slate-700">{Number(v ?? 0).toLocaleString("id-ID")}</span>
    },
    {
        key: "jumlah_tenaga_kerja", label: "Tenaga Kerja", sortable: true,
        render: (v) => <span className="font-semibold text-blue-600">{Number(v ?? 0).toLocaleString("id-ID")} org</span>
    },
    {
        key: "kelurahan_nama", label: "Kelurahan", sortable: true,
        render: (v) => <span className="text-gray-500 text-xs">{String(v || "-")}</span>
    },
];

const SEKTOR_OPTIONS = [
    "Pertanian", "Perdagangan", "Jasa", "Industri Makanan", "Industri Kreatif",
    "Manufaktur", "Pariwisata", "Konstruksi", "Transportasi", "Lainnya"
];

export default function SektorUsahaPage() {
    const { kelurahans } = useTenant();
    const { user } = useAuth();
    const isKelurahanAdmin = user?.role === "admin_kelurahan";
    const filterKelurahanId = isKelurahanAdmin ? (user as any)?.kelurahan_id : null;

    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "econ_business_sectors" });
    const [sektorOptionsDynamic, setSektorOptionsDynamic] = useState<{ id: number, nama: string }[]>(
        SEKTOR_OPTIONS.map((nama, idx) => ({ id: idx + 1, nama }))
    );

    useEffect(() => {
        const fetchRef = async () => {
            const supabase = createClient();
            const { data: refData } = await supabase.schema("sidakota").from("ref_lapangan_usaha").select("id, nama").order("id", { ascending: true });
            if (refData && refData.length > 0) {
                setSektorOptionsDynamic(refData);
            }
        };
        fetchRef();
    }, []);

    // Enrich + filter + sort newest first
    const enrichedData = data
        .map(r => ({ 
            ...r, 
            kelurahan_nama: kelurahans.find(k => k.id === r.kelurahan_id)?.nama || "-",
            sektor: sektorOptionsDynamic.find(s => s.id === r.sektor_id)?.nama || "Unknown"
        }))
        .filter(r => !filterKelurahanId || r.kelurahan_id === filterKelurahanId)
        .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter(k => k.id === filterKelurahanId).map(k => ({ label: k.nama, value: k.id }))
        : kelurahans.map(k => ({ label: k.nama, value: k.id }));

    const totalData = enrichedData.length;
    const totalUnit = enrichedData.reduce((s, r) => s + (Number(r.jumlah_usaha) || 0), 0);
    const totalTK = enrichedData.reduce((s, r) => s + (Number(r.jumlah_tenaga_kerja) || 0), 0);

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            editRow ? await update(editRow.id, fd) : await create(fd);
            setModalOpen(false);
            setEditRow(null);
        } catch {
            alert(editRow ? "Gagal memperbarui data sektor usaha." : "Gagal menyimpan data sektor usaha.");
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
            alert("Gagal menghapus data sektor usaha.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Sektor Usaha" description="Kelola penggolongan dan distribusi usaha berdasarkan sektor"
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Ekonomi", href: "/admin/ekonomi" }, { label: "Sektor Usaha" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Entri Sektor" value={totalData.toLocaleString("id-ID")} icon={Factory} gradient="stat-gradient-soft-blue" />
                <StatCard label="Total Unit Usaha" value={totalUnit.toLocaleString("id-ID")} icon={Store} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Serapan Tenaga Kerja" value={`${totalTK.toLocaleString("id-ID")} org`} icon={Users} gradient="stat-gradient-soft-amber" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Tambah Sektor" searchPlaceholder="Cari sektor, kelurahan..." />

            <SektorUsahaFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting}
                isKelurahanAdmin={isKelurahanAdmin} filterKelurahanId={filterKelurahanId}
                sektorOptions={sektorOptionsDynamic} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Data Sektor Usaha?" message={`Yakin ingin menghapus sektor "${deleteRow?.sektor || ""}" tahun ${deleteRow?.tahun || ""}? Data tidak dapat dikembalikan.`} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SektorUsahaFormModal — Blue Theme
   ═══════════════════════════════════════════════════════ */

function SektorUsahaFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId, sektorOptions,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: Row | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
    sektorOptions: { id: number, nama: string }[];
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        tahun: new Date().getFullYear(),
        sektor_id: 1,
        jumlah_usaha: 0,
        jumlah_tenaga_kerja: 0,
    });

    useEffect(() => {
        if (!open) return;
        const defaultSektorId = sektorOptions.length > 0 ? sektorOptions[0].id : 1;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                sektor_id: editRow.sektor_id ?? defaultSektorId,
                jumlah_usaha: editRow.jumlah_usaha ?? 0,
                jumlah_tenaga_kerja: editRow.jumlah_tenaga_kerja ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : (kelurahanOptions[0]?.value || ""),
                tahun: new Date().getFullYear(),
                sektor_id: defaultSektorId,
                jumlah_usaha: 0,
                jumlah_tenaga_kerja: 0,
            });
        }
    }, [open, editRow, kelurahanOptions, isKelurahanAdmin, filterKelurahanId, sektorOptions]);

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
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent — Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Factory className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Sektor Usaha" : "Tambah Sektor Usaha"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat dan analisis dominasi industri maupun UMKM per kelurahan.
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

                            {/* Left Column: Konteks Sektor */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Konteks Sektor & Wilayah</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
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
                                                <option value="" disabled>— Pilih —</option>
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
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Sektor <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.sektor_id as number) || (sektorOptions[0]?.id || 1)}
                                            onChange={(e) => set("sektor_id", Number(e.target.value))}
                                        >
                                            {sektorOptions.map((opt) => (
                                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Agregat & Kapasitas */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <Activity className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Agregat & Kapasitas</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Unit Usaha <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                className="w-full pl-4 pr-16 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.jumlah_usaha as number) || 0}
                                                onChange={(e) => set("jumlah_usaha", Number(e.target.value))}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                                <span className="text-gray-500 text-sm">unit</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Estimasi Tenaga Kerja <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                className="w-full pl-4 pr-16 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.jumlah_tenaga_kerja as number) || 0}
                                                onChange={(e) => set("jumlah_tenaga_kerja", Number(e.target.value))}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                                <span className="text-gray-500 text-sm">orang</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-6">
                                    <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">📌 Tips Pendataan</h4>
                                    <p className="text-sm text-blue-700 leading-relaxed">
                                        Data merupakan agregat per sektor. Contoh: jika wilayah memiliki 200 pedagang kaki lima, catat sebagai sektor &quot;Perdagangan&quot; dengan jumlah 200 unit.
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
                                {isEdit ? "Simpan Perubahan" : "Tambah Sektor"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
