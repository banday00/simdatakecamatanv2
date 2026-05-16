"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Hammer, CheckCircle, Clock, Banknote, X, Loader2, Save, FileText, Settings2, MapPin } from "lucide-react";

/* ── DB schema: infra_development ──
   id, tenant_id, kelurahan_id, tahun, nama_proyek,
   sumber_dana, anggaran, realisasi, progress_persen, status, created_at
*/

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; tahun: number;
    nama_proyek: string; sumber_dana: string;
    anggaran: number; realisasi: number;
    progress_persen: number; status: string;
    volume?: number | null; satuan?: string | null;
    instansi_pelaksana?: string | null;
    keterangan?: string | null;
    lokasi?: string | null;
};

const statusColors: Record<string, string> = {
    Rencana: "bg-blue-100 text-blue-700", Proses: "bg-amber-100 text-amber-700",
    Selesai: "bg-green-100 text-green-700", Bermasalah: "bg-red-100 text-red-700",
};

const SUMBER_DANA_OPTIONS = ["APBD Kota", "APBD Provinsi", "APBN", "Dana Desa", "CSR", "Swadaya"];
const STATUS_OPTIONS = ["Rencana", "Proses", "Selesai", "Bermasalah"];
const SATUAN_OPTIONS = ["m", "m²", "m³", "km", "unit", "paket", "ls (lump sum)", "buah", "titik", "lokal", "Ha"];

export default function PembangunanPage() {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();
    const [data, setData] = useState<Row[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [detailRow, setDetailRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isKelurahanAdmin = profile?.role === "admin_kelurahan";
    const allowedKelurahanId = isKelurahanAdmin ? profile?.kelurahan_id : null;
    const kelurahanOptions = kelurahans
        .filter((k) => !allowedKelurahanId || k.id === allowedKelurahanId)
        .map((k) => ({ label: k.nama, value: k.id }));
    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach(k => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/infrastruktur/pembangunan`, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || "Gagal memuat data pembangunan.");
            setData(json.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat data pembangunan.");
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Enrich + sort newest first
    const enrichedData = useMemo(() =>
        [...data]
            .sort((a, b) => {
                const da = (a as any).created_at || '';
                const db = (b as any).created_at || '';
                return db.localeCompare(da);
            })
            .map(r => ({
                ...r,
                kelurahan_nama: kelMap.get(r.kelurahan_id) || '-',
            })),
        [data, kelMap]
    );

    // Stats
    const total = data.length;
    const selesai = data.filter((r) => r.status === "Selesai").length;
    const proses = data.filter((r) => r.status === "Proses").length;
    const totalAnggaran = data.reduce((s, r) => s + Number(r.anggaran || 0), 0);

    const columns: Column<Row>[] = [
        { key: "nama_proyek", label: "Nama Proyek", sortable: true },
        {
            key: "kelurahan_nama" as any, label: "Kelurahan", sortable: true,
            render: (v) => <span className="text-sm text-gray-600">{String(v)}</span>
        },
        { key: "tahun", label: "Tahun", sortable: true },
        {
            key: "status", label: "Status", render: (v) =>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[String(v)] || statusColors.Rencana}`}>{String(v)}</span>
        },
        {
            key: "progress_persen", label: "Progress", sortable: true,
            render: (v) => {
                const pct = Number(v ?? 0);
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium">{pct}%</span>
                    </div>
                );
            }
        },
        {
            key: "volume", label: "Volume", sortable: true,
            render: (v, row) => v != null
                ? <span className="text-sm text-gray-700 font-medium">{Number(v).toLocaleString('id-ID')} <span className="text-gray-400">{String((row as any).satuan || '')}</span></span>
                : <span className="text-gray-400 text-xs">-</span>
        },
    ];

    async function handleSubmit(fd: Record<string, unknown>) {
        if (!tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const url = editRow
                ? `/api/tenants/${tenant.slug}/admin/infrastruktur/pembangunan/${editRow.id}`
                : `/api/tenants/${tenant.slug}/admin/infrastruktur/pembangunan`;
            const res = await fetch(url, {
                method: editRow ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fd),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || "Gagal menyimpan data pembangunan.");
            setModalOpen(false); setEditRow(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menyimpan data pembangunan.");
        } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.slug) return; setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/infrastruktur/pembangunan/${deleteRow.id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || "Gagal menghapus data pembangunan.");
            setDeleteRow(null);
            await fetchData();
        }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menghapus data pembangunan."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Data Pembangunan" description="Manajemen proyek infrastruktur, realisasi anggaran, dan status progres di lapangan."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Infrastruktur", href: "/admin/infrastruktur" }, { label: "Pembangunan" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Proyek" value={total} icon={Hammer} gradient="stat-gradient-soft-blue" />
                <StatCard label="Tuntas Dibangun" value={selesai} icon={CheckCircle} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Tahap Konstruksi" value={proses} icon={Clock} gradient="stat-gradient-soft-amber" />
                <StatCard label="Total Anggaran" value={`Rp ${(totalAnggaran / 1e9).toFixed(1)} M`} icon={Banknote} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onView={(r) => setDetailRow(r)}
                onDelete={(r) => setDeleteRow(r)} addLabel="Tambah Proyek" searchPlaceholder="Cari nama proyek..." />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <PembangunanFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm
                open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Data Proyek?"
                message={deleteRow ? `Yakin ingin menghapus proyek "${deleteRow.nama_proyek}"? Data yang dihapus tidak bisa dikembalikan.` : ""}
            />

            <PembangunanDetailModal
                open={!!detailRow}
                onClose={() => setDetailRow(null)}
                row={detailRow}
                kelMap={kelMap}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PembangunanFormModal (Blue Theme)
   ═══════════════════════════════════════════════════════ */

