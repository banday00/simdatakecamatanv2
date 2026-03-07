"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
    Landmark,
    CalendarDays,
    UserCheck,
    X,
    Loader2,
    Save,
    MapPin,
    Eye,
    Target,
    ListChecks,
    Globe,
    UserCircle,
    Hash,
    CheckCircle2,
    AlertCircle,
    Building2,
    MapPinned,
} from "lucide-react";

/* ── Types ── */

type ProfilRow = Record<string, unknown> & {
    id: string;
    kelurahan_id: string | null;
    tahun: number;
    visi: string | null;
    misi: string | null;
    tentang_wilayah: string | null;
    peta_wilayah: string | null;
};

type OrgLeader = {
    kelurahan_id: string | null;
    nama_pejabat: string;
    nip: string | null;
    foto: string | null;
    jabatan: string;
};

type ProfilForm = {
    kelurahan_id: string; // "" for kecamatan
    tahun: number;
    visi: string;
    misi: string;
    tentang_wilayah: string;
    peta_wilayah?: string;
    peta_wilayah_file?: File | null;
};

const emptyForm: ProfilForm = {
    kelurahan_id: "",
    tahun: new Date().getFullYear(),
    visi: "",
    misi: "",
    tentang_wilayah: "",
    peta_wilayah: "",
    peta_wilayah_file: null,
};

type TabType = "kecamatan" | "kelurahan";

