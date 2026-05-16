"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAdminSosialResource } from "../use-admin-sosial-resource";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Home, CheckCircle, AlertTriangle, Banknote, X, Loader2, Save, FileText, Wrench } from "lucide-react";

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; tahun: number;
    jumlah_rtlh: number;
    sudah_direhabilitasi: number;
    belum_direhabilitasi: number;
    anggaran_rehabilitasi: number;
    sumber_dana: string;
};

const columns: Column<Row>[] = [
    { key: "kelurahan_nama" as keyof Row, label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun Pendataan", sortable: true },
    { key: "jumlah_rtlh", label: "Total Temuan RTLH", sortable: true, render: (v) => <span className="font-bold text-gray-900">{Number(v ?? 0).toLocaleString("id-ID")}</span> },
    { key: "sudah_direhabilitasi", label: "Telah Direhab", sortable: true, render: (v) => <span className="text-emerald-600 font-medium">{Number(v ?? 0).toLocaleString("id-ID")} Unit</span> },
    { key: "belum_direhabilitasi", label: "Belum Tertangani", render: (v) => <span className="text-rose-600 font-medium">{Number(v ?? 0).toLocaleString("id-ID")} Unit</span> },
    { key: "anggaran_rehabilitasi", label: "Suntikan Anggaran", sortable: true, render: (v) => <span className="text-gray-700">Rp {Number(v ?? 0).toLocaleString("id-ID")}</span> },
    {
        key: "sumber_dana", label: "Sumber Pendanaan",
        render: (v) => <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">{String(v || "—")}</span>
    },
];

export default function PerumahanPage() {
    const { data, isLoading, error, kelurahanOptions, kelMap, createRow, updateRow, deleteRow: deleteData } =
        useAdminSosialResource<Row>("perumahan", "data RTLH");
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const totalRTLH = data.reduce((s, r) => s + Number(r.jumlah_rtlh || 0), 0);
    const sudahRehab = data.reduce((s, r) => s + Number(r.sudah_direhabilitasi || 0), 0);
    const belumRehab = data.reduce((s, r) => s + Number(r.belum_direhabilitasi || 0), 0);
    const totalAnggaran = data.reduce((s, r) => s + Number(r.anggaran_rehabilitasi || 0), 0);

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try { editRow ? await updateRow(editRow.id, fd) : await createRow(fd); setModalOpen(false); setEditRow(null); }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menyimpan data perumahan."); } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await deleteData(deleteRow.id); setDeleteRow(null); }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menghapus data RTLH."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Manajemen Perumahan & RTLH" description="Pemetaan Rumah Tidak Layak Huni beserta dokumentasi pelacakan intervensi rehabilitasi daerah."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Sosial", href: "/admin/sosial" }, { label: "Perumahan & RTLH" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Temuan RTLH" value={totalRTLH.toLocaleString("id-ID")} icon={Home} gradient="stat-gradient-soft-blue" />
                <StatCard label="Realisasi Rehab" value={sudahRehab.toLocaleString("id-ID")} icon={CheckCircle} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Tunggakan Rehab" value={belumRehab.toLocaleString("id-ID")} icon={AlertTriangle} gradient="stat-gradient-soft-amber" />
                <StatCard label="Penyerapan Dana" value={`Rp ${(totalAnggaran / 1e9).toFixed(1)} Miliar`} icon={Banknote} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Registrasi Evaluasi Baru" searchPlaceholder="Cari kelurahan/sumber dana..." />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <PerumahanFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                message={deleteRow ? `Hapus data RTLH tahun ${deleteRow.tahun} (${deleteRow.sumber_dana || 'tanpa sumber dana'}) untuk wilayah ini?` : undefined} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PerumahanFormModal (Blue/Sky/Indigo Theme)
   ═══════════════════════════════════════════════════════ */

function PerumahanFormModal({
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
        jumlah_rtlh: 0,
        sudah_direhabilitasi: 0, belum_direhabilitasi: 0,
        anggaran_rehabilitasi: 0, sumber_dana: "APBD",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "", tahun: editRow.tahun ?? new Date().getFullYear(),
                jumlah_rtlh: editRow.jumlah_rtlh ?? 0,
                sudah_direhabilitasi: editRow.sudah_direhabilitasi ?? 0,
                belum_direhabilitasi: editRow.belum_direhabilitasi ?? 0,
                anggaran_rehabilitasi: editRow.anggaran_rehabilitasi ?? 0, sumber_dana: editRow.sumber_dana ?? "APBD",
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "", tahun: new Date().getFullYear(),
                jumlah_rtlh: 0,
                sudah_direhabilitasi: 0, belum_direhabilitasi: 0,
                anggaran_rehabilitasi: 0, sumber_dana: "APBD",
            });
        }
    }, [open, editRow, kelurahanOptions]);

    // Auto-calculate Belum Direhabilitasi based on Total - Sudah
    useEffect(() => {
        const total = Number(form.jumlah_rtlh) || 0;
        const sudahRehab = Number(form.sudah_direhabilitasi) || 0;
        const calcBelum = Math.max(0, total - sudahRehab); // Prevent negative numbers

        setForm(prev => {
            if (prev.belum_direhabilitasi !== calcBelum) {
                return { ...prev, belum_direhabilitasi: calcBelum };
            }
            return prev;
        });
    }, [form.jumlah_rtlh, form.sudah_direhabilitasi]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    const sumberDanaOptions = ["APBD", "APBN", "CSR", "Dana Desa", "Swadaya Masyarakat", "Lainnya"];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue/Sky/Indigo Theme */}
                <div className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Home className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Perbarui Log Perumahan" : "Registrasi Evaluasi RTLH"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Masukkan rincian temuan kuantitas Rumah Tidak Layak Huni beserta capaian upaya penanganannya.
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

                            {/* Left Column: Identifikasi Temuan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Laporan Identifikasi & Asesmen RTLH</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Tahun Validasi <span className="text-red-500">*</span>
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
                                                Kelurahan / Desa <span className="text-red-500">*</span>
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
                                    </div>

                                    <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-2">
                                                Total Temuan Rumah Tidak Layak Huni (RTLH) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    required type="number" min={0}
                                                    className="w-full pl-5 pr-12 py-3 bg-red-50/30 border border-red-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-inner text-gray-900 placeholder-gray-300"
                                                    placeholder="0"
                                                    value={(form.jumlah_rtlh as number) || 0}
                                                    onChange={(e) => set("jumlah_rtlh", Number(e.target.value))}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 pointer-events-none">Unit</span>
                                            </div>
                                            <p className="text-xs text-gray-500 max-w-xs mt-2 leading-relaxed">Masukkan besaran baseline hunian yang butuh penanganan menurut data sensus termutakhir di wilayah ini.</p>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Rehabilitasi & Pendanaan */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <Wrench className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Capaian Rehabilitasi & Injeksi Dana</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-emerald-800">
                                                Sudah Direhabilitasi
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number" min={0}
                                                    className="w-full pl-3 pr-10 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm text-emerald-900"
                                                    value={(form.sudah_direhabilitasi as number) || 0}
                                                    onChange={(e) => set("sudah_direhabilitasi", Number(e.target.value))}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600/50 pointer-events-none">Unit</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-rose-800">
                                                Belum Direhabilitasi
                                            </label>
                                            <div className="relative">
                                                <input
                                                    readOnly type="number"
                                                    className="w-full pl-3 pr-10 py-2.5 bg-gray-100 border border-transparent rounded-xl text-sm font-bold focus:outline-none shadow-inner text-rose-600"
                                                    value={(form.belum_direhabilitasi as number) || 0}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-rose-400 pointer-events-none">Unit</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 text-right leading-none">Auto-kalkulasi</p>
                                        </div>
                                    </div>

                                    {/* Progress indicator */}
                                    <div className="bg-slate-100 h-2.5 w-full rounded-full overflow-hidden mt-2 mb-6">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                            style={{
                                                width: `${Math.min(100, form.jumlah_rtlh ? ((form.sudah_direhabilitasi as number) / (form.jumlah_rtlh as number)) * 100 : 0)}%`
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Realisasi Anggaran Rehabilitasi (Rp)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                                                Rp
                                            </span>
                                            <input
                                                type="number" min={0} step={1000}
                                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-gray-800"
                                                value={(form.anggaran_rehabilitasi as number) || 0}
                                                onChange={(e) => set("anggaran_rehabilitasi", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Skema Mayoritas Sumber Pendanaan
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-indigo-900 appearance-none"
                                                value={(form.sumber_dana as string) || "APBD"}
                                                onChange={(e) => set("sumber_dana", e.target.value)}
                                            >
                                                {sumberDanaOptions.map(j => (
                                                    <option key={j} value={j}>{j}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-500">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400">
                            <span className="text-red-400">*</span> Wajib diinfokan
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors"
                            >
                                Batal Eksekusi
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
                                {isEdit ? "Mutakhirkan Data Log" : "Simpan Profil Evaluasi"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
