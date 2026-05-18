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
    Heart, Activity, Target, ShieldCheck, X, Loader2, Save,
    MapPin, Users, BarChart3, Plus, Trash2, UserCheck, CalendarDays, Eye,
} from "lucide-react";

type PosyanduRow = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    nama: string;
    strata: string;
    jumlah_kader: number;
    jumlah_balita: number;
    jumlah_lansia: number;
    // Tahap 1
    alamat?: string;
    ketua?: string;
    anggota_kader?: string[];
    rt_rw?: string;
    // Tahap 2
    frekuensi_kegiatan?: number;
    tahun?: number;
    jumlah_ibu_hamil?: number;
    jumlah_wus_pus?: number;
    cakupan_gizi?: number;
    cakupan_kia?: number;
    cakupan_kb?: number;
    cakupan_imunisasi?: number;
};

const STRATA_COLORS: Record<string, string> = {
    "Mandiri": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Purnama": "bg-blue-100 text-blue-700 border-blue-200",
    "Madya": "bg-amber-100 text-amber-700 border-amber-200",
    "Pratama": "bg-indigo-100 text-indigo-700 border-indigo-200"
};

const columns: Column<PosyanduRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "nama", label: "Nama Posyandu", sortable: true },
    { key: "ketua", label: "Ketua", sortable: true,
        render: (val) => <span className="text-slate-700">{String(val || "—")}</span>,
    },
    {
        key: "strata",
        label: "Strata",
        sortable: true,
        render: (val) => (
            <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${STRATA_COLORS[String(val) || "Pratama"] || STRATA_COLORS["Pratama"]}`}>
                {String(val || "Pratama")}
            </span>
        ),
    },
    {
        key: "jumlah_kader",
        label: "Jml Kader",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "jumlah_balita",
        label: "Sasaran Balita",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "jumlah_lansia",
        label: "Sasaran Lansia",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "frekuensi_kegiatan",
        label: "Kegiatan/Thn",
        sortable: true,
        render: (val) => {
            const v = Number(val ?? 0);
            const isActive = v >= 8;
            return (
                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {v}× {isActive ? "✓" : ""}
                </span>
            );
        },
    },
];

const strataOptions = [
    { label: "Pratama", value: "Pratama" },
    { label: "Madya", value: "Madya" },
    { label: "Purnama", value: "Purnama" },
    { label: "Mandiri", value: "Mandiri" },
];

export default function PosyanduAdminPage() {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();

    const [data, setData] = useState<PosyanduRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<PosyanduRow | null>(null);
    const [viewRow, setViewRow] = useState<PosyanduRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<PosyanduRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isKelurahanAdmin = profile?.role === "admin_kelurahan";
    const filterKelurahanId = isKelurahanAdmin ? profile?.kelurahan_id ?? null : null;

    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/kesehatan/posyandu`);
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal memuat data posyandu");
            }
            setData(json.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal memuat data posyandu";
            setError(message);
            console.error("[Posyandu] fetchData:", err);
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

    const totalPosyandu = data.length;
    const totalMandiri = data.filter((r) => r.strata === "Mandiri").length;
    const totalKader = data.reduce((acc, curr) => acc + (curr.jumlah_kader || 0), 0);
    const totalSasaran = data.reduce((acc, curr) => acc + (curr.jumlah_balita || 0) + (curr.jumlah_lansia || 0), 0);

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            // Sanitize payload
            const payload = { ...formData };
            payload.jumlah_kader = Number(payload.jumlah_kader) || 0;
            payload.jumlah_balita = Number(payload.jumlah_balita) || 0;
            payload.jumlah_lansia = Number(payload.jumlah_lansia) || 0;
            payload.frekuensi_kegiatan = Number(payload.frekuensi_kegiatan) || 0;
            payload.tahun = Number(payload.tahun) || null;
            payload.jumlah_ibu_hamil = Number(payload.jumlah_ibu_hamil) || 0;
            payload.jumlah_wus_pus = Number(payload.jumlah_wus_pus) || 0;
            payload.cakupan_gizi = Number(payload.cakupan_gizi) || 0;
            payload.cakupan_kia = Number(payload.cakupan_kia) || 0;
            payload.cakupan_kb = Number(payload.cakupan_kb) || 0;
            payload.cakupan_imunisasi = Number(payload.cakupan_imunisasi) || 0;
            // Null empty optional text
            if (!payload.alamat) payload.alamat = null;
            if (!payload.ketua) payload.ketua = null;
            if (!payload.rt_rw) payload.rt_rw = null;
            // Ensure anggota_kader is array, filter empty strings
            if (Array.isArray(payload.anggota_kader)) {
                payload.anggota_kader = (payload.anggota_kader as string[]).filter(k => k.trim() !== "");
            } else {
                payload.anggota_kader = [];
            }
            // Auto calculate jumlah_kader from array
            payload.jumlah_kader = (payload.anggota_kader as string[]).length;

            if (!tenant?.slug) throw new Error("Tenant belum tersedia.");
            const url = editRow
                ? `/api/tenants/${tenant.slug}/admin/kesehatan/posyandu/${editRow.id}`
                : `/api/tenants/${tenant.slug}/admin/kesehatan/posyandu`;
            const res = await fetch(url, {
                method: editRow ? "PATCH" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menyimpan data posyandu");
            }
            await fetchData();
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            const msg = err?.message || err?.details || err?.hint || JSON.stringify(err);
            console.error("[Posyandu] handleSubmit:", err);
            alert(`Gagal menyimpan: ${msg || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/kesehatan/posyandu/${deleteRow.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menghapus data posyandu");
            }
            await fetchData();
            setDeleteRow(null);
        }
        catch (err: any) {
            const msg = err?.message || err?.details || err?.hint || JSON.stringify(err);
            console.error("[Posyandu] handleDelete:", err);
            alert(`Gagal menghapus: ${msg || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Posyandu & Layanan Dasar"
                description="Kelola data posyandu, kepengurusan, cakupan sasaran, dan indikator SIP nasional"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kesehatan", href: "/admin/kesehatan" },
                    { label: "Posyandu" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard size="sm" label="Total Posyandu" value={totalPosyandu} icon={Heart} gradient="stat-gradient-soft-emerald" />
                <StatCard size="sm" label="Strata Mandiri" value={totalMandiri} icon={ShieldCheck} gradient="stat-gradient-soft-blue" />
                <StatCard size="sm" label="Total Kader" value={totalKader} icon={Activity} gradient="stat-gradient-soft-indigo" />
                <StatCard size="sm" label="Total Sasaran" value={totalSasaran} icon={Target} gradient="stat-gradient-soft-amber" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onView={(row) => setViewRow(row)}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Data"
                searchPlaceholder="Cari posyandu..."
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <PosyanduFormModal
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
                title="Hapus Data Posyandu"
                message={`Apakah Anda yakin ingin menghapus posyandu "${deleteRow?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
                isDeleting={isSubmitting}
            />

            <PosyanduDetailModal
                open={!!viewRow}
                onClose={() => setViewRow(null)}
                data={viewRow}
                kelurahans={kelurahans}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PosyanduFormModal — Upgraded with SIP national standard fields
   ═══════════════════════════════════════════════════════ */

function PosyanduFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: PosyanduRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;
    const currentYear = new Date().getFullYear();

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        nama: "",
        strata: "Pratama",
        alamat: "",
        ketua: "",
        rt_rw: "",
        anggota_kader: [] as string[],
        jumlah_kader: 0,
        jumlah_balita: 0,
        jumlah_lansia: 0,
        frekuensi_kegiatan: 0,
        tahun: currentYear,
        jumlah_ibu_hamil: 0,
        jumlah_wus_pus: 0,
        cakupan_gizi: 0,
        cakupan_kia: 0,
        cakupan_kb: 0,
        cakupan_imunisasi: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                strata: editRow.strata ?? "Pratama",
                alamat: editRow.alamat ?? "",
                ketua: editRow.ketua ?? "",
                rt_rw: editRow.rt_rw ?? "",
                anggota_kader: Array.isArray(editRow.anggota_kader) ? editRow.anggota_kader : [],
                jumlah_kader: editRow.jumlah_kader ?? 0,
                jumlah_balita: editRow.jumlah_balita ?? 0,
                jumlah_lansia: editRow.jumlah_lansia ?? 0,
                frekuensi_kegiatan: editRow.frekuensi_kegiatan ?? 0,
                tahun: editRow.tahun ?? currentYear,
                jumlah_ibu_hamil: editRow.jumlah_ibu_hamil ?? 0,
                jumlah_wus_pus: editRow.jumlah_wus_pus ?? 0,
                cakupan_gizi: editRow.cakupan_gizi ?? 0,
                cakupan_kia: editRow.cakupan_kia ?? 0,
                cakupan_kb: editRow.cakupan_kb ?? 0,
                cakupan_imunisasi: editRow.cakupan_imunisasi ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
                nama: "",
                strata: "Pratama",
                alamat: "",
                ketua: "",
                rt_rw: "",
                anggota_kader: [],
                jumlah_kader: 0,
                jumlah_balita: 0,
                jumlah_lansia: 0,
                frekuensi_kegiatan: 0,
                tahun: currentYear,
                jumlah_ibu_hamil: 0,
                jumlah_wus_pus: 0,
                cakupan_gizi: 0,
                cakupan_kia: 0,
                cakupan_kb: 0,
                cakupan_imunisasi: 0,
            });
        }
    }, [open, editRow, isKelurahanAdmin, filterKelurahanId, currentYear]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    // Dynamic kader array helpers
    const kaderList = Array.isArray(form.anggota_kader) ? form.anggota_kader as string[] : [];

    function addKader() {
        setForm((prev) => ({ ...prev, anggota_kader: [...(prev.anggota_kader as string[] || []), ""] }));
    }
    function removeKader(idx: number) {
        setForm((prev) => {
            const arr = [...(prev.anggota_kader as string[] || [])];
            arr.splice(idx, 1);
            return { ...prev, anggota_kader: arr };
        });
    }
    function updateKader(idx: number, value: string) {
        setForm((prev) => {
            const arr = [...(prev.anggota_kader as string[] || [])];
            arr[idx] = value;
            return { ...prev, anggota_kader: arr };
        });
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        // Custom validation for dynamic kader array
        if (kaderList.filter(k => k.trim() !== "").length === 0) {
            alert("Mohon isi minimal 1 Anggota Kader.");
            return;
        }

        onSubmit(form);
    }

    if (!open) return null;

    const inputClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm";

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <Heart className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Posyandu" : "Tambah Posyandu"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Pencatatan sesuai Standar Nasional SIP Kemenkes — Identitas, Kapasitas, dan Cakupan Layanan
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
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">

                            {/* ── Column 1: Identitas & Kepengurusan ── */}
                            <div className="lg:col-span-2 space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas & Lokasi</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Kelurahan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        className={inputClass}
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
                                        Nama Posyandu <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required type="text" className={inputClass}
                                        value={(form.nama as string) || ""}
                                        onChange={(e) => set("nama", e.target.value)}
                                        placeholder="Contoh: Posyandu Mawar 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Alamat <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        className={inputClass + " resize-none"}
                                        rows={2}
                                        value={(form.alamat as string) || ""}
                                        onChange={(e) => set("alamat", e.target.value)}
                                        placeholder="Alamat lengkap lokasi posyandu..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            RT/RW <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text" className={inputClass}
                                            value={(form.rt_rw as string) || ""}
                                            onChange={(e) => set("rt_rw", e.target.value)}
                                            placeholder="Cth: 001,002/005"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1.5">
                                            Jika &gt;1 RT, pisahkan dengan koma (Contoh: "001,002/005" atau "001-003/005")
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Strata</label>
                                        <select
                                            className={inputClass}
                                            value={(form.strata as string) || "Pratama"}
                                            onChange={(e) => set("strata", e.target.value)}
                                        >
                                            {strataOptions.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Ketua / Penanggung Jawab <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text" className={inputClass}
                                        value={(form.ketua as string) || ""}
                                        onChange={(e) => set("ketua", e.target.value)}
                                        placeholder="Nama ketua posyandu"
                                    />
                                </div>

                                {/* Dynamic Kader Array */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-sm font-semibold text-gray-700">
                                            Anggota Kader <span className="text-red-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addKader}
                                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                                        >
                                            <Plus className="w-3 h-3" /> Tambah
                                        </button>
                                    </div>
                                    {kaderList.length === 0 && (
                                        <p className="text-xs text-gray-400 italic py-2">Belum ada kader. Klik &quot;Tambah&quot; untuk menambahkan.</p>
                                    )}
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {kaderList.map((name, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400 w-5 text-center shrink-0">{idx + 1}</span>
                                                <input
                                                    type="text"
                                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                    value={name}
                                                    onChange={(e) => updateKader(idx, e.target.value)}
                                                    placeholder={`Nama kader ${idx + 1}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeKader(idx)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {kaderList.length > 0 && (
                                        <p className="text-[10px] text-gray-400 mt-1.5">
                                            Standar SIP: minimal 5 kader aktif. Saat ini: <span className={`font-bold ${kaderList.filter(k => k.trim()).length >= 5 ? 'text-emerald-600' : 'text-amber-600'}`}>{kaderList.filter(k => k.trim()).length} kader</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* ── Column 2: Kapasitas & Sasaran ── */}
                            <div className="lg:col-span-2 space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Kapasitas & Sasaran</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Tahun <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required type="number" className={inputClass}
                                            min={2020} max={2100}
                                            value={Number(form.tahun) || currentYear}
                                            onChange={(e) => set("tahun", Number(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="flex flex-col mb-1.5">
                                            <span className="text-sm font-semibold text-gray-700">Kegiatan/Tahun</span>
                                        </label>
                                        <input
                                            type="number" className={inputClass}
                                            min={0} max={52}
                                            value={Number(form.frekuensi_kegiatan) || 0}
                                            onChange={(e) => set("frekuensi_kegiatan", Number(e.target.value))}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Standar aktif: ≥ 8×/tahun</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="flex flex-col mb-1.5">
                                        <span className="text-sm font-semibold text-gray-700">Jumlah Kader</span>
                                        <span className="text-[10px] text-gray-500 mt-0.5">Otomatis dihitung dari list Anggota Kader</span>
                                    </label>
                                    <input
                                        type="number" className={inputClass + " bg-slate-100/70 text-slate-500 cursor-not-allowed font-bold"}
                                        value={kaderList.filter(k => k.trim() !== "").length}
                                        readOnly
                                        disabled
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Sasaran Balita <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required type="number" min={0} className={inputClass}
                                            value={Number(form.jumlah_balita) || 0}
                                            onChange={(e) => set("jumlah_balita", Number(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Sasaran Lansia <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required type="number" min={0} className={inputClass}
                                            value={Number(form.jumlah_lansia) || 0}
                                            onChange={(e) => set("jumlah_lansia", Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sasaran Ibu Hamil</label>
                                        <input
                                            type="number" min={0} className={inputClass}
                                            value={Number(form.jumlah_ibu_hamil) || 0}
                                            onChange={(e) => set("jumlah_ibu_hamil", Number(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sasaran WUS/PUS</label>
                                        <input
                                            type="number" min={0} className={inputClass}
                                            value={Number(form.jumlah_wus_pus) || 0}
                                            onChange={(e) => set("jumlah_wus_pus", Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Column 3: Cakupan 4 Layanan Utama ── */}
                            <div className="lg:col-span-2 space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <BarChart3 className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Cakupan Layanan (SIP)</span>
                                </div>

                                <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                    <strong>Indikator Posyandu Aktif:</strong> 3 dari 4 layanan harus mencapai cakupan ≥ 50% selama 8 bulan/tahun.
                                </p>

                                {([
                                    { key: "cakupan_gizi", label: "🥗 Gizi (Penimbangan)", desc: "Persentase balita ditimbang" },
                                    { key: "cakupan_kia", label: "🤰 KIA (Ibu & Anak)", desc: "Cakupan pelayanan KIA" },
                                    { key: "cakupan_kb", label: "💊 KB (Keluarga Berencana)", desc: "Cakupan akseptor KB aktif" },
                                    { key: "cakupan_imunisasi", label: "💉 Imunisasi Dasar", desc: "Cakupan imunisasi dasar lengkap" },
                                ] as const).map((item) => {
                                    const val = Number(form[item.key]) || 0;
                                    const isGood = val >= 50;
                                    return (
                                        <div key={item.key}>
                                            <label className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {val}%
                                                </span>
                                            </label>
                                            <input
                                                type="range"
                                                min={0} max={100} step={1}
                                                value={val}
                                                onChange={(e) => set(item.key, Number(e.target.value))}
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-600 bg-gray-200"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                                        </div>
                                    );
                                })}

                                {/* Summary badge */}
                                {(() => {
                                    const vals = [
                                        Number(form.cakupan_gizi) || 0,
                                        Number(form.cakupan_kia) || 0,
                                        Number(form.cakupan_kb) || 0,
                                        Number(form.cakupan_imunisasi) || 0,
                                    ];
                                    const above50 = vals.filter(v => v >= 50).length;
                                    const isActive = above50 >= 3 && (Number(form.frekuensi_kegiatan) || 0) >= 8;
                                    return (
                                        <div className={`p-3 rounded-xl border text-center ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                            <p className={`text-xs font-bold ${isActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                {isActive ? "✅ Memenuhi Kriteria Posyandu Aktif" : `⚠️ ${above50}/4 layanan ≥50% — Belum memenuhi kriteria aktif`}
                                            </p>
                                        </div>
                                    );
                                })()}
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

/* ═══════════════════════════════════════════════════════
   PosyanduDetailModal — Modal Detail (View Only)
   ═══════════════════════════════════════════════════════ */

function PosyanduDetailModal({
    open, onClose, data, kelurahans,
}: {
    open: boolean;
    onClose: () => void;
    data: PosyanduRow | null;
    kelurahans: { id: string; nama: string }[];
}) {
    if (!open || !data) return null;

    const kelNama = kelurahans.find(k => k.id === data.kelurahan_id)?.nama || "—";
    const kaderArr = Array.isArray(data.anggota_kader) ? data.anggota_kader : [];
    
    // Status Evaluasi Aktif
    const cakupans = [
        Number(data.cakupan_gizi) || 0,
        Number(data.cakupan_kia) || 0,
        Number(data.cakupan_kb) || 0,
        Number(data.cakupan_imunisasi) || 0,
    ];
    const above50 = cakupans.filter(v => v >= 50).length;
    const isActive = above50 >= 3 && (Number(data.frekuensi_kegiatan) || 0) >= 8;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3"></div>
                    <div className="relative flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-blue-600">
                            <Eye className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-bold text-gray-900">{data.nama}</h2>
                                {isActive && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 tracking-wider">AKTIF</span>
                                )}
                            </div>
                            <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-blue-400" /> Kelurahan {kelNama}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="relative p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-white flex-1 relative">
                    <div className="space-y-8">
                        {/* Section 1: Identitas & Lokasi */}
                        <div>
                            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-blue-50 pb-2">
                                <MapPin className="w-4 h-4" /> Identitas & Lokasi
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 mb-1">Alamat Lengkap</p>
                                    <p className="text-sm font-medium text-slate-900">{data.alamat || "—"}</p>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <p className="text-xs text-slate-500 mb-1">RT/RW</p>
                                    <p className="text-sm font-medium text-slate-900">{data.rt_rw || "—"}</p>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <p className="text-xs text-slate-500 mb-1">Strata</p>
                                    <p className="text-sm font-medium text-slate-900">{data.strata || "Pratama"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 mb-1">Ketua / Penanggung Jawab</p>
                                    <p className="text-sm font-medium text-slate-900">{data.ketua || "—"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 mb-1 flex justify-between">
                                        <span>Anggota Kader ({kaderArr.length})</span>
                                        {kaderArr.length < 5 && <span className="text-amber-600 font-bold">*Kurang dari 5</span>}
                                    </p>
                                    {kaderArr.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {kaderArr.map((k: string, i: number) => (
                                                <span key={i} className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                                                    {k}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-slate-400 italic">Belum ada kader</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Kapasitas & Sasaran */}
                        <div>
                            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-indigo-50 pb-2">
                                <Users className="w-4 h-4" /> Kapasitas & Sasaran ({data.tahun || new Date().getFullYear()})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                    <p className="text-xs text-indigo-600/80 mb-1 font-semibold flex justify-between">
                                        Frekuensi <span className={Number(data.frekuensi_kegiatan) >= 8 ? 'text-emerald-500' : 'text-amber-500 font-bold'}>{Number(data.frekuensi_kegiatan) >= 8 ? '✓' : '!'}</span>
                                    </p>
                                    <p className="text-lg font-bold text-indigo-900">{data.frekuensi_kegiatan || 0} <span className="text-xs font-normal text-indigo-500">kali/thn</span></p>
                                </div>
                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                    <p className="text-xs text-indigo-600/80 mb-1 font-semibold">Sasaran Balita</p>
                                    <p className="text-lg font-bold text-indigo-900">{data.jumlah_balita || 0}</p>
                                </div>
                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                    <p className="text-xs text-indigo-600/80 mb-1 font-semibold">Sasaran Lansia</p>
                                    <p className="text-lg font-bold text-indigo-900">{data.jumlah_lansia || 0}</p>
                                </div>
                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                    <p className="text-xs text-indigo-600/80 mb-1 font-semibold">Ibu Hamil / WUS</p>
                                    <p className="text-lg font-bold text-indigo-900">{data.jumlah_ibu_hamil || 0} / {data.jumlah_wus_pus || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Cakupan SIP */}
                        <div>
                            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-emerald-50 pb-2">
                                <Activity className="w-4 h-4" /> Indikator Capaian Layanan (SIP)
                            </h3>
                            
                            <div className="space-y-4">
                                {[
                                    { label: "Cakupan Gizi (Penimbangan/Pengukuran)", val: Number(data.cakupan_gizi) || 0 },
                                    { label: "Cakupan KIA (Ibu Hamil/Nifas/WUS)", val: Number(data.cakupan_kia) || 0 },
                                    { label: "Cakupan Keluarga Berencana (KB)", val: Number(data.cakupan_kb) || 0 },
                                    { label: "Cakupan Imunisasi Dasar", val: Number(data.cakupan_imunisasi) || 0 },
                                ].map((item, idx) => {
                                    const isGood = item.val >= 50;
                                    return (
                                        <div key={idx}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.val}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div 
                                                    className={`h-2.5 rounded-full ${isGood ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                                                    style={{ width: `${Math.min(item.val, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className={`mt-5 p-3.5 rounded-xl border flex items-start gap-3 ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {isActive ? <ShieldCheck className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm font-bold mb-1 ${isActive ? 'text-emerald-800' : 'text-amber-800'}`}>
                                        {isActive ? "Memenuhi Kriteria Posyandu Aktif" : "Belum Memenuhi Kriteria Posyandu Aktif"}
                                    </h4>
                                    <ul className={`text-xs space-y-1 ${isActive ? 'text-emerald-700/80' : 'text-amber-800/70'}`}>
                                        <li className="flex gap-1.5"><span className={Number(data.frekuensi_kegiatan) >= 8 ? 'text-emerald-500' : 'text-amber-500 font-bold'}>{Number(data.frekuensi_kegiatan) >= 8 ? '✓' : '✗'}</span> Kegiatan rutin ≥ 8x per tahun</li>
                                        <li className="flex gap-1.5"><span className={kaderArr.length >= 5 ? 'text-emerald-500' : 'text-amber-500 font-bold'}>{kaderArr.length >= 5 ? '✓' : '✗'}</span> Jumlah kader minimal 5 orang</li>
                                        <li className="flex gap-1.5"><span className={above50 >= 3 ? 'text-emerald-500' : 'text-amber-500 font-bold'}>{above50 >= 3 ? '✓' : '✗'}</span> Minimal 3 layanan mencapai cakupan ≥ 50%</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all shadow-sm"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
