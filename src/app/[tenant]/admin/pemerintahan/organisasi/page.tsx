"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
    UserCog,
    Users,
    Building2,
    X,
    Loader2,
    Save,
    Image as ImageIcon,
    UserCircle,
    CheckCircle2,
    AlertCircle,
    MapPin,
    BadgeInfo
} from "lucide-react";

type OrgRow = Record<string, unknown> & {
    id: string;
    kelurahan_id: string | null;
    jabatan: string;
    nama_pejabat: string;
    nip: string | null;
    urutan: number;
    is_active: boolean;
    foto: string | null;
};

type OrgForm = {
    kelurahan_id: string;
    jabatan: string;
    nama_pejabat: string;
    nip: string;
    urutan: number;
    is_active: boolean;
    foto?: string;
    foto_file?: File | null;
};

const emptyForm: OrgForm = {
    kelurahan_id: "",
    jabatan: "",
    nama_pejabat: "",
    nip: "",
    urutan: 1,
    is_active: true,
    foto: "",
    foto_file: null,
};

const UPLOAD_BASE_URL = (process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || "/uploads").replace(/\/$/, "");

function buildFotoUrl(value: string | null | undefined) {
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("blob:") || value.startsWith("data:") || value.startsWith("/")) {
        return value;
    }
    if (value.includes("/")) {
        return `${UPLOAD_BASE_URL}/${value}`;
    }
    return `${UPLOAD_BASE_URL}/gov-profiles/${value}`;
}

function getApiErrorMessage(result: unknown, fallback: string) {
    const error = (result as { error?: unknown })?.error;
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
        return (error as { message: string }).message;
    }
    return fallback;
}

const columns: Column<OrgRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "jabatan", label: "Jabatan", sortable: true },
    {
        key: "foto",
        label: "Foto",
        render: (val, row) => (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                {val ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={buildFotoUrl(String(val)) ?? ""}
                        alt={row.nama_pejabat}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                    />
                ) : null}
                <UserCircle className={`w-6 h-6 text-gray-400 ${val ? 'hidden' : ''}`} />
            </div>
        )
    },
    { key: "nama_pejabat", label: "Nama Pejabat", sortable: true },
    { key: "nip", label: "NIP" },
    {
        key: "urutan",
        label: "Urutan",
        sortable: true,
        render: (val) => (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">
                {String(val ?? 0)}
            </span>
        ),
    },
    {
        key: "is_active",
        label: "Status",
        render: (val) => (
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${val ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"}`}>
                {val ? "Aktif" : "Nonaktif"}
            </span>
        ),
    },
];

