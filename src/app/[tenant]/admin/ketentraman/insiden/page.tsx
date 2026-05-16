"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAdminKetentramanResource } from "../use-admin-ketentraman-resource";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Siren, Users, Home, AlertCircle, X, Loader2, Save, MapPin, Activity, ShieldAlert, Zap, CheckCircle2 } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string;
    tanggal: string; jenis_kejadian: string; lokasi: string;
    korban_meninggal: number; korban_luka: number; pengungsi: number;
    kerusakan_rumah: number; kerugian_material: number;
    penanganan: string; status: string;
};

const statusColors: Record<string, string> = {
    open: "bg-rose-100 text-rose-700 border-rose-200",
    handling: "bg-amber-100 text-amber-700 border-amber-200",
    resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const statusLabels: Record<string, string> = { open: "Terbuka", handling: "Ditangani", resolved: "Selesai" };

const columns: Column<Row>[] = [
    { key: "kelurahan_nama" as keyof Row, label: "Kelurahan", sortable: true },
    {
        key: "tanggal", label: "Tgl Kejadian", sortable: true,
        render: (v) => <span className="text-gray-900 font-medium">{v ? new Date(String(v)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
    },
    {
        key: "jenis_kejadian", label: "Klasifikasi Bencana", sortable: true,
        render: (v) => <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">{String(v)}</span>
    },
    { key: "lokasi", label: "Titik Lokasi", render: (v) => <span className="text-gray-600 truncate max-w-[150px] inline-block" title={String(v)}>{String(v)}</span> },
    { key: "korban_meninggal", label: "Meninggal", render: (v) => <span className={Number(v) > 0 ? "text-rose-600 font-bold bg-rose-50 px-2 rounded-md" : "text-gray-400"}>{Number(v ?? 0)} Jiwa</span> },
    { key: "korban_luka", label: "Luka", render: (v) => <span className={Number(v) > 0 ? "text-amber-600 font-bold" : "text-gray-400"}>{Number(v ?? 0)} Orang</span> },
    { key: "pengungsi", label: "Pengungsi", render: (v) => <span className="text-blue-700 font-medium">{Number(v ?? 0).toLocaleString("id-ID")} Jiwa</span> },
    {
        key: "status", label: "Progres Penanganan", render: (v) =>
            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full border ${statusColors[String(v)] || statusColors.open}`}>
                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${String(v) === 'open' ? 'bg-rose-500' : String(v) === 'handling' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                {statusLabels[String(v)] || String(v)}
            </span>
    },
];

export default function InsidenPage() {
    const { data, isLoading, error, kelurahanOptions, kelMap, createRow, updateRow, deleteRow: deleteData } =
        useAdminKetentramanResource<Row>("insiden", "rekam insiden");
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const enrichedData = useMemo(() => {
        return [...data]
            .map(r => ({ ...r, kelurahan_nama: kelMap.get(r.kelurahan_id) || "-" }))
            .sort((a, b) => {
                const ca = (a as any).created_at || "";
                const cb = (b as any).created_at || "";
                return cb.localeCompare(ca);
            });
    }, [data, kelMap]);

    const totalKorban = data.reduce((s, r) => s + Number(r.korban_meninggal || 0) + Number(r.korban_luka || 0), 0);
    const totalPengungsi = data.reduce((s, r) => s + Number(r.pengungsi || 0), 0);
    const openCases = data.filter((r) => r.status === "open" || r.status === "handling").length;

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await updateRow(editRow.id, fd) : await createRow(fd); setModalOpen(false); setEditRow(null); }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menyimpan rekam insiden."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await deleteData(deleteRow.id); setDeleteRow(null); }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menghapus log kejadian."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Rekapitulasi Kejadian & Insiden" description="Pencatatan taktis peristiwa kedaruratan bencana, musibah, beserta pelacakan distribusi penanganan korbannya."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Ketentraman & Keamanan", href: "/admin/ketentraman" }, { label: "Log Kejadian" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Histori Insiden" value={data.length.toLocaleString("id-ID")} icon={Siren} gradient="stat-gradient-soft-blue" />
                <StatCard label="Dampak Korban Fisik" value={totalKorban.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-soft-rose" />
                <StatCard label="Eskalasi Pengungsi" value={totalPengungsi.toLocaleString("id-ID")} icon={Home} gradient="stat-gradient-soft-amber" />
                <StatCard label="Kasus Belum Tuntas" value={openCases.toLocaleString("id-ID")} icon={AlertCircle} gradient="stat-gradient-soft-emerald" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Pelaporan Insiden Baru" searchPlaceholder="Telusuri jenis atau status musibah..." />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <InsidenFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Log Insiden"
                message={deleteRow ? `Hapus data insiden "${deleteRow.jenis_kejadian}" tanggal ${deleteRow.tanggal ? new Date(deleteRow.tanggal).toLocaleDateString("id-ID") : "-"} di kelurahan "${kelMap.get(deleteRow.kelurahan_id) || '-'}"?` : ""} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   InsidenFormModal (Blue/Sky/Indigo Theme + Radio Cards)
   ═══════════════════════════════════════════════════════ */

function InsidenFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: Row | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
}) {
    const isEdit = !!editRow;

    const todayDate = new Date().toISOString().split("T")[0];

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "", tanggal: todayDate, jenis: "Banjir", jenis_kejadian: "Banjir", lokasi: "",
        korban_meninggal: 0, korban_luka: 0, pengungsi: 0, korban: 0,
        kerusakan_rumah: 0, kerugian_material: 0, kerugian: 0,
        penanganan: "", status: "open",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tanggal: editRow.tanggal ? String(editRow.tanggal).split("T")[0] : todayDate,
                jenis: editRow.jenis_kejadian ?? (editRow as any).jenis ?? "Banjir",
                jenis_kejadian: editRow.jenis_kejadian ?? (editRow as any).jenis ?? "Banjir",
                lokasi: editRow.lokasi ?? "",
                korban_meninggal: editRow.korban_meninggal ?? 0,
                korban_luka: editRow.korban_luka ?? 0,
                pengungsi: editRow.pengungsi ?? 0,
                korban: (editRow.korban_meninggal ?? 0) + (editRow.korban_luka ?? 0),
                kerusakan_rumah: editRow.kerusakan_rumah ?? 0,
                kerugian_material: editRow.kerugian_material ?? 0,
                kerugian: editRow.kerugian_material ?? 0,
                penanganan: editRow.penanganan ?? "",
                status: editRow.status ?? "open",
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "", tanggal: todayDate, jenis: "Banjir", jenis_kejadian: "Banjir", lokasi: "",
                korban_meninggal: 0, korban_luka: 0, pengungsi: 0, korban: 0,
                kerusakan_rumah: 0, kerugian_material: 0, kerugian: 0,
                penanganan: "", status: "open",
            });
        }
    }, [open, editRow, kelurahanOptions, todayDate]);

    function set(field: string, value: string | number) {
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            // Keep jenis and jenis_kejadian in sync
            if (field === "jenis_kejadian") next.jenis = value;
            return next;
        });
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    const jenisOptions = ["Banjir", "Longsor", "Kebakaran", "Angin Kencang", "Kriminalitas", "Kerusuhan", "Kecelakaan Fatal", "Lainnya"];

    // Radio Cards Definitions for Status Penanganan
    const statusCards = [
        { id: "open", title: "Terbuka", desc: "Baru / Belum asisten", icon: ShieldAlert, colorClass: "text-rose-600", bgActive: "bg-rose-50", borderActive: "border-rose-500", ringProps: "ring-rose-500" },
        { id: "handling", title: "Ditangani", desc: "Sedang berprogres", icon: Zap, colorClass: "text-amber-600", bgActive: "bg-amber-50", borderActive: "border-amber-500", ringProps: "ring-amber-500" },
        { id: "resolved", title: "Selesai", desc: "Penanganan tuntas", icon: CheckCircle2, colorClass: "text-emerald-600", bgActive: "bg-emerald-50", borderActive: "border-emerald-500", ringProps: "ring-emerald-500" },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue/Sky/Indigo Theme */}
                <div className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Siren className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Perbarui Log Insiden" : "Pelaporan Darurat & Insiden"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat kronologi, estimasi dampak, dan kontrol lintasan penanganan secara cermat.
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                            {/* Left Column: Logistik Waktu & Lokasi */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identifikasi Kejadian Dasar</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Koordinat Sektor (Kelurahan) <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.kelurahan_id as string) || ""}
                                                onChange={(e) => set("kelurahan_id", e.target.value)}
                                            >
                                                <option value="" disabled>Pilih Skala Wilayah</option>
                                                {kelurahanOptions.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Tanggal Peristiwa <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required type="date"
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.tanggal as string) || todayDate}
                                                onChange={(e) => set("tanggal", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Klasifikasi Insiden <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-blue-900 appearance-none"
                                                value={(form.jenis_kejadian as string) || "Banjir"}
                                                onChange={(e) => set("jenis_kejadian", e.target.value)}
                                            >
                                                {jenisOptions.map(j => (
                                                    <option key={j} value={j}>{j}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-blue-500">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Deskripsi Detail TKP <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            required rows={3} placeholder="Sebutkan patokan, RT/RW, nama bangunan, dll..."
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-300 resize-none"
                                            value={(form.lokasi as string) || ""}
                                            onChange={(e) => set("lokasi", e.target.value)}
                                        />
                                    </div>

                                    {/* Status Penanganan - Visual Radio Cards */}
                                    <div className="pt-2">
                                        <label className="block text-sm font-bold text-gray-900 mb-3">
                                            Progres Status Penanganan Lapangan
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {statusCards.map((card) => {
                                                const isActive = form.status === card.id;
                                                const Icon = card.icon;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={card.id}
                                                        onClick={() => set("status", card.id)}
                                                        className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${isActive
                                                            ? `${card.borderActive} ${card.bgActive} shadow-sm ring-1 ${card.ringProps}`
                                                            : `border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 opacity-80`
                                                            }`}
                                                    >
                                                        {isActive && (
                                                            <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${card.colorClass} bg-white flex items-center justify-center`}>
                                                                <div className={`w-2 h-2 rounded-full ${card.colorClass.replace('text', 'bg')}`} />
                                                            </div>
                                                        )}
                                                        <Icon className={`w-6 h-6 mb-2 ${isActive ? card.colorClass : "text-slate-400"}`} />
                                                        <span className={`text-xs font-bold text-center block ${isActive ? card.colorClass : "text-slate-600"}`}>
                                                            {card.title}
                                                        </span>
                                                        <span className={`text-[10px] text-center mt-1 sm:block hidden ${isActive ? card.colorClass.replace('text-', 'text-opacity-80 text-') : "text-slate-400"}`}>
                                                            {card.desc}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Dampak & Keterangan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <Activity className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Kalkulasi Dampak & Deklarasi Konklusif</span>
                                </div>

                                <div className="space-y-5">
                                    {/* Korban Manusia Grid */}
                                    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
                                        <h4 className="text-sm font-bold text-gray-900">Dampak Korban Jiwa & Cedera Fisik</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-rose-800 mb-1.5">Meninggal Dunia</label>
                                                <div className="relative">
                                                    <input
                                                        type="number" min={0}
                                                        className="w-full pl-3 pr-10 py-2 bg-rose-50 border border-rose-200 rounded-lg text-sm font-bold text-rose-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-center"
                                                        value={(form.korban_meninggal as number) || 0}
                                                        onChange={(e) => set("korban_meninggal", Number(e.target.value))}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-400">Jiwa</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-amber-800 mb-1.5">Luka & Cedera</label>
                                                <div className="relative">
                                                    <input
                                                        type="number" min={0}
                                                        className="w-full pl-3 pr-10 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-center"
                                                        value={(form.korban_luka as number) || 0}
                                                        onChange={(e) => set("korban_luka", Number(e.target.value))}
                                                    />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-400">Orang</span>
                                                </div>
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <label className="block text-xs font-semibold text-indigo-800 mb-1.5">Pengungsi</label>
                                                <div className="relative">
                                                    <input
                                                        type="number" min={0}
                                                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center"
                                                        value={(form.pengungsi as number) || 0}
                                                        onChange={(e) => set("pengungsi", Number(e.target.value))}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-400">Jiwa</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">Rumah Tinggal Terdampak</label>
                                            <div className="relative">
                                                <input
                                                    type="number" min={0}
                                                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                    value={(form.kerusakan_rumah as number) || 0}
                                                    onChange={(e) => set("kerusakan_rumah", Number(e.target.value))}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">Bangunan</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">Estimasi Kerugian Materiel</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">Rp</span>
                                                <input
                                                    type="number" min={0} step={1000}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                    value={(form.kerugian_material as number) || 0}
                                                    onChange={(e) => set("kerugian_material", Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Risalah Catatan Penanganan
                                        </label>
                                        <textarea
                                            rows={4} placeholder="Jelaskan secara ringkas proses mitigasi, evakuasi, hingga status posko (bila ada)..."
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-300 resize-none"
                                            value={(form.penanganan as string) || ""}
                                            onChange={(e) => set("penanganan", e.target.value)}
                                        />
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400 font-bold">*</span> Wajib diinformasikan
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors"
                            >
                                Abaikan Operasi
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Sinkronisasi Perubahan Log" : "Penetapan Formulir Bencana"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
