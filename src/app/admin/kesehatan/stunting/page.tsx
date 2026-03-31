"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Baby, AlertTriangle, TrendingDown, Target, X, Loader2, Save, MapPin, Activity, ClipboardList, ListFilter, Plus, Trash2, FileText, Calendar } from "lucide-react";

type StuntingBNBARow = Record<string, unknown> & {
    id: string;
    tenant_id?: string;
    kelurahan_id: string;
    posyandu_id?: string;
    nik_anak: string;
    nama_anak: string;
    jenis_kelamin: "L" | "P";
    tanggal_lahir: string;
    nama_ortu: string;
    alamat?: string;
    rt_rw?: string;
    tanggal_pengukuran: string;
    berat_badan: number;
    tinggi_badan: number;
    status_tbu: string;
    status_bbu: string;
    intervensi_diterima: string[];
};
type StuntingRow = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    tahun: number;
    bulan?: number;
    balita_total: number;
    balita_stunting: number;
    balita_gizi_buruk?: number;
    balita_gizi_kurang?: number;
};

const columns: Column<StuntingRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "balita_total",
        label: "Balita",
        sortable: true,
        render: (val) => Number(val ?? 0).toLocaleString("id-ID"),
    },
    {
        key: "balita_stunting",
        label: "Stunting",
        sortable: true,
        render: (val) => <span className="font-medium text-red-600">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "prevalensi",
        label: "Prevalensi",
        sortable: true,
        render: (val) => {
            const v = Number(val ?? 0);
            return (
                <span className={`font-semibold ${v > 20 ? "text-red-600" : v > 10 ? "text-amber-600" : "text-green-600"}`}>
                    {v.toFixed(1)}%
                </span>
            );
        },
    },
    {
        key: "balita_gizi_buruk",
        label: "Gizi Buruk",
        render: (val) => Number(val ?? 0).toLocaleString("id-ID"),
    },
];

const bnbaColumns: Column<StuntingBNBARow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "nik_anak", label: "NIK", sortable: true, render: (val) => <span className="font-mono text-xs text-slate-500">{String(val)}</span> },
    { key: "nama_anak", label: "Nama Anak", sortable: true, render: (val, r) => (
        <div>
            <div className="font-semibold text-slate-800">{String(val)}</div>
            <div className="text-[10px] text-slate-400 capitalize">{r.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
        </div>
    )},
    { key: "tanggal_pengukuran", label: "Tgl Pengukuran", sortable: true, render: (val) => <span className="text-sm">{String(val)}</span> },
    { key: "status_tbu", label: "Status (TB/U)", sortable: true, render: (val) => {
        const status = String(val);
        const isStunting = status === 'Sangat Pendek' || status === 'Pendek';
        return <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${isStunting ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{status}</span>;
    }},
    { key: "status_bbu", label: "Status (BB/U)", sortable: true, render: (val) => {
        const status = String(val);
        const isBuruk = status === 'Gizi Buruk';
        const isKurang = status === 'Gizi Kurang';
        return <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${isBuruk ? 'bg-red-50 text-red-700 border-red-200' : isKurang ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{status}</span>;
    }},
];

const bulanOptions = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i).toLocaleString("id-ID", { month: "long" }),
    value: String(i + 1)
}));

