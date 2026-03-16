"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { HandHeart, Users, Banknote, BarChart3, X, Loader2, Save, BadgeCheck, Clock, XCircle, HeartHandshake, MapPin } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; tahun: number; bulan: string;
    jenis_bantuan: string; jumlah_penerima: number; jumlah_kk_penerima: number;
    total_anggaran: number; sumber_anggaran: string; status_penyaluran: string; pct_tersalurkan: number;
};

const bulanList = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const columns: Column<Row>[] = [
    { key: "kelurahan_nama" as keyof Row, label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "bulan", label: "Bulan", sortable: true, render: (v) => {
            return bulanList[Number(v)] || "-";
        }
    },
    {
        key: "jenis_bantuan", label: "Jenis Bantuan", sortable: true,
        render: (v) => <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">{String(v)}</span>
    },
    { key: "jumlah_penerima", label: "Penerima Jiwa", sortable: true, render: (v) => Number(v ?? 0).toLocaleString("id-ID") },
    { key: "jumlah_kk_penerima", label: "KK", render: (v) => Number(v ?? 0).toLocaleString("id-ID") },
    { key: "total_anggaran", label: "Anggaran (Rp)", sortable: true, render: (v) => `Rp ${Number(v ?? 0).toLocaleString("id-ID")}` },
    {
        key: "status_penyaluran", label: "Status", render: (v, row) => {
            const status = String(v ?? "Belum");
            const c: Record<string, string> = { Tersalurkan: "bg-emerald-100 text-emerald-700 border-emerald-200", Proses: "bg-amber-100 text-amber-700 border-amber-200", Belum: "bg-gray-100 text-gray-600 border-gray-200" };
            return (
                <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${c[status] || c.Belum}`}>
                        {status}
                    </span>
                    {status === "Tersalurkan" && row.pct_tersalurkan && (
                        <span className="text-[10px] text-gray-500 font-semibold">{Number(row.pct_tersalurkan).toFixed(1)}%</span>
                    )}
                </div>
            )
        }
    },
];

export default function BantuanSosialPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "social_assistance" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = kelurahans.map((k) => ({ label: k.nama, value: k.id }));
    const kelMap = useMemo(() => {
        const m = new Map<string, string>();
        kelurahans.forEach(k => m.set(k.id, k.nama));
        return m;
    }, [kelurahans]);

    // Enrich data with kelurahan name + sort newest first
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

    const totalPenerima = data.reduce((s, r) => s + (r.jumlah_penerima || 0), 0);
    const totalAnggaran = data.reduce((s, r) => s + (r.total_anggaran || 0), 0);
    const tersalurkan = data.filter((r) => r.status_penyaluran === "Tersalurkan").length;

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await update(editRow.id, fd) : await create(fd); setModalOpen(false); setEditRow(null); }
        catch { alert("Gagal menyimpan data bantuan sosial."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data bantuan sosial."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Bantuan Sosial" description="Data PKH, BPNT, BST, dan distribusi bantuan sosial lainnya"
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Sosial", href: "/admin/sosial" }, { label: "Bantuan" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Histori Bantuan" value={data.length} icon={BarChart3} gradient="stat-gradient-soft-blue" />
                <StatCard label="Total Penerima Bantuan" value={totalPenerima.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Total Anggaran" value={`Rp ${(totalAnggaran / 1e9).toFixed(1)} M`} icon={Banknote} gradient="stat-gradient-soft-amber" />
                <StatCard label="Bantuan Tersalurkan" value={tersalurkan} icon={HandHeart} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Catat Bantuan Baru" searchPlaceholder="Cari jenis bantuan/kelurahan..." />

            <BantuanFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                message={deleteRow ? `Hapus data bantuan "${deleteRow.jenis_bantuan}" tahun ${deleteRow.tahun} bulan ${bulanList[Number(deleteRow.bulan)] || deleteRow.bulan}?` : undefined} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   BantuanFormModal (Blue/Sky/Indigo Theme)
   ═══════════════════════════════════════════════════════ */

function BantuanFormModal({
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
        kelurahan_id: "", tahun: new Date().getFullYear(), bulan: "1",
        jenis_bantuan: "PKH", jumlah_penerima: 0, jumlah_kk_penerima: 0,
        total_anggaran: 0, sumber_anggaran: "", status_penyaluran: "Belum", pct_tersalurkan: 0,
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "", tahun: editRow.tahun ?? new Date().getFullYear(), bulan: editRow.bulan ?? "1",
                jenis_bantuan: editRow.jenis_bantuan ?? "PKH", jumlah_penerima: editRow.jumlah_penerima ?? 0, jumlah_kk_penerima: editRow.jumlah_kk_penerima ?? 0,
                total_anggaran: editRow.total_anggaran ?? 0, sumber_anggaran: editRow.sumber_anggaran ?? "",
                status_penyaluran: editRow.status_penyaluran ?? "Belum", pct_tersalurkan: editRow.pct_tersalurkan ?? 0,
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "", tahun: new Date().getFullYear(), bulan: "1",
                jenis_bantuan: "PKH", jumlah_penerima: 0, jumlah_kk_penerima: 0,
                total_anggaran: 0, sumber_anggaran: "", status_penyaluran: "Belum", pct_tersalurkan: 0,
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

    const jenisBantuanOptions = ["PKH", "BPNT", "BST", "BLT-DD", "PBI-JKN", "Lainnya"];
    const bulanOptions = [
        { label: "Januari", value: "1" }, { label: "Februari", value: "2" }, { label: "Maret", value: "3" },
        { label: "April", value: "4" }, { label: "Mei", value: "5" }, { label: "Juni", value: "6" },
        { label: "Juli", value: "7" }, { label: "Agustus", value: "8" }, { label: "September", value: "9" },
        { label: "Oktober", value: "10" }, { label: "November", value: "11" }, { label: "Desember", value: "12" },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <HandHeart className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Update Penyaluran Bantuan" : "Catat Batch Bantuan Baru"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat riwayat distribusi, sasaran penerima manfaat, serta evaluasi progres penyalurannya.
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

                            {/* Left Column: Identitas & Program Bantuan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <Banknote className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas Program Bantuan</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Tahun Data <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                required type="number" min={2000} max={2100}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.tahun as number) || new Date().getFullYear()}
                                                onChange={(e) => set("tahun", Number(e.target.value))}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Bulan Salur <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.bulan as string) || "1"}
                                                onChange={(e) => set("bulan", e.target.value)}
                                            >
                                                {bulanOptions.map(m => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Kelurahan Sasaran <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
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
                                            Jenis Bantuan Sosial <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-blue-50/30"
                                            value={(form.jenis_bantuan as string) || "PKH"}
                                            onChange={(e) => set("jenis_bantuan", e.target.value)}
                                        >
                                            {jenisBantuanOptions.map(j => (
                                                <option key={j} value={j}>{j}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Sumber Anggaran Alokasi
                                        </label>
                                        <input
                                            type="text" placeholder="Contoh: APBD Provinsi / Dana Desa"
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.sumber_anggaran as string) || ""}
                                            onChange={(e) => set("sumber_anggaran", e.target.value)}
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Realisasi & Evaluasi Distribusi */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <Users className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Sasaran Penerima & Distribusi</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Total Kepala Keluarga (KK)
                                            </label>
                                            <input
                                                type="number" min={0}
                                                className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                value={(form.jumlah_kk_penerima as number) || 0}
                                                onChange={(e) => set("jumlah_kk_penerima", Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Total Jiwa Penerima
                                            </label>
                                            <input
                                                type="number" min={0}
                                                className="w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                value={(form.jumlah_penerima as number) || 0}
                                                onChange={(e) => set("jumlah_penerima", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Estimasi Total Anggaran (Rupiah)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">Rp</span>
                                            <input
                                                type="number" min={0}
                                                className="w-full pl-11 pr-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-indigo-900"
                                                value={(form.total_anggaran as number) || 0}
                                                onChange={(e) => set("total_anggaran", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    {/* Status Penyaluran Radio Group */}
                                    <div className="pt-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Status Distribusi Fisik Bantuan</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Belum */}
                                            <label className={`
                                                relative flex flex-col items-center justify-center p-3 cursor-pointer rounded-xl border-2 transition-all
                                                ${form.status_penyaluran === "Belum" ? "border-gray-500 bg-gray-50/50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}
                                            `}>
                                                <input
                                                    type="radio" name="status_penyaluran" className="sr-only" value="Belum"
                                                    checked={form.status_penyaluran === "Belum"}
                                                    onChange={() => { set("status_penyaluran", "Belum"); set("pct_tersalurkan", 0); }}
                                                />
                                                <XCircle className={`w-5 h-5 mb-1 ${form.status_penyaluran === "Belum" ? "text-gray-500" : "text-gray-400"}`} />
                                                <span className={`text-xs font-semibold ${form.status_penyaluran === "Belum" ? "text-gray-700" : "text-gray-500"}`}>Belum Tersalur</span>
                                            </label>

                                            {/* Proses */}
                                            <label className={`
                                                relative flex flex-col items-center justify-center p-3 cursor-pointer rounded-xl border-2 transition-all
                                                ${form.status_penyaluran === "Proses" ? "border-amber-500 bg-amber-50" : "border-gray-100 hover:border-amber-200 hover:bg-amber-50/50"}
                                            `}>
                                                <input
                                                    type="radio" name="status_penyaluran" className="sr-only" value="Proses"
                                                    checked={form.status_penyaluran === "Proses"}
                                                    onChange={() => set("status_penyaluran", "Proses")}
                                                />
                                                <Clock className={`w-5 h-5 mb-1 ${form.status_penyaluran === "Proses" ? "text-amber-500" : "text-amber-300"}`} />
                                                <span className={`text-xs font-semibold ${form.status_penyaluran === "Proses" ? "text-amber-700" : "text-gray-500"}`}>Dalam Proses</span>
                                            </label>

                                            {/* Selesai */}
                                            <label className={`
                                                relative flex flex-col items-center justify-center p-3 cursor-pointer rounded-xl border-2 transition-all
                                                ${form.status_penyaluran === "Tersalurkan" ? "border-emerald-500 bg-emerald-50" : "border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50"}
                                            `}>
                                                <input
                                                    type="radio" name="status_penyaluran" className="sr-only" value="Tersalurkan"
                                                    checked={form.status_penyaluran === "Tersalurkan"}
                                                    onChange={() => { set("status_penyaluran", "Tersalurkan"); set("pct_tersalurkan", 100); }}
                                                />
                                                <BadgeCheck className={`w-5 h-5 mb-1 ${form.status_penyaluran === "Tersalurkan" ? "text-emerald-500" : "text-emerald-300"}`} />
                                                <span className={`text-xs font-semibold ${form.status_penyaluran === "Tersalurkan" ? "text-emerald-700" : "text-gray-500"}`}>Tersalurkan</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Persentase Penyaluran Slider */}
                                    {form.status_penyaluran !== "Belum" && (
                                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="block text-sm font-semibold text-indigo-900">
                                                    Progres Kelengkapan Penyaluran
                                                </label>
                                                <span className="text-xs font-bold px-2 py-1 bg-white text-indigo-700 border border-indigo-200 rounded-md">
                                                    {String(form.pct_tersalurkan)}%
                                                </span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100" step="0.1"
                                                disabled={form.status_penyaluran === "Tersalurkan"}
                                                className={`w-full h-2 mt-2 bg-indigo-200 rounded-lg appearance-none accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${form.status_penyaluran === "Tersalurkan" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                                                value={(form.pct_tersalurkan as number) || 0}
                                                onChange={(e) => set("pct_tersalurkan", Number(e.target.value))}
                                            />
                                            <div className="flex justify-between text-[10px] text-indigo-600/70 mt-1.5 font-medium px-1">
                                                <span>Awal Pelaksanaan (0%)</span>
                                                <span>Rampung (100%)</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                                        <HeartHandshake className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                            Pastikan program distribusi dikonfirmasi oleh kepala instansi penyalur sebelum menetapkannya menjadi &quot;Tersalurkan&quot;.
                                        </p>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Kolom wajib
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
                                {isEdit ? "Update Kemajuan Distribusi" : "Mulai Catat Penyaluran Bantuan"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
