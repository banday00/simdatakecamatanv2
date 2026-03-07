"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { School, GraduationCap, BookOpen, Building, X, Loader2, Save, FileText, MapPin } from "lucide-react";

type FacilityRow = Record<string, unknown> & {
    id: string;
    nama: string;
    jenjang: string;
    status: string;
    jumlah_siswa: number;
    jumlah_guru: number;
};

const columns: Column<FacilityRow>[] = [
    { key: "nama", label: "Nama Sekolah", sortable: true },
    {
        key: "jenjang",
        label: "Jenjang",
        sortable: true,
        render: (val) => (
            <span className="inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                {String(val)}
            </span>
        ),
    },
    {
        key: "status",
        label: "Status",
        render: (val) => (
            <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${val === "Negeri" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {String(val)}
            </span>
        ),
    },
    {
        key: "jumlah_siswa",
        label: "Siswa",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "jumlah_guru",
        label: "Guru",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    { key: "alamat", label: "Alamat" },
];

const JENJANG_OPTIONS = ["PAUD", "TK", "SD/MI", "SMP/MTs", "SMA/MA", "SMK"];
const STATUS_OPTIONS = ["Negeri", "Swasta"];
const AKREDITASI_OPTIONS = ["A", "B", "C", "Belum"];

export default function SaranaPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<FacilityRow>({ table: "edu_facilities" });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<FacilityRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<FacilityRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    const total = data.length;
    const totalSiswa = data.reduce((s, r) => s + (r.jumlah_siswa || 0), 0);
    const totalGuru = data.reduce((s, r) => s + (r.jumlah_guru || 0), 0);
    const negeri = data.filter((r) => r.status === "Negeri").length;

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch { alert("Gagal menyimpan data sarana pendidikan"); }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data sarana pendidikan"); }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Sarana Pendidikan"
                description="Data sarana pendidikan dari PAUD hingga SMA/SMK"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pendidikan", href: "/admin/pendidikan" },
                    { label: "Sarana" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Sekolah" value={total} icon={School} gradient="stat-gradient-soft-blue" />
                <StatCard label="Total Siswa" value={totalSiswa} icon={GraduationCap} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Total Guru" value={totalGuru} icon={BookOpen} gradient="stat-gradient-soft-indigo" />
                <StatCard label="Sekolah Negeri" value={negeri} icon={Building} gradient="stat-gradient-soft-amber" />
            </div>

            <DataTable
                columns={columns} data={data} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Sarana" searchPlaceholder="Cari sekolah..."
            />

            <SaranaFormModal
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
   SaranaFormModal
   ═══════════════════════════════════════════════════════ */

function SaranaFormModal({
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
        nama: "",
        npsn: "",
        jenjang: "SD/MI",
        status: "Negeri",
        akreditasi: "Belum",
        jumlah_siswa: 0,
        jumlah_guru: 0,
        jumlah_rombel: 0,
        alamat: "",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                npsn: editRow.npsn ?? "",
                jenjang: editRow.jenjang ?? "SD/MI",
                status: editRow.status ?? "Negeri",
                akreditasi: editRow.akreditasi ?? "Belum",
                jumlah_siswa: editRow.jumlah_siswa ?? 0,
                jumlah_guru: editRow.jumlah_guru ?? 0,
                jumlah_rombel: editRow.jumlah_rombel ?? 0,
                alamat: editRow.alamat ?? "",
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "",
                nama: "",
                npsn: "",
                jenjang: "SD/MI",
                status: "Negeri",
                akreditasi: "Belum",
                jumlah_siswa: 0,
                jumlah_guru: 0,
                jumlah_rombel: 0,
                alamat: "",
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
                {/* Gradient accent - Indigo/Violet Theme for Education */}
                <div className="h-1.5 bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600">
                            <School className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Sarana Pendidikan" : "Tambah Sarana Pendidikan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat informasi legalitas, operasional, dan kapasitas sarana pendidikan di kecamatan.
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
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <FileText className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Identitas & Legalitas</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Kelurahan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.kelurahan_id as string) || ""}
                                            onChange={(e) => set("kelurahan_id", e.target.value)}
                                        >
                                            <option value="" disabled>— Pilih Kelurahan —</option>
                                            {kelurahanOptions.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Sekolah <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.nama as string) || ""}
                                            onChange={(e) => set("nama", e.target.value)}
                                            placeholder="Contoh: SDN 01 Bogor Utara"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            NPSN <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.npsn as string) || ""}
                                            onChange={(e) => set("npsn", e.target.value)}
                                            placeholder="8 Digit Nomor Pokok"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jenjang
                                        </label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.jenjang as string) || "SD/MI"}
                                            onChange={(e) => set("jenjang", e.target.value)}
                                        >
                                            {JENJANG_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Status Pendidikan
                                        </label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.status as string) || "Negeri"}
                                            onChange={(e) => set("status", e.target.value)}
                                        >
                                            {STATUS_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Akreditasi
                                        </label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.akreditasi as string) || "Belum"}
                                            onChange={(e) => set("akreditasi", e.target.value)}
                                        >
                                            {AKREDITASI_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Key Indicators */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <MapPin className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Lokasi & Kapasitas</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Siswa <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            value={(form.jumlah_siswa as number) || 0}
                                            onChange={(e) => set("jumlah_siswa", Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Jml Guru <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                value={(form.jumlah_guru as number) || 0}
                                                onChange={(e) => set("jumlah_guru", Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Jml Rombel <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                value={(form.jumlah_rombel as number) || 0}
                                                onChange={(e) => set("jumlah_rombel", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Alamat Lengkap
                                        </label>
                                        <textarea
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm resize-none"
                                            value={(form.alamat as string) || ""}
                                            onChange={(e) => set("alamat", e.target.value)}
                                            placeholder="Alamat sekolah..."
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