export default function StuntingPage() {
    const { kelurahans } = useTenant();
    const [activeTab, setActiveTab] = useState<"bnba" | "agregat">("bnba");

    // BNBA CRUD (Editable)
    const bnbaCrud = useCrud<StuntingBNBARow>({ table: "health_stunting_bnba" });
    
    // Aggregate View (Read-Only)
    const agregatCrud = useCrud<StuntingRow>({ 
        table: "health_stunting_agregat_view",
        orderBy: "tahun" 
    });

    // Posyandu references
    const { data: posyandu } = useCrud<{id: string, nama: string, kelurahan_id: string}>({ table: "health_posyandu" });

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<StuntingBNBARow | null>(null);
    const [deleteRow, setDeleteRow] = useState<StuntingBNBARow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = bnbaCrud.isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === bnbaCrud.filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Enrich aggregate data
    const enrichedAgregat = agregatCrud.data.map((row) => {
        const total = Number(row.balita_total) || 0;
        const stunting = Number(row.balita_stunting) || 0;
        const prevalensi = total > 0 ? (stunting / total) * 100 : 0;
        return {
            ...row,
            id: row.id || `${row.kelurahan_id}-${row.tahun}-${row.bulan}`,
            kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
            prevalensi,
        };
    });

    // Enrich BNBA data
    const enrichedBnba = bnbaCrud.data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    // Stats calculations from the Aggregate View
    const totalBalita = agregatCrud.data.reduce((s, r) => s + (Number(r.balita_total) || 0), 0);
    const totalStunting = agregatCrud.data.reduce((s, r) => s + (Number(r.balita_stunting) || 0), 0);
    const avgPrevalensi = totalBalita > 0 ? (totalStunting / totalBalita) * 100 : 0;

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await bnbaCrud.update(editRow.id, formData);
            else await bnbaCrud.create(formData);
            setModalOpen(false);
            setEditRow(null);
            // Refresh aggregate view after updating BNBA
            agregatCrud.fetchData(); 
        } catch (err: any) {
            console.error("[Stunting BNBA] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { 
            await bnbaCrud.remove(deleteRow.id); 
            setDeleteRow(null); 
            agregatCrud.fetchData();
        }
        catch (err: any) {
            console.error("[Stunting BNBA] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Data Stunting BNBA"
                description="Pencatatan rincian status gizi balita By Name By Address (E-PPGBM Nasional) terintegrasi Posyandu"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kesehatan", href: "/admin/kesehatan" },
                    { label: "Stunting / E-PPGBM" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Balita Pendataan" value={totalBalita.toLocaleString("id-ID")} icon={Baby} gradient="stat-gradient-blue" />
                <StatCard label="Kasus Stunting" value={totalStunting.toLocaleString("id-ID")} icon={AlertTriangle} gradient="stat-gradient-rose" />
                <StatCard label="Prevalensi Rata-rata" value={`${avgPrevalensi.toFixed(1)}%`} icon={TrendingDown} gradient="stat-gradient-amber" />
                <StatCard label="Target Nasional" value="14%" icon={Target} gradient="stat-gradient-emerald" />
            </div>

            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("bnba")}
                    className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "bnba" 
                        ? "border-blue-600 text-blue-700 bg-blue-50/50" 
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    Data Individu (BNBA)
                </button>
                <button
                    onClick={() => setActiveTab("agregat")}
                    className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "agregat" 
                        ? "border-blue-600 text-blue-700 bg-blue-50/50" 
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    Laporan Agregasi Otomatis
                </button>
            </div>

            <div className="pt-2">
                {activeTab === "bnba" ? (
                    <DataTable
                        columns={bnbaColumns} data={enrichedBnba} isLoading={bnbaCrud.isLoading}
                        onAdd={() => { setEditRow(null); setModalOpen(true); }}
                        onEdit={(row) => { setEditRow(row as StuntingBNBARow); setModalOpen(true); }}
                        onDelete={(row) => setDeleteRow(row as StuntingBNBARow)}
                        addLabel="Tambah Data Anak" searchPlaceholder="Cari NIK atau Nama..."
                    />
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex items-start gap-3">
                            <ListFilter className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-semibold text-teal-800 text-sm">Laporan Agregat Terkalkulasi Otomatis</h4>
                                <p className="text-teal-700 text-xs mt-0.5">Seluruh angka pada tab ini dihitung secara real-time dari data input BNBA per bulan pengukurannya. Anda tidak perlu merekap data stunting dan gizi buruk secara manual.</p>
                            </div>
                        </div>
                        <DataTable
                            columns={columns} data={enrichedAgregat} isLoading={agregatCrud.isLoading}
                            searchPlaceholder="Cari rekap stunting (opsional)..."
                        />
                    </div>
                )}
            </div>

            <StuntingBNBAFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahanOptions={kelurahanOptions}
                posyandus={posyandu as any}
                isKelurahanAdmin={bnbaCrud.isKelurahanAdmin}
                filterKelurahanId={bnbaCrud.filterKelurahanId}
            />

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                title="Hapus Data BNBA"
                message={`Apakah Anda yakin ingin menghapus data anak "${deleteRow?.nama_anak}"? Rekapitulasi agregat bulanan akan diperbarui otomatis.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   StuntingBNBAFormModal — Modal untuk Tambah Data E-PPGBM BNBA
   ═══════════════════════════════════════════════════════ */

function StuntingBNBAFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, posyandus, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: StuntingBNBARow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    posyandus: { id: string; nama: string; kelurahan_id?: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;

    const statusTbuOptions = ["Normal", "Pendek", "Sangat Pendek", "Tinggi"];
    const statusBbuOptions = ["Normal", "Risiko Lebih", "Gizi Lebih", "Obesitas", "Gizi Kurang", "Gizi Buruk"];
    
    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "", posyandu_id: "", nik_anak: "", nama_anak: "", jenis_kelamin: "L",
        tanggal_lahir: "", nama_ortu: "", alamat: "", rt_rw: "", 
        tanggal_pengukuran: new Date().toISOString().split('T')[0],
        berat_badan: "", tinggi_badan: "", status_tbu: "Normal", status_bbu: "Normal",
        intervensi_diterima: [] as string[]
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                posyandu_id: editRow.posyandu_id ?? "",
                nik_anak: editRow.nik_anak ?? "",
                nama_anak: editRow.nama_anak ?? "",
                jenis_kelamin: editRow.jenis_kelamin ?? "L",
                tanggal_lahir: editRow.tanggal_lahir ?? "",
                nama_ortu: editRow.nama_ortu ?? "",
                alamat: editRow.alamat ?? "",
                rt_rw: editRow.rt_rw ?? "",
                tanggal_pengukuran: editRow.tanggal_pengukuran ?? new Date().toISOString().split('T')[0],
                berat_badan: editRow.berat_badan ?? "",
                tinggi_badan: editRow.tinggi_badan ?? "",
                status_tbu: editRow.status_tbu ?? "Normal",
                status_bbu: editRow.status_bbu ?? "Normal",
                intervensi_diterima: Array.isArray(editRow.intervensi_diterima) ? editRow.intervensi_diterima : [],
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
                posyandu_id: "", nik_anak: "", nama_anak: "", jenis_kelamin: "L",
                tanggal_lahir: "", nama_ortu: "", alamat: "", rt_rw: "",
                tanggal_pengukuran: new Date().toISOString().split('T')[0],
                berat_badan: "", tinggi_badan: "", status_tbu: "Normal", status_bbu: "Normal", intervensi_diterima: []
            });
        }
    }, [open, editRow, isKelurahanAdmin, filterKelurahanId]);

    function set(field: string, value: string | number | string[]) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function toggleIntervensi(val: string) {
        const arr = (form.intervensi_diterima as string[]) || [];
        if (arr.includes(val)) {
            setForm(p => ({ ...p, intervensi_diterima: arr.filter(x => x !== val) }));
        } else {
            setForm(p => ({ ...p, intervensi_diterima: [...arr, val] }));
        }
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        if (String(form.nik_anak).length !== 16) {
            alert("NIK Anak harus 16 digit angka.");
            return;
        }

        const payload = { ...form };
        payload.berat_badan = Number(payload.berat_badan) || null;
        payload.tinggi_badan = Number(payload.tinggi_badan) || null;
        if (!payload.posyandu_id) payload.posyandu_id = null;
        
        onSubmit(payload);
    }

    if (!open) return null;

    const inputClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm";
    
    const availablePosyandus = form.kelurahan_id 
        ? posyandus.filter(p => String(p.kelurahan_id) === String(form.kelurahan_id)) 
        : posyandus;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <Baby className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Riwayat Anak" : "Pendaftaran Pengukuran Baru"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Pendataan individu By Name By Address sesuai form standar Posyandu / E-PPGBM.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Tutup">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/30">
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                            
                            {/* Kiri : Identitas & Demografi */}
                            <div className="lg:col-span-3 space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas Anak & Lokasi</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Kelurahan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={String(form.kelurahan_id)}
                                            onChange={(e) => set("kelurahan_id", e.target.value)}
                                            required
                                            className={inputClass}
                                            disabled={kelurahanOptions.length === 1}
                                        >
                                            <option value="">— Pilih Kelurahan —</option>
                                            {kelurahanOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Posyandu</label>
                                        <select
                                            value={String(form.posyandu_id) || ""}
                                            onChange={(e) => set("posyandu_id", e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">— Tidak di Posyandu —</option>
                                            {availablePosyandus.map((p) => (
                                                <option key={p.id} value={p.id}>{p.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-3">
                                    <div className="col-span-3">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            NIK Anak <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={String(form.nik_anak)}
                                            onChange={(e) => set("nik_anak", e.target.value.replace(/[^0-9]/g, ''))}
                                            required minLength={16} maxLength={16}
                                            className={inputClass + " font-mono tracking-wider"}
                                            placeholder="16 digit angka"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenis Kelamin</label>
                                        <select
                                            value={String(form.jenis_kelamin)}
                                            onChange={(e) => set("jenis_kelamin", e.target.value)}
                                            required className={inputClass}
                                        >
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Nama Lengkap Anak <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text" required
                                        value={String(form.nama_anak)}
                                        onChange={(e) => set("nama_anak", e.target.value)}
                                        className={inputClass}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Tanggal Lahir <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date" required
                                            value={String(form.tanggal_lahir)}
                                            onChange={(e) => set("tanggal_lahir", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Orang Tua <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text" required
                                            value={String(form.nama_ortu)}
                                            onChange={(e) => set("nama_ortu", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat / Jalan</label>
                                        <input
                                            type="text"
                                            value={String(form.alamat)}
                                            onChange={(e) => set("alamat", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">RT/RW</label>
                                        <input
                                            type="text" placeholder="001/002"
                                            value={String(form.rt_rw)}
                                            onChange={(e) => set("rt_rw", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Kanan : Pengukuran Antropometri */}
                            <div className="lg:col-span-3 space-y-5 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-8 mt-6 lg:mt-0 pt-6 lg:pt-0">
                                <div className="flex items-center gap-2 pb-2 border-b border-orange-100">
                                    <Activity className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Hasil Pengukuran</span>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Tanggal Pengukuran <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date" required
                                        value={String(form.tanggal_pengukuran)}
                                        onChange={(e) => set("tanggal_pengukuran", e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                        className={inputClass}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Laporan agregat bulanan akan dihitung pada bulan tahun yang dipilih di sini.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Berat Badan (kg) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number" step="0.01" min={0} required
                                            value={String(form.berat_badan)}
                                            onChange={(e) => set("berat_badan", e.target.value)}
                                            className={inputClass + " font-mono text-lg"}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tinggi Badan (cm) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number" step="0.01" min={0} required
                                            value={String(form.tinggi_badan)}
                                            onChange={(e) => set("tinggi_badan", e.target.value)}
                                            className={inputClass + " font-mono text-lg"}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status Gizi (BB/U)</label>
                                        <select
                                            required value={String(form.status_bbu)}
                                            onChange={(e) => set("status_bbu", e.target.value)}
                                            className={`${inputClass} font-semibold ${
                                                form.status_bbu === 'Gizi Buruk' ? 'text-red-600 bg-red-50 border-red-200' :
                                                form.status_bbu === 'Gizi Kurang' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                                form.status_bbu !== 'Normal' ? 'text-orange-600 bg-orange-50 border-orange-200' : ''
                                            }`}
                                        >
                                            {statusBbuOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status Stunting (TB/U)</label>
                                        <select
                                            required value={String(form.status_tbu)}
                                            onChange={(e) => set("status_tbu", e.target.value)}
                                            className={`${inputClass} font-semibold ${
                                                form.status_tbu === 'Sangat Pendek' ? 'text-red-600 bg-red-50 border-red-200' :
                                                form.status_tbu === 'Pendek' ? 'text-amber-600 bg-amber-50 border-amber-200' : ''
                                            }`}
                                        >
                                            {statusTbuOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Intervensi & Bantuan Diterima</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['PMT Pemulihan', 'Susu Formula', 'Vitamin A', 'Obat Cacing', 'Edukasi Gizi'].map((v) => {
                                            const active = (form.intervensi_diterima as string[]).includes(v);
                                            return (
                                                <button
                                                    type="button" key={v}
                                                    onClick={() => toggleIntervensi(v)}
                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                                        active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {active ? '✓ ' : ''}{v}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Wajib diisi (Sesuai E-PPGBM)
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button
                                type="button" onClick={onClose}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit" disabled={isSubmitting}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Simpan Rekam Medis" : "Simpan Data Anak"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
