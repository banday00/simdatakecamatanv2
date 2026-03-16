"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Trophy, MapPin, CheckCircle, BarChart3, X, Loader2, Save, Ruler } from "lucide-react";

type Row = Record<string, unknown> & { id: string; nama: string; jenis: string; kondisi: string; kelurahan_id: string; luas: number | null };

const JENIS_OPTIONS = [
    "Lapangan Sepakbola", "Lapangan Basket", "Lapangan Voli", "Lapangan Bulutangkis",
    "Gedung Olahraga (GOR)", "Kolam Renang", "Taman Aktif", "Sentra Kebugaran", "Lainnya"
];

const KONDISI_OPTIONS = ["Baik", "Rusak Ringan", "Rusak Berat"];

const JENIS_COLORS: Record<string, string> = {
    "Lapangan Sepakbola": "bg-emerald-100 text-emerald-700",
    "Lapangan Basket": "bg-orange-100 text-orange-700",
    "Lapangan Voli": "bg-blue-100 text-blue-700",
    "Lapangan Bulutangkis": "bg-cyan-100 text-cyan-700",
    "Gedung Olahraga (GOR)": "bg-indigo-100 text-indigo-700",
    "Kolam Renang": "bg-sky-100 text-sky-700",
    "Taman Aktif": "bg-lime-100 text-lime-700",
    "Sentra Kebugaran": "bg-violet-100 text-violet-700",
    "Lainnya": "bg-slate-100 text-slate-700",
};

export default function OlahragaPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove } = useCrud<Row>({ table: "infra_sports" });
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

    const baikCount = data.filter((r) => r.kondisi === "Baik").length;
    const perbaikanCount = data.length - baikCount;
    const uniqKelCount = new Set(data.map((r) => r.kelurahan_id)).size;

    const columns: Column<Row>[] = [
        { key: "nama", label: "Nama Fasilitas", sortable: true },
        {
            key: "jenis", label: "Jenis", sortable: true,
            render: (v) => {
                const cls = JENIS_COLORS[String(v)] || JENIS_COLORS["Lainnya"];
                return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>{String(v)}</span>;
            }
        },
        {
            key: "kondisi", label: "Kondisi", render: (v) => {
                const c: Record<string, string> = {
                    Baik: "bg-green-100 text-green-700",
                    "Rusak Ringan": "bg-amber-100 text-amber-700",
                    "Rusak Berat": "bg-red-100 text-red-700"
                };
                return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${c[String(v)] || c.Baik}`}>{String(v)}</span>;
            }
        },
        {
            key: "luas", label: "Luas (m²)",
            render: (v) => <span className="text-sm text-gray-600">{v ? `${Number(v).toLocaleString('id-ID')} m²` : '-'}</span>
        },
        {
            key: "kelurahan_nama" as any, label: "Kelurahan",
            render: (v) => <span className="text-sm text-gray-600">{String(v)}</span>
        },
    ];

    async function handleSubmit(fd: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            editRow ? await update(editRow.id, fd) : await create(fd);
            setModalOpen(false); setEditRow(null);
        } catch {
            alert("Gagal menyimpan data fasilitas olahraga.");
        } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return; setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch { alert("Gagal menghapus data fasilitas olahraga."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Sarana Olahraga" description="Pencatatan inventaris dan kondisi fasilitas olahraga & rekreasi masyarakat."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Infrastruktur", href: "/admin/infrastruktur" }, { label: "Olahraga" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Fasilitas" value={data.length} icon={Trophy} gradient="stat-gradient-soft-blue" />
                <StatCard label="Kondisi Baik" value={baikCount} icon={CheckCircle} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Perlu Perbaikan" value={perbaikanCount} icon={BarChart3} gradient="stat-gradient-soft-amber" />
                <StatCard label="Jangkauan Kelurahan" value={`${uniqKelCount} kel`} icon={MapPin} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)} addLabel="Tambah Fasilitas" searchPlaceholder="Cari nama atau jenis fasilitas..." />

            <SaranaOlahragaFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm
                open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Fasilitas Olahraga?"
                message={deleteRow ? `Yakin ingin menghapus fasilitas "${deleteRow.nama}" (${deleteRow.jenis})? Data yang dihapus tidak bisa dikembalikan.` : ""}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SaranaOlahragaFormModal (Blue Theme)
   ═══════════════════════════════════════════════════════ */

function SaranaOlahragaFormModal({
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
        kelurahan_id: "",
        nama: "",
        jenis: "Lapangan Sepakbola",
        kondisi: "Baik",
        luas: "",
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                jenis: editRow.jenis ?? "Lapangan Sepakbola",
                kondisi: editRow.kondisi ?? "Baik",
                luas: editRow.luas ?? "",
            });
        } else {
            setForm({
                kelurahan_id: kelurahanOptions[0]?.value || "",
                nama: "",
                jenis: "Lapangan Sepakbola",
                kondisi: "Baik",
                luas: "",
            });
        }
    }, [open, editRow, kelurahanOptions]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            ...form,
            luas: form.luas !== "" && form.luas !== null ? Number(form.luas) : null,
        };
        onSubmit(payload);
    }

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Sarana Olahraga" : "Tambah Sarana Olahraga Baru"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Inventori fasilitas olahraga dan rekreasi masyarakat.
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
                        <div className="space-y-6">

                            {/* Section: Identitas & Lokasi */}
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas & Lokasi</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                        Nama Fasilitas <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required type="text" placeholder="Cth: Lapangan Sepakbola Gajah Mada"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.nama as string) || ""}
                                        onChange={(e) => set("nama", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Jenis Sarana <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.jenis as string) || "Lapangan Sepakbola"}
                                        onChange={(e) => set("jenis", e.target.value)}
                                    >
                                        {JENIS_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Luas Area (m²)
                                    </label>
                                    <input
                                        type="number" min={0} step="0.01" placeholder="Opsional, cth: 2500"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.luas as string | number) ?? ""}
                                        onChange={(e) => set("luas", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Section: Kondisi */}
                            <div className="flex items-center gap-2 pb-2 border-b border-indigo-100 mt-2">
                                <Ruler className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Kondisi Fisik</span>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Status Kondisi <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {KONDISI_OPTIONS.map((kondisi) => (
                                        <button
                                            key={kondisi}
                                            type="button"
                                            onClick={() => set("kondisi", kondisi)}
                                            className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all ${form.kondisi === kondisi
                                                ? kondisi === "Baik" ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500"
                                                    : kondisi === "Rusak Ringan" ? "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-500"
                                                        : "bg-red-50 text-red-700 border-red-300 ring-1 ring-red-500"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            {kondisi}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Panduan */}
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Panduan Penilaian Kondisi</h4>
                                <ul className="text-sm text-blue-700 leading-relaxed space-y-1 list-disc list-inside">
                                    <li><span className="font-semibold text-emerald-600">Baik</span>: Layak pakai, aman, peralatan lengkap.</li>
                                    <li><span className="font-semibold text-amber-600">Rusak Ringan</span>: Masih berfungsi, perlu perbaikan minor.</li>
                                    <li><span className="font-semibold text-red-600">Rusak Berat</span>: Tidak layak pakai, risiko cedera tinggi.</li>
                                </ul>
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
                                {isEdit ? "Simpan Perubahan" : "Tambah Fasilitas"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