function PembangunanFormModal({
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

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "", tahun: new Date().getFullYear(),
        nama_proyek: "", sumber_dana: "APBD Kota",
        anggaran: 0, realisasi: 0,
        progress_persen: 0, status: "Rencana",
        volume: "", satuan: "m", instansi_pelaksana: "", keterangan: "", lokasi: "",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                nama_proyek: editRow.nama_proyek ?? "",
                sumber_dana: editRow.sumber_dana ?? "APBD Kota",
                anggaran: editRow.anggaran ?? 0,
                realisasi: editRow.realisasi ?? 0,
                progress_persen: editRow.progress_persen ?? 0,
                status: editRow.status ?? "Rencana",
                volume: editRow.volume ?? "",
                satuan: editRow.satuan ?? "m",
                instansi_pelaksana: editRow.instansi_pelaksana ?? "",
                keterangan: editRow.keterangan ?? "",
                lokasi: editRow.lokasi ?? "",
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "",
                tahun: new Date().getFullYear(),
                nama_proyek: "", sumber_dana: "APBD Kota",
                anggaran: 0, realisasi: 0,
                progress_persen: 0, status: "Rencana",
                volume: "", satuan: "m", instansi_pelaksana: "", keterangan: "", lokasi: "",
            });
        }
    }, [open, editRow, kelurahanOptions]);

    function set(field: string, value: string | number) {
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            // Jika status Selesai → paksa progress 100%
            if (field === "status" && value === "Selesai") next.progress_persen = 100;
            return next;
        });
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            ...form,
            anggaran: Number(form.anggaran),
            realisasi: Number(form.realisasi),
            progress_persen: Number(form.progress_persen),
            tahun: Number(form.tahun),
            volume: form.volume !== "" && form.volume !== null ? Number(form.volume) : null,
        };
        onSubmit(payload);
    }

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Hammer className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Data Proyek" : "Tambah Proyek Baru"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat rincian proyek infrastruktur dan progres di lapangan.
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

                            {/* Left Column: Identitas & Pendanaan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas & Anggaran</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Kelurahan <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.kelurahan_id as string) || ""}
                                                onChange={(e) => set("kelurahan_id", e.target.value)}
                                            >
                                                <option value="" disabled>Pilih Kelurahan</option>
                                                {kelurahanOptions.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Tahun Anggaran <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required type="number" min={2000} max={2100}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.tahun as number) || new Date().getFullYear()}
                                                onChange={(e) => set("tahun", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Proyek <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required type="text" placeholder="Cth: Pembangunan Turap Sungai Ciliwung"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.nama_proyek as string) || ""}
                                            onChange={(e) => set("nama_proyek", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Instansi Pelaksana
                                        </label>
                                        <input
                                            type="text" placeholder="Cth: Dinas PUPR Kota Bogor"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.instansi_pelaksana as string) || ""}
                                            onChange={(e) => set("instansi_pelaksana", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Sumber Pendanaan <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.sumber_dana as string) || "APBD Kota"}
                                            onChange={(e) => set("sumber_dana", e.target.value)}
                                        >
                                            {SUMBER_DANA_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Anggaran (Rp) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required type="number" min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.anggaran as number) || 0}
                                                onChange={(e) => set("anggaran", Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Realisasi (Rp)
                                            </label>
                                            <input
                                                type="number" min={0}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.realisasi as number) || 0}
                                                onChange={(e) => set("realisasi", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Volume
                                            </label>
                                            <input
                                                type="number" min={0} step="0.01" placeholder="Cth: 250"
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.volume as string | number) ?? ""}
                                                onChange={(e) => set("volume", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Satuan
                                            </label>
                                            <select
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.satuan as string) || "m"}
                                                onChange={(e) => set("satuan", e.target.value)}
                                            >
                                                {SATUAN_OPTIONS.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Progres */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <Settings2 className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Status & Progres</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                                            Status Lapangan
                                        </label>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                            {STATUS_OPTIONS.map((st) => (
                                                <button
                                                    key={st} type="button" onClick={() => set("status", st)}
                                                    className={`px-2 py-2.5 text-xs font-semibold rounded-xl border transition-all text-center uppercase tracking-wide ${form.status === st
                                                        ? st === "Selesai" ? "bg-emerald-100 text-emerald-800 border-emerald-400 ring-1 ring-emerald-500"
                                                            : st === "Proses" ? "bg-amber-100 text-amber-800 border-amber-400 ring-1 ring-amber-500"
                                                                : st === "Bermasalah" ? "bg-red-100 text-red-800 border-red-400 ring-1 ring-red-500"
                                                                    : "bg-blue-100 text-blue-800 border-blue-400 ring-1 ring-blue-500"
                                                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="block text-sm font-semibold text-gray-700">
                                                Realisasi Progres
                                            </label>
                                            <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md">
                                                {String(form.progress_persen)}%
                                            </span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100" step="1"
                                            readOnly={form.status === "Selesai"}
                                            disabled={form.status === "Selesai"}
                                            className={`w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                                                form.status === "Selesai"
                                                    ? "bg-emerald-200 accent-emerald-500 cursor-not-allowed opacity-70"
                                                    : "bg-gray-200 accent-indigo-600"
                                            }`}
                                            value={(form.progress_persen as number) || 0}
                                            onChange={(e) => set("progress_persen", Number(e.target.value))}
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium px-1">
                                            <span>Mulai (0%)</span>
                                            <span>{form.status === "Selesai" ? "✅ Otomatis 100% (Selesai)" : "Serah Terima (100%)"}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Lokasi
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Cth: Jl. Raya Bogor KM 40..."
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                                            value={(form.lokasi as string) || ""}
                                            onChange={(e) => set("lokasi", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Keterangan
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Catatan tambahan mengenai proyek ini..."
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                                            value={(form.keterangan as string) || ""}
                                            onChange={(e) => set("keterangan", e.target.value)}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 mt-4">
                                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                        <p className="text-xs text-blue-800 leading-relaxed">
                                            Data pembangunan mengacu pada Perpres No. 38/2015 tentang Kerjasama Pemerintah dalam Penyediaan Infrastruktur.
                                            Pastikan progres dan realisasi anggaran diperbarui berkala.
                                        </p>
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Simpan Perubahan" : "Tambah Proyek"}
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
   PembangunanDetailModal (Read-only detail view)
   ═══════════════════════════════════════════════════════ */

function PembangunanDetailModal({
    open, onClose, row, kelMap,
}: {
    open: boolean;
    onClose: () => void;
    row: Row | null;
    kelMap: Map<string, string>;
}) {
    if (!open || !row) return null;

    const statusColorsFull: Record<string, string> = {
        Rencana: "bg-blue-100 text-blue-700 border-blue-200",
        Proses: "bg-amber-100 text-amber-700 border-amber-200",
        Selesai: "bg-emerald-100 text-emerald-700 border-emerald-200",
        Bermasalah: "bg-red-100 text-red-700 border-red-200",
    };

    const pct = row.progress_persen || 0;
    const progressColor = pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : pct >= 25 ? "bg-amber-500" : "bg-red-400";

    const InfoItem = ({ label, value, fullWidth = false }: { label: string; value: React.ReactNode; fullWidth?: boolean }) => (
        <div className={fullWidth ? "col-span-2" : ""}>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
            <div className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-300">-</span>}</div>
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white rounded-full" />
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white rounded-full" />
                    </div>
                    <div className="relative flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-white/80" />
                                <span className="text-white/70 text-xs font-medium uppercase tracking-wider">Detail Proyek</span>
                            </div>
                            <h2 className="text-xl font-bold text-white truncate">{row.nama_proyek}</h2>
                            <p className="text-blue-100 text-sm mt-1">{kelMap.get(row.kelurahan_id) || "-"} • Tahun {row.tahun}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Tutup">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Progress Section */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700">Realisasi Progress</span>
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${statusColorsFull[row.status] || statusColorsFull.Rencana}`}>
                                    {row.status}
                                </span>
                                <span className="text-lg font-black text-gray-800">{pct}%</span>
                            </div>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${progressColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <InfoItem label="Kelurahan" value={kelMap.get(row.kelurahan_id) || "-"} />
                        <InfoItem label="Tahun Anggaran" value={row.tahun} />
                        <InfoItem label="Sumber Dana" value={
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                                {row.sumber_dana}
                            </span>
                        } />
                        <InfoItem label="Instansi Pelaksana" value={row.instansi_pelaksana} />
                        <InfoItem label="Anggaran" value={`Rp ${Number(row.anggaran || 0).toLocaleString("id-ID")}`} />
                        <InfoItem label="Realisasi" value={`Rp ${Number(row.realisasi || 0).toLocaleString("id-ID")}`} />
                        <InfoItem label="Volume" value={
                            row.volume != null
                                ? <>{Number(row.volume).toLocaleString('id-ID')} <span className="text-gray-400">{row.satuan || ''}</span></>
                                : null
                        } />
                        <InfoItem label="Satuan" value={row.satuan} />
                    </div>

                    {/* Lokasi */}
                    {row.lokasi && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-blue-500 font-semibold uppercase tracking-wider mb-1">Lokasi</p>
                                    <p className="text-sm text-blue-800 leading-relaxed">{row.lokasi}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Keterangan */}
                    {row.keterangan && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Settings2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-amber-500 font-semibold uppercase tracking-wider mb-1">Keterangan</p>
                                    <p className="text-sm text-amber-800 leading-relaxed">{row.keterangan}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
                    <button onClick={onClose}
                        className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                        Tutup
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
