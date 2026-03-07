"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Building2, CheckCircle2, Users, X, Loader2, Save, MapPin } from "lucide-react";

type LembagaRow = Record<string, unknown> & {
    id: string;
    kelurahan_id: string;
    nama: string;
    jenis: string;
    ketua: string | null;
    jumlah_anggota: number;
    status: string;
};

const columns: Column<LembagaRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "nama", label: "Nama Lembaga", sortable: true },
    { key: "jenis", label: "Jenis", sortable: true },
    { key: "ketua", label: "Ketua" },
    {
        key: "jumlah_anggota",
        label: "Anggota",
        sortable: true,
        render: (val) => <span className="font-medium">{String(val ?? 0)}</span>,
    },
    {
        key: "status",
        label: "Status",
        render: (val) => (
            <span
                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${val === "aktif"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                    }`}
            >
                {String(val ?? "aktif")}
            </span>
        ),
    },
];

const jenisOptions = [
    { label: "RT", value: "RT" },
    { label: "RW", value: "RW" },
    { label: "PKK", value: "PKK" },
    { label: "Karang Taruna", value: "Karang Taruna" },
    { label: "LPM", value: "LPM" },
    { label: "Posyandu", value: "Posyandu" },
    { label: "Majelis Taklim", value: "Majelis Taklim" },
    { label: "Lainnya", value: "Lainnya" },
];

export default function LembagaPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove, isKelurahanAdmin, filterKelurahanId } = useCrud<LembagaRow>({
        table: "gov_institutions",
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<LembagaRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<LembagaRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Restrict kelurahan options for admin_kelurahan
    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    const totalAktif = data.filter((r) => r.status === "aktif").length;
    const totalAnggota = data.reduce((s, r) => s + (r.jumlah_anggota || 0), 0);

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) {
                await update(editRow.id, formData);
            } else {
                await create(formData);
            }
            setModalOpen(false);
            setEditRow(null);
        } catch {
            alert("Gagal menyimpan data");
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
            alert("Gagal menghapus data");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Lembaga Kemasyarakatan"
                description="Data lembaga dan organisasi kemasyarakatan di wilayah kelurahan"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pemerintahan", href: "/admin/pemerintahan" },
                    { label: "Lembaga" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Lembaga" value={data.length} icon={Building2} gradient="stat-gradient-blue" />
                <StatCard label="Lembaga Aktif" value={totalAktif} icon={CheckCircle2} gradient="stat-gradient-emerald" />
                <StatCard label="Total Anggota" value={totalAnggota.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-amber" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Lembaga"
                searchPlaceholder="Cari lembaga..."
            />

            <LembagaFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahanOptions={kelurahanOptions}
                defaultKelurahanId={filterKelurahanId || ""}
                isKelurahanAdmin={isKelurahanAdmin}
            />

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                title="Hapus Lembaga"
                message={`Apakah Anda yakin ingin menghapus "${deleteRow?.nama}"?`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   LembagaFormModal
   ═══════════════════════════════════════════════════════ */

function LembagaFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, defaultKelurahanId, isKelurahanAdmin,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: LembagaRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    defaultKelurahanId: string;
    isKelurahanAdmin: boolean;
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        nama: "",
        jenis: "RT", // default
        ketua: "",
        jumlah_anggota: 0,
        status: "aktif",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                jenis: editRow.jenis ?? "RT",
                ketua: editRow.ketua ?? "",
                jumlah_anggota: editRow.jumlah_anggota ?? 0,
                status: editRow.status ?? "aktif",
            });
        } else {
            setForm({
                kelurahan_id: isKelurahanAdmin ? defaultKelurahanId : "",
                nama: "",
                jenis: "RT",
                ketua: "",
                jumlah_anggota: 0,
                status: "aktif",
            });
        }
    }, [open, editRow, defaultKelurahanId, isKelurahanAdmin]);

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
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Lembaga" : "Tambah Lembaga"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Lengkapi informasi organisasi kemasyarakatan di bawah ini
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
                                        Nama Lembaga <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={String(form.nama)}
                                        onChange={(e) => set("nama", e.target.value)}
                                        required
                                        placeholder="Contoh: RT 01 RW 02"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Jenis Lembaga <span className="text-red-500">*</span>
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
                            </div>

                            {/* Right Column: Organization Details */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Users className="w-4 h-4 text-primary-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detail Organisasi</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Nama Ketua
                                    </label>
                                    <input
                                        type="text"
                                        value={String(form.ketua || "")}
                                        onChange={(e) => set("ketua", e.target.value)}
                                        placeholder="Nama lengkap ketua"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Anggota/Pengurus
                                        </label>
                                        <input
                                            type="number"
                                            value={Number(form.jumlah_anggota)}
                                            onChange={(e) => set("jumlah_anggota", parseInt(e.target.value) || 0)}
                                            min={0}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Status Aktif <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={String(form.status)}
                                            onChange={(e) => set("status", e.target.value)}
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                                        >
                                            <option value="aktif">🟢 Aktif</option>
                                            <option value="tidak_aktif">⚪ Tidak Aktif</option>
                                        </select>
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
                                {isEdit ? "Simpan Perubahan" : "Tambah Lembaga"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
