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
    kelurahan_id?: string;
    nama: string;
    jenjang: string;
    status: string;
    npsn: string;
    jumlah_siswa: number;
    jumlah_guru: number;
    jumlah_rombel: number;
    akreditasi: string;
    koordinat_lat: number;
    koordinat_lng: number;
};

const JENJANG_COLORS: Record<string, string> = {
    "PAUD": "bg-pink-100 text-pink-700 border-pink-200",
    "TK": "bg-rose-100 text-rose-700 border-rose-200",
    "SD": "bg-blue-100 text-blue-700 border-blue-200",
    "SMP": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "SMA": "bg-violet-100 text-violet-700 border-violet-200",
    "SMK": "bg-purple-100 text-purple-700 border-purple-200",
};

const columns: Column<FacilityRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "nama", label: "Nama Sekolah", sortable: true },
    {
        key: "jenjang",
        label: "Jenjang",
        sortable: true,
        render: (val) => (
            <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${JENJANG_COLORS[String(val)] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {String(val)}
            </span>
        ),
    },
    {
        key: "status",
        label: "Status",
        render: (val) => {
            const isNegeri = (String(val) || "").toLowerCase() === "negeri";
            return (
                <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${isNegeri ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {String(val)}
                </span>
            );
        },
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
    {
        key: "akreditasi",
        label: "Akreditasi",
        render: (val) => {
            const v = String(val || "Belum");
            const color = v === "A" ? "text-emerald-600 font-bold" : v === "B" ? "text-blue-600 font-bold" : v === "C" ? "text-amber-600 font-bold" : "text-slate-400";
            return <span className={color}>{v}</span>;
        },
    },
];

const JENJANG_OPTIONS = ["PAUD", "TK", "SD", "SMP", "SMA", "SMK"];
const STATUS_OPTIONS = ["Negeri", "Swasta"];
const AKREDITASI_OPTIONS = ["A", "B", "C", "Belum"];

export default function SaranaPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove, isKelurahanAdmin, filterKelurahanId } = useCrud<FacilityRow>({ table: "edu_facilities" });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<FacilityRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<FacilityRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Enrich data with kelurahan_nama
    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    const total = data.length;
    const totalSiswa = data.reduce((s, r) => s + (r.jumlah_siswa || 0), 0);
    const totalGuru = data.reduce((s, r) => s + (r.jumlah_guru || 0), 0);
    const negeri = data.filter((r) => (r.status || "").toLowerCase() === "negeri").length;

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            console.error("[Sarana] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch (err: any) {
            console.error("[Sarana] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
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
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Sarana"
                searchPlaceholder="Cari sekolah..."
            />

            <SaranaFormModal
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
                title="Hapus Sarana Pendidikan"
                message={`Apakah Anda yakin ingin menghapus "${deleteRow?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SaranaFormModal
   ═══════════════════════════════════════════════════════ */

function SaranaFormModal({
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
        npsn: "",
        jenjang: "SD",
        status: "Negeri",
        akreditasi: "Belum",
        jumlah_siswa: 0,
        jumlah_guru: 0,
        jumlah_rombel: 0,
        koordinat_lat: "",
        koordinat_lng: "",
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
                koordinat_lat: editRow.koordinat_lat ?? "",
                koordinat_lng: editRow.koordinat_lng ?? "",
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
                nama: "",
                npsn: "",
                jenjang: "SD",
                status: "Negeri",
                akreditasi: "Belum",
                jumlah_siswa: 0,
                jumlah_guru: 0,
                jumlah_rombel: 0,
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
        // Clean up: send koordinat as number or null
        const submitData = { ...form };
        submitData.koordinat_lat = form.koordinat_lat ? Number(form.koordinat_lat) : null;
        submitData.koordinat_lng = form.koordinat_lng ? Number(form.koordinat_lng) : null;
        onSubmit(submitData);
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
                            <School className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Sarana Pendidikan" : "Tambah Sarana Pendidikan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat informasi legalitas, operasional, dan kapasitas sarana pendidikan.
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

                            {/* Left Column: Identity & Legal */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identitas & Legalitas</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
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

                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Sekolah <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.nama as string) || ""}
                                            onChange={(e) => set("nama", e.target.value)}
                                            placeholder="Contoh: SDN 01 Bogor Utara"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">NPSN</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.npsn as string) || ""}
                                            onChange={(e) => set("npsn", e.target.value)}
                                            placeholder="8 Digit Nomor Pokok"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenjang <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.jenjang as string) || "SD/MI"}
                                            onChange={(e) => set("jenjang", e.target.value)}
                                        >
                                            {JENJANG_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.status as string) || "Negeri"}
                                            onChange={(e) => set("status", e.target.value)}
                                        >
                                            {STATUS_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Akreditasi</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
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

                            {/* Right Column: Capacity & Location */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kapasitas & Lokasi</span>
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
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.jumlah_siswa as number) || 0}
                                            onChange={(e) => set("jumlah_siswa", Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jml Guru</label>
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.jumlah_guru as number) || 0}
                                                onChange={(e) => set("jumlah_guru", Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jml Rombel</label>
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.jumlah_rombel as number) || 0}
                                                onChange={(e) => set("jumlah_rombel", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Latitude</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.koordinat_lat as string | number) ?? ""}
                                                onChange={(e) => set("koordinat_lat", e.target.value)}
                                                placeholder="-6.xxxxxx"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Longitude</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.koordinat_lng as string | number) ?? ""}
                                                onChange={(e) => set("koordinat_lng", e.target.value)}
                                                placeholder="106.xxxxxx"
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