/* ── Toast Component ── */

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className="fixed top-6 right-6 z-[60] animate-fade-in">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                {type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                {message}
                <button onClick={onClose} className="ml-2 p-0.5 hover:bg-white/20 rounded"><X className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

/* ── Main Page ── */

export default function ProfilPage() {
    const supabase = createClient();
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();

    const isKelurahanAdmin = profile?.role === "admin_kelurahan" && !!profile?.kelurahan_id;
    const filterKelurahanId = isKelurahanAdmin ? profile.kelurahan_id : null;

    // Tabs — admin_kelurahan only sees "kelurahan" tab
    const [activeTab, setActiveTab] = useState<TabType>(isKelurahanAdmin ? "kelurahan" : "kecamatan");

    // Data states
    const [kecamatanData, setKecamatanData] = useState<ProfilRow[]>([]);
    const [kelurahanData, setKelurahanData] = useState<ProfilRow[]>([]);
    const [leaders, setLeaders] = useState<OrgLeader[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<ProfilRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<ProfilRow | null>(null);
    const [viewRow, setViewRow] = useState<ProfilRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!tenant?.id) return;
        setIsLoading(true);
        try {
            // Kecamatan profiles: kelurahan_id IS NULL
            const { data: kecData } = await supabase
                .schema("sidakota")
                .from("gov_profiles")
                .select("*")
                .eq("tenant_id", tenant.id)
                .is("kelurahan_id", null)
                .order("tahun", { ascending: false });

            setKecamatanData((kecData as ProfilRow[]) || []);

            // Kelurahan profiles: kelurahan_id IS NOT NULL
            let kelQuery = supabase
                .schema("sidakota")
                .from("gov_profiles")
                .select("*")
                .eq("tenant_id", tenant.id)
                .not("kelurahan_id", "is", null)
                .order("tahun", { ascending: false });

            if (filterKelurahanId) {
                kelQuery = kelQuery.eq("kelurahan_id", filterKelurahanId);
            }

            const { data: kelData } = await kelQuery;
            setKelurahanData((kelData as ProfilRow[]) || []);

            // Fetch leaders from gov_organisasi (urutan=1)
            const { data: orgData } = await supabase
                .schema("sidakota")
                .from("gov_organisasi")
                .select("kelurahan_id, nama_pejabat, nip, foto, jabatan")
                .eq("tenant_id", tenant.id)
                .eq("urutan", 1)
                .eq("is_active", true);

            setLeaders((orgData as OrgLeader[]) || []);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.id, filterKelurahanId, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // CRUD operations
    async function handleCreate(formData: ProfilForm) {
        if (!tenant?.id) return;
        const payload: Record<string, unknown> = {
            tenant_id: tenant.id,
            kelurahan_id: formData.kelurahan_id || null,
            tahun: Number(formData.tahun),
            visi: formData.visi || null,
            misi: formData.misi || null,
            tentang_wilayah: formData.tentang_wilayah || null,
            peta_wilayah: formData.peta_wilayah || null,
        };
        // Auto-inject for admin_kelurahan
        if (filterKelurahanId && activeTab === "kelurahan") {
            payload.kelurahan_id = filterKelurahanId;
        }
        const { error } = await supabase.schema("sidakota").from("gov_profiles").insert(payload);
        if (error) throw error;
    }

    async function handleUpdate(id: string, formData: ProfilForm) {
        const payload: Record<string, unknown> = {
            kelurahan_id: formData.kelurahan_id || null,
            tahun: Number(formData.tahun),
            visi: formData.visi || null,
            misi: formData.misi || null,
            tentang_wilayah: formData.tentang_wilayah || null,
            peta_wilayah: formData.peta_wilayah || null,
        };
        const { error } = await supabase.schema("sidakota").from("gov_profiles").update(payload).eq("id", id);
        if (error) throw error;
    }

    async function handleDelete(id: string) {
        const { error } = await supabase.schema("sidakota").from("gov_profiles").delete().eq("id", id);
        if (error) throw error;
    }

    async function handleSubmit(formData: ProfilForm) {
        setIsSubmitting(true);
        try {
            let finalPetaUrl = formData.peta_wilayah;

            if (formData.peta_wilayah_file) {
                const file = formData.peta_wilayah_file;
                const fileExt = file.name.split('.').pop();
                const fileName = `peta_${tenant?.id}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("gov-profiles")
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from("gov-profiles")
                    .getPublicUrl(fileName);

                finalPetaUrl = publicUrlData.publicUrl;
            }

            const updatedFormData = { ...formData, peta_wilayah: finalPetaUrl };

            if (editRow) {
                await handleUpdate(editRow.id, updatedFormData);
                setToast({ message: "Profil berhasil diperbarui", type: "success" });
            } else {
                await handleCreate(updatedFormData);
                setToast({ message: "Profil berhasil ditambahkan", type: "success" });
            }
            setModalOpen(false);
            setEditRow(null);
            await fetchData();
        } catch (error: any) {
            setToast({ message: `Gagal menyimpan data: ${error.message || 'Silakan coba lagi.'}`, type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function confirmDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try {
            await handleDelete(deleteRow.id);
            setDeleteRow(null);
            setToast({ message: "Profil berhasil dihapus", type: "success" });
            await fetchData();
        } catch {
            setToast({ message: "Gagal menghapus data", type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }

    // Current tab data
    const currentData = activeTab === "kecamatan" ? kecamatanData : kelurahanData;

    // Helper: find leader for a kelurahan_id (null = kecamatan)
    function getLeader(kelurahanId: string | null): OrgLeader | undefined {
        return leaders.find((l) =>
            kelurahanId ? l.kelurahan_id === kelurahanId : l.kelurahan_id === null
        );
    }

    // Enrich data with nama kelurahan and leader info
    const enrichedData = currentData.map((row) => {
        const leader = getLeader(row.kelurahan_id);
        return {
            ...row,
            kelurahan_nama: row.kelurahan_id
                ? kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—"
                : tenant?.nama || "Kecamatan",
            pejabat_label: row.kelurahan_id ? "Lurah" : "Camat",
            pimpinan_nama: leader?.nama_pejabat || "—",
            pimpinan_nip: leader?.nip || "—",
            pimpinan_jabatan: leader?.jabatan || "—",
        };
    });

    // Stats
    const totalKecamatan = kecamatanData.length;
    const totalKelurahan = kelurahanData.length;
    const uniqueKelurahan = new Set(kelurahanData.map((r) => r.kelurahan_id)).size;

    // Kelurahan options for form
    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Columns differ by tab
    const kecamatanColumns: Column<ProfilRow>[] = [
        { key: "tahun", label: "Tahun", sortable: true },
        { key: "pimpinan_nama", label: "Camat", sortable: true, render: (v) => <span className="text-sm font-medium text-slate-700">{String(v || "—")}</span> },
        { key: "visi", label: "Visi", render: (v) => <span className="text-xs text-slate-500 line-clamp-2 max-w-[250px] block">{String(v || "—")}</span> },
        { key: "tentang_wilayah", label: "Tentang Wilayah", render: (v) => <span className="text-xs text-slate-500 line-clamp-2 max-w-[200px] block">{String(v || "—")}</span> },
    ];

    const kelurahanColumns: Column<ProfilRow>[] = [
        { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
        { key: "tahun", label: "Tahun", sortable: true },
        { key: "pimpinan_nama", label: "Lurah", sortable: true, render: (v) => <span className="text-sm font-medium text-slate-700">{String(v || "—")}</span> },
        { key: "visi", label: "Visi", render: (v) => <span className="text-xs text-slate-500 line-clamp-2 max-w-[200px] block">{String(v || "—")}</span> },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <PageHeader
                title="Profil Pemerintahan"
                description="Kelola data profil kecamatan dan kelurahan, termasuk visi-misi dan informasi pejabat"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pemerintahan", href: "/admin/pemerintahan" },
                    { label: "Profil" },
                ]}
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Profil Kecamatan" value={totalKecamatan} icon={Building2} gradient="stat-gradient-blue" />
                <StatCard label="Profil Kelurahan" value={totalKelurahan} icon={Landmark} gradient="stat-gradient-emerald" />
                <StatCard label="Kelurahan Terisi" value={uniqueKelurahan} icon={UserCheck} gradient="stat-gradient-amber" />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {!isKelurahanAdmin && (
                        <button
                            onClick={() => setActiveTab("kecamatan")}
                            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-all border-b-2 ${activeTab === "kecamatan"
                                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <Building2 className="w-4 h-4" />
                            Profil Kecamatan
                            <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === "kecamatan" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                {totalKecamatan}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab("kelurahan")}
                        className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-all border-b-2 ${activeTab === "kelurahan"
                            ? "border-blue-600 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        <MapPinned className="w-4 h-4" />
                        Profil Kelurahan
                        <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === "kelurahan" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                            {totalKelurahan}
                        </span>
                    </button>
                </div>

                <div className="p-0">
                    <DataTable
                        columns={activeTab === "kecamatan" ? kecamatanColumns : kelurahanColumns}
                        data={enrichedData}
                        isLoading={isLoading}
                        onAdd={() => { setEditRow(null); setModalOpen(true); }}
                        onView={(row) => setViewRow(row)}
                        onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                        onDelete={(row) => setDeleteRow(row)}
                        addLabel={activeTab === "kecamatan" ? "Tambah Profil Kecamatan" : "Tambah Profil Kelurahan"}
                        searchPlaceholder={activeTab === "kecamatan" ? "Cari camat..." : "Cari kelurahan..."}
                    />
                </div>
            </div>

            {/* Modals */}
            <ProfilFormModal
                key={`${activeTab}-${editRow?.id ?? "new"}`}
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                tab={activeTab}
                kelurahanOptions={kelurahanOptions}
                defaultKelurahanId={filterKelurahanId || ""}
                tenantNama={tenant?.nama || "Kecamatan"}
            />

            <ProfilViewModal
                open={!!viewRow}
                onClose={() => setViewRow(null)}
                data={viewRow}
                kelurahans={kelurahans}
                tenantNama={tenant?.nama || "Kecamatan"}
                leader={viewRow ? getLeader(viewRow.kelurahan_id) : undefined}
            />

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={confirmDelete}
                title={`Hapus Profil ${activeTab === "kecamatan" ? "Kecamatan" : "Kelurahan"}`}
                message="Apakah Anda yakin ingin menghapus profil ini? Tindakan ini tidak dapat dibatalkan."
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   ProfilFormModal — Adapts for Kecamatan/Kelurahan
   ═══════════════════════════════════════════════════════ */

function ProfilFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, tab, kelurahanOptions, defaultKelurahanId, tenantNama,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: ProfilForm) => Promise<void>;
    editRow: ProfilRow | null;
    isSubmitting: boolean;
    tab: TabType;
    kelurahanOptions: { label: string; value: string }[];
    defaultKelurahanId: string;
    tenantNama: string;
}) {
    const isEdit = !!editRow;
    const isKecamatan = tab === "kecamatan";

    const [form, setForm] = useState<ProfilForm>(emptyForm);

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                visi: editRow.visi ?? "",
                misi: editRow.misi ?? "",
                tentang_wilayah: editRow.tentang_wilayah ?? "",
                peta_wilayah: editRow.peta_wilayah ?? "",
                peta_wilayah_file: null,
            });
        } else {
            setForm({
                ...emptyForm,
                kelurahan_id: isKecamatan ? "" : defaultKelurahanId,
            });
        }
    }, [open, editRow, defaultKelurahanId, isKecamatan]);

    function set(field: keyof ProfilForm, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    const accentColor = isKecamatan ? "blue" : "teal";
    const gradientFrom = isKecamatan ? "from-blue-500" : "from-teal-500";
    const gradientVia = isKecamatan ? "via-indigo-500" : "via-cyan-500";
    const gradientTo = isKecamatan ? "to-purple-500" : "to-blue-500";

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />

            <div
                className="relative w-full max-w-5xl mx-4 my-8 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent */}
                <div className={`h-1.5 bg-gradient-to-r ${gradientFrom} ${gradientVia} ${gradientTo} shrink-0`} />

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shadow-sm ${isKecamatan
                            ? "bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600"
                            : "bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-600"
                            }`}>
                            {isKecamatan ? <Building2 className="w-6 h-6" /> : <Landmark className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit" : "Tambah"} Profil {isKecamatan ? "Kecamatan" : "Kelurahan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {isKecamatan
                                    ? `Profil ${tenantNama}`
                                    : isEdit
                                        ? "Perbarui informasi profil kelurahan"
                                        : "Lengkapi data profil kelurahan baru"
                                }
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
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            {/* Left — 2/5 */}
                            <div className="lg:col-span-2 space-y-5">
                                <SectionLabel icon={MapPin} label="Informasi Dasar" />

                                {isKecamatan ? (
                                    <FormField label="Kecamatan">
                                        <div className="form-input bg-gray-50 text-gray-600 cursor-not-allowed">
                                            {tenantNama}
                                        </div>
                                    </FormField>
                                ) : (
                                    <FormField label="Kelurahan" required>
                                        <select
                                            value={form.kelurahan_id}
                                            onChange={(e) => set("kelurahan_id", e.target.value)}
                                            required
                                            className="form-input"
                                            disabled={kelurahanOptions.length === 1}
                                        >
                                            <option value="">— Pilih Kelurahan —</option>
                                            {kelurahanOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                )}

                                <FormField label="Tahun" required>
                                    <input
                                        type="number"
                                        value={form.tahun}
                                        onChange={(e) => set("tahun", e.target.value)}
                                        required min={2000} max={2099}
                                        className="form-input"
                                    />
                                </FormField>

                                <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserCircle className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Info Pimpinan</span>
                                    </div>
                                    <p className="text-xs text-slate-400">Data pimpinan dikelola melalui menu <span className="font-semibold text-slate-600">Struktur Organisasi</span>.</p>
                                </div>
                            </div>

                            {/* Right — 3/5 */}
                            <div className="lg:col-span-3 space-y-5">
                                <SectionLabel icon={Target} label="Visi & Misi" />

                                <FormField label="Visi" hint={`Cita-cita atau tujuan utama ${isKecamatan ? "kecamatan" : "kelurahan"}`}>
                                    <textarea
                                        value={form.visi}
                                        onChange={(e) => set("visi", e.target.value)}
                                        rows={3}
                                        placeholder={`Contoh: Mewujudkan ${isKecamatan ? "Kecamatan" : "Kelurahan"} yang Mandiri, Sejahtera, dan Berbudaya`}
                                        className="form-input resize-none"
                                    />
                                </FormField>

                                <FormField label="Misi" hint="Langkah-langkah strategis untuk mencapai visi">
                                    <textarea
                                        value={form.misi}
                                        onChange={(e) => set("misi", e.target.value)}
                                        rows={5}
                                        placeholder={"1. Meningkatkan kualitas pelayanan publik\n2. Mendorong partisipasi masyarakat\n3. Menata lingkungan yang bersih dan sehat"}
                                        className="form-input resize-none"
                                    />
                                </FormField>

                                <div className="pt-3">
                                    <SectionLabel icon={Globe} label="Deskripsi Wilayah" />
                                </div>

                                <FormField label="Tentang Wilayah" hint={`Profil umum wilayah ${isKecamatan ? "kecamatan" : "kelurahan"}`}>
                                    <textarea
                                        value={form.tentang_wilayah}
                                        onChange={(e) => set("tentang_wilayah", e.target.value)}
                                        rows={5}
                                        placeholder="Deskripsi geografis, demografis, dan potensi wilayah..."
                                        className="form-input resize-none"
                                    />
                                </FormField>

                                <FormField label="Peta Wilayah" hint="Unggah gambar peta wilayah administrasi (JPG/PNG. Opsional)">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setForm((prev) => ({ ...prev, peta_wilayah_file: file }));
                                        }}
                                        className="form-input p-2.5 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {form.peta_wilayah && !form.peta_wilayah_file && (
                                        <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 shrink-0" /> Peta sudah diunggah sebelumnya. Biarkan kosong jika tidak ingin mengubah.
                                        </p>
                                    )}
                                    {form.peta_wilayah_file && (
                                        <p className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 shrink-0" /> File terpilih: {form.peta_wilayah_file.name}
                                        </p>
                                    )}
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
                                className="flex items-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Simpan Perubahan" : `Tambah Profil`}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

/* ═══════════════════════════════════════════════════════
   ProfilViewModal
   ═══════════════════════════════════════════════════════ */

function ProfilViewModal({
    open, onClose, data, kelurahans, tenantNama, leader,
}: {
    open: boolean;
    onClose: () => void;
    data: ProfilRow | null;
    kelurahans: { id: string; nama: string }[];
    tenantNama: string;
    leader?: OrgLeader;
}) {
    if (!open || !data) return null;

    const isKecamatan = !data.kelurahan_id;
    const entityName = isKecamatan ? tenantNama : (kelurahans.find((k) => k.id === data.kelurahan_id)?.nama ?? "—");
    const pejabatLabel = isKecamatan ? "Camat" : "Lurah";

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />
            <div
                className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent */}
                <div className={`h-1.5 bg-gradient-to-r ${isKecamatan ? "from-blue-500 via-indigo-500 to-purple-500" : "from-teal-500 via-cyan-500 to-blue-500"} shrink-0`} />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isKecamatan ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"}`}>
                            <Eye className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Detail Profil {isKecamatan ? "Kecamatan" : "Kelurahan"}
                            </h2>
                            <p className="text-xs text-gray-500">{entityName} · Tahun {data.tahun}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6 overflow-y-auto space-y-6">
                    <div className={`bg-gradient-to-r ${isKecamatan ? "from-blue-50 to-indigo-50 border-blue-100/40" : "from-teal-50 to-cyan-50 border-teal-100/40"} rounded-xl p-5 border`}>
                        <div className="flex items-center gap-2 mb-3">
                            <UserCircle className={`w-4 h-4 ${isKecamatan ? "text-blue-500" : "text-teal-500"}`} />
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isKecamatan ? "text-blue-600" : "text-teal-600"}`}>
                                Pejabat {pejabatLabel}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DetailItem icon={UserCircle} label={`Nama ${pejabatLabel}`} value={leader?.nama_pejabat ?? "—"} />
                            <DetailItem icon={Hash} label={`NIP ${pejabatLabel}`} value={leader?.nip ?? "—"} />
                        </div>
                    </div>

                    <ViewSection icon={Target} title="Visi" content={String(data.visi ?? "")} emptyText="Belum ada visi yang ditetapkan." />
                    <ViewSection icon={ListChecks} title="Misi" content={String(data.misi ?? "")} emptyText="Belum ada misi yang ditetapkan." />
                    <ViewSection icon={Globe} title="Tentang Wilayah" content={String(data.tentang_wilayah ?? "")} emptyText="Belum ada deskripsi wilayah." />

                    {data.peta_wilayah && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <MapPinned className="w-4 h-4 text-primary-500" />
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Peta Wilayah</h3>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center p-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={String(data.peta_wilayah)} alt="Peta Wilayah" className="max-w-full max-h-[400px] object-contain rounded-lg shadow-sm" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">
                        Tutup
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ═══════════════════════════════════════════════════════
   Shared Sub-Components
   ═══════════════════════════════════════════════════════ */

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
    return (
        <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <Icon className="w-4 h-4 text-primary-500" />
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

function DetailItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
            <div>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

function ViewSection({ icon: Icon, title, content, emptyText }: { icon: React.ComponentType<{ className?: string }>; title: string; content: string; emptyText: string }) {
    const isEmpty = !content.trim();
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-primary-500" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{title}</h3>
            </div>
            <div className={`rounded-xl p-5 border ${isEmpty ? "border-dashed border-gray-200 bg-gray-50/50" : "border-gray-100 bg-gray-50"}`}>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isEmpty ? "text-gray-400 italic" : "text-gray-700"}`}>
                    {isEmpty ? emptyText : content}
                </p>
            </div>
        </div>
    );
}