/* ── Toast Component ── */

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className="fixed top-6 right-6 z-[60] animate-fade-in">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium ${type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                {message}
                <button onClick={onClose} className="ml-2 p-0.5 hover:bg-black/5 rounded"><X className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

/* ── Form Modal Component ── */

function OrganisasiFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, tenantNama, isKelurahanAdmin, filterKelurahanId
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: OrgForm) => Promise<void>;
    editRow: OrgRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    tenantNama: string;
    isKelurahanAdmin: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;
    const [form, setForm] = useState<OrgForm>(emptyForm);
    const [previewFoto, setPreviewFoto] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                jabatan: editRow.jabatan ?? "",
                nama_pejabat: editRow.nama_pejabat ?? "",
                nip: editRow.nip ?? "",
                urutan: editRow.urutan ?? 1,
                is_active: editRow.is_active ?? true,
                foto: editRow.foto ?? "",
                foto_file: null,
            });
            // Construct preview URL if foto exists (assuming absolute/relative handling will be done by UI)
            setPreviewFoto(editRow.foto || null);
        } else {
            setForm({
                ...emptyForm,
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
            });
            setPreviewFoto(null);
        }
    }, [open, editRow, isKelurahanAdmin, filterKelurahanId]);

    function set(field: keyof OrgForm, value: string | number | boolean | File | null) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Ukuran foto maksimal 2MB");
                return;
            }
            set("foto_file", file);
            setPreviewFoto(URL.createObjectURL(file));
        }
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />

            <div
                className="relative w-full max-w-4xl mx-4 my-8 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600">
                            <UserCog className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit" : "Tambah"} Pejabat Pemerintahan
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Lengkapi informasi profil pejabat kelembagaan.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Tutup">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleFormSubmit} className="flex flex-col overflow-hidden">
                    <div className="px-8 py-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column: Data Wilayah & Jabatan */}
                            <div className="space-y-5">
                                <SectionLabel icon={MapPin} label="Konteks Wilayah" />

                                <FormField label="Kelurahan Pimpinan/Pejabat" hint="Pilih kecamatan untuk tingkat kecamatan.">
                                    <select
                                        value={form.kelurahan_id}
                                        onChange={(e) => set("kelurahan_id", e.target.value)}
                                        className="form-input"
                                        disabled={kelurahanOptions.length === 1}
                                    >
                                        {kelurahanOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </FormField>

                                <div className="pt-2">
                                    <SectionLabel icon={BadgeInfo} label="Jabatan & Posisi" />
                                </div>

                                <FormField label="Jabatan" required hint="Contoh: Camat, Lurah, Sekretaris Kecamatan">
                                    <input
                                        type="text"
                                        value={form.jabatan}
                                        onChange={(e) => set("jabatan", e.target.value)}
                                        required
                                        placeholder="Tuliskan nama jabatan"
                                        className="form-input"
                                    />
                                </FormField>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Urutan Tampil" required hint="Nomor 1 untuk Pimpinan">
                                        <input
                                            type="number"
                                            value={form.urutan}
                                            onChange={(e) => set("urutan", Number(e.target.value))}
                                            required min={1}
                                            className="form-input"
                                        />
                                    </FormField>

                                    <FormField label="Status" required>
                                        <select
                                            value={form.is_active ? "true" : "false"}
                                            onChange={(e) => set("is_active", e.target.value === "true")}
                                            className="form-input"
                                        >
                                            <option value="true">Aktif</option>
                                            <option value="false">Nonaktif</option>
                                        </select>
                                    </FormField>
                                </div>
                                <p className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded-lg mt-2 border border-indigo-100 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    <span>Pimpinan (Camat/Lurah) otomatis dirender pada dashboard jika urutan = 1.</span>
                                </p>
                            </div>

                            {/* Right Column: Profil Pejabat */}
                            <div className="space-y-5">
                                <SectionLabel icon={UserCircle} label="Informasi Pribadi" />

                                <FormField label="Nama Lengkap Pejabat" required>
                                    <input
                                        type="text"
                                        value={form.nama_pejabat}
                                        onChange={(e) => set("nama_pejabat", e.target.value)}
                                        required
                                        placeholder="Sertakan gelar jika ada"
                                        className="form-input"
                                    />
                                </FormField>

                                <FormField label="NIP" hint="Nomor Induk Pegawai (opsional jika bukan ASN)">
                                    <input
                                        type="text"
                                        value={form.nip}
                                        onChange={(e) => set("nip", e.target.value)}
                                        placeholder="Contoh: 198001012010011001"
                                        className="form-input font-mono"
                                    />
                                </FormField>

                                <div className="pt-2">
                                    <SectionLabel icon={ImageIcon} label="Foto Resmi" />
                                </div>

                                <FormField label="Upload Foto">
                                    <div className="flex items-center gap-6 mt-1">
                                        <div className="w-24 h-32 shrink-0 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                                            {previewFoto ? (
                                                <>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={buildFotoUrl(previewFoto) ?? ""}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover relative z-10"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                                                    />
                                                    <ImageIcon className="w-8 h-8 text-gray-300 absolute z-0" />
                                                </>
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 hover:border-indigo-300 transition-colors">
                                                <span>Pilih File Foto</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleFotoChange}
                                                />
                                            </label>
                                            <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                                                Format: JPG, PNG, WEBP. Maks 2MB<br />Rasio disarankan: 3:4 (Portrait)
                                            </p>
                                        </div>
                                    </div>
                                </FormField>

                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-8 py-4 border-t border-gray-100 shrink-0 bg-gray-50/80">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Wajib diisi
                        </p>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Simpan Perubahan" : `Tambah Pejabat`}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
    return (
        <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <Icon className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
    );
}

function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
            {children}
        </div>
    );
}

/* ── Main Page Component ── */

export default function OrganisasiPage() {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();
    const [data, setData] = useState<OrgRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<OrgRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<OrgRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const isKelurahanAdmin = profile?.role === "admin_kelurahan" && !!profile?.kelurahan_id;
    const filterKelurahanId = isKelurahanAdmin ? profile?.kelurahan_id ?? null : null;

    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/tenants/${tenant.slug}/admin/pemerintahan/organisasi`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(getApiErrorMessage(result, "Gagal memuat data organisasi."));
            }
            setData((result.data as OrgRow[]) || []);
        } catch (error) {
            setToast({ message: error instanceof Error ? error.message : "Gagal memuat data organisasi.", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Kelurahan dropdown options: for kelAdmin show only own kelurahan, else show all + kecamatan option
    const finalKelurahanOpts = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : [{ label: "— Kecamatan (Umum) —", value: "" }, ...kelurahans.map((k) => ({ label: k.nama, value: k.id }))];


    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: row.kelurahan_id
            ? kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—"
            : "Kecamatan",
    }));

    const uniqueJabatan = new Set(data.map((r) => r.jabatan)).size;

    async function uploadFoto(file: File) {
        if (!tenant?.slug) {
            throw new Error("Tenant belum tersedia.");
        }

        const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const fileName = `pejabat-${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const path = `${tenant.slug}/gov-profiles/${fileName}`;
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("path", path);

        const response = await fetch("/api/uploads", {
            method: "POST",
            body: uploadForm,
        });
        const result = await response.json();
        if (!response.ok || result.error) {
            throw new Error(getApiErrorMessage(result, "Gagal mengunggah foto."));
        }

        return String(result.data?.path || result.data?.publicUrl || path);
    }

    async function create(payload: Record<string, unknown>) {
        if (!tenant?.slug) throw new Error("Tenant belum tersedia.");
        const response = await fetch(`/api/tenants/${tenant.slug}/admin/pemerintahan/organisasi`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || result.error) {
            throw new Error(getApiErrorMessage(result, "Gagal menambah data pejabat."));
        }
    }

    async function update(id: string, payload: Record<string, unknown>) {
        if (!tenant?.slug) throw new Error("Tenant belum tersedia.");
        const response = await fetch(`/api/tenants/${tenant.slug}/admin/pemerintahan/organisasi/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || result.error) {
            throw new Error(getApiErrorMessage(result, "Gagal memperbarui data pejabat."));
        }
    }

    async function remove(id: string) {
        if (!tenant?.slug) throw new Error("Tenant belum tersedia.");
        const response = await fetch(`/api/tenants/${tenant.slug}/admin/pemerintahan/organisasi/${id}`, {
            method: "DELETE",
        });
        const result = await response.json();
        if (!response.ok || result.error) {
            throw new Error(getApiErrorMessage(result, "Gagal menghapus data pejabat."));
        }
    }

    async function handleSubmit(formData: OrgForm) {
        setIsSubmitting(true);
        try {
            let finalFotoUrl = formData.foto;

            // Handle file upload if present
            if (formData.foto_file) {
                finalFotoUrl = await uploadFoto(formData.foto_file);
            }

            // Prepare payload
            const payload: Record<string, unknown> = {
                kelurahan_id: formData.kelurahan_id || null,
                jabatan: formData.jabatan,
                nama_pejabat: formData.nama_pejabat,
                nip: formData.nip || null,
                urutan: formData.urutan,
                is_active: formData.is_active,
                foto: finalFotoUrl || null,
            };

            if (editRow) {
                await update(editRow.id, payload);
                setToast({ message: "Data pejabat berhasil diperbarui", type: "success" });
            } else {
                await create(payload);
                setToast({ message: "Data pejabat berhasil ditambahkan", type: "success" });
            }

            setModalOpen(false);
            setEditRow(null);
            await fetchData(); // await so loading state is correct
        } catch (error: any) {
            setToast({ message: `Gagal menyimpan data: ${error.message || 'Silakan coba lagi'}`, type: "error" });
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
            setToast({ message: "Data pejabat berhasil dihapus", type: "success" });
            await fetchData();
        } catch (err: any) {
            console.error("[Organisasi] handleDelete:", err);
            setToast({ message: `Gagal menghapus data: ${err?.message || 'Silakan coba lagi'}`, type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="animate-fade-in space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <PageHeader
                title="Organisasi Pemerintahan"
                description="Data pejabat dan struktur organisasi kecamatan/kelurahan"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pemerintahan", href: "/admin/pemerintahan" },
                    { label: "Organisasi" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Pejabat" value={data.length} icon={UserCog} gradient="stat-gradient-blue" />
                <StatCard label="Jenis Jabatan" value={uniqueJabatan} icon={Users} gradient="stat-gradient-emerald" />
                <StatCard label="Kelurahan Terisi" value={new Set(data.filter(r => r.kelurahan_id).map(r => r.kelurahan_id)).size} icon={Building2} gradient="stat-gradient-amber" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Pejabat"
                searchPlaceholder="Cari jabatan atau nama..."
            />

            <OrganisasiFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahanOptions={finalKelurahanOpts}
                tenantNama={tenant?.nama || "Kecamatan"}
                isKelurahanAdmin={isKelurahanAdmin}
                filterKelurahanId={filterKelurahanId}
            />

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                title="Hapus Pejabat"
                message={`Apakah Anda yakin ingin menghapus "${deleteRow?.nama_pejabat}" (${deleteRow?.jabatan})?`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}
