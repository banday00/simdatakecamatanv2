"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
    Droplets, Trash2, BarChart3, Home, X, Loader2, Save,
    Leaf, MapPin, ShieldCheck, HandMetal, Eye, FileText, Settings2,
} from "lucide-react";

/* ── DB schema: infra_sanitation ──
   Standar acuan: STBM (Permenkes 3/2014), SDGs Goal 6, Prodeskel/BPS
*/

type Row = Record<string, unknown> & {
    id: string; kelurahan_id: string; tahun: number;
    /* Pilar 1 — SBS/ODF */
    rt_jamban_sehat?: number | null;
    rt_tanpa_jamban?: number | null;
    rt_tanpa_septictank?: number | null;
    status_odf?: string | null;
    /* Pilar 2 — CTPS */
    rt_ctps?: number | null;
    /* Pilar 3 — Air Minum */
    rt_air_minum_layak?: number | null;
    rt_tanpa_air_bersih?: number | null;
    rt_rentan_kekeringan?: number | null;
    akses_air_bersih_persen: number;
    /* Pilar 4 — Sampah */
    rt_sampah_terpilah?: number | null;
    tps_sementara?: number | null;
    tempat_pengolahan_sampah?: number | null;
    rt_pemilahan_sampah?: number | null;
    /* Pilar 5 — Limbah Cair */
    akses_sanitasi_persen: number;
    rt_spal?: number | null;
    /* Infra & SDM */
    petugas_kebersihan?: number | null;
    rumah_kumuh: number;
    /* Legacy */
    tps_jumlah?: number;
};

const STATUS_ODF_OPTIONS = ["ODF", "Belum ODF", "Proses Verifikasi"];

export default function SanitasiPage() {
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
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/infrastruktur/sanitasi`, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || "Gagal memuat data sanitasi.");
            setData(json.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat data sanitasi.");
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
    const avgAir = data.length ? (data.reduce((s, r) => s + Number(r.akses_air_bersih_persen || 0), 0) / data.length).toFixed(1) : "0";
    const avgSanitasi = data.length ? (data.reduce((s, r) => s + Number(r.akses_sanitasi_persen || 0), 0) / data.length).toFixed(1) : "0";
    const totalJambanSehat = data.reduce((s, r) => s + Number(r.rt_jamban_sehat || 0), 0);
    const odfCount = data.filter(r => r.status_odf === "ODF").length;

    const columns: Column<Row>[] = [
        {
            key: "kelurahan_nama" as any, label: "Kelurahan", sortable: true,
            render: (v) => <span className="text-sm font-medium text-gray-700">{String(v)}</span>
        },
        { key: "tahun", label: "Tahun", sortable: true },
        {
            key: "akses_air_bersih_persen", label: "Air Bersih (%)", sortable: true,
            render: (v) => {
                const pct = Number(v ?? 0);
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-blue-700">{pct.toFixed(1)}%</span>
                    </div>
                );
            }
        },
        {
            key: "akses_sanitasi_persen", label: "Sanitasi (%)", sortable: true,
            render: (v) => {
                const pct = Number(v ?? 0);
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-emerald-700">{pct.toFixed(1)}%</span>
                    </div>
                );
            }
        },
        {
            key: "status_odf", label: "Status ODF", sortable: true,
            render: (v) => {
                const s = String(v || "Belum ODF");
                const cls = s === "ODF" ? "bg-emerald-100 text-emerald-700" : s === "Proses Verifikasi" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
                return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>{s}</span>;
            }
        },
    ];

    async function handleSubmit(fd: Record<string, unknown>) {
        if (!tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const url = editRow
                ? `/api/tenants/${tenant.slug}/admin/infrastruktur/sanitasi/${editRow.id}`
                : `/api/tenants/${tenant.slug}/admin/infrastruktur/sanitasi`;
            const res = await fetch(url, {
                method: editRow ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fd),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || "Gagal menyimpan data sanitasi.");
            setModalOpen(false); setEditRow(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menyimpan data sanitasi.");
        } finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.slug) return; setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/infrastruktur/sanitasi/${deleteRow.id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || "Gagal menghapus data sanitasi.");
            setDeleteRow(null);
            await fetchData();
        }
        catch (err) { alert(err instanceof Error ? err.message : "Gagal menghapus data sanitasi."); } finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Sanitasi & Lingkungan" description="Pendataan berbasis 5 Pilar STBM, SDGs Goal 6, dan standar BPS/Prodeskel."
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Infrastruktur", href: "/admin/infrastruktur" }, { label: "Sanitasi" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Cakupan Air Bersih" value={`${avgAir}%`} icon={Droplets} gradient="stat-gradient-soft-blue" />
                <StatCard label="Sanitasi Layak" value={`${avgSanitasi}%`} icon={BarChart3} gradient="stat-gradient-soft-emerald" />
                <StatCard label="RT Jamban Sehat" value={totalJambanSehat} icon={Home} gradient="stat-gradient-soft-amber" />
                <StatCard label="Kelurahan ODF" value={odfCount} icon={ShieldCheck} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }} onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onView={(r) => setDetailRow(r)}
                onDelete={(r) => setDeleteRow(r)} addLabel="Catat Data Baru" searchPlaceholder="Cari data kelurahan atau tahun..." />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <SanitasiFormModal
                open={modalOpen} onClose={() => { setModalOpen(false); setEditRow(null); }} onSubmit={handleSubmit}
                editRow={editRow} kelurahanOptions={kelurahanOptions} isSubmitting={isSubmitting} />

            <DeleteConfirm
                open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Data Sanitasi?"
                message={deleteRow ? `Yakin ingin menghapus data sanitasi kelurahan tahun ${deleteRow.tahun}? Data yang dihapus tidak bisa dikembalikan.` : ""}
            />

            <SanitasiDetailModal open={!!detailRow} onClose={() => setDetailRow(null)} row={detailRow} kelMap={kelMap} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SanitasiFormModal — 4 Section STBM/SDGs/BPS
   ═══════════════════════════════════════════════════════ */

const EMPTY_FORM: Record<string, unknown> = {
    kelurahan_id: "", tahun: new Date().getFullYear(),
    rt_jamban_sehat: 0, rt_tanpa_jamban: 0, rt_tanpa_septictank: 0, status_odf: "Belum ODF",
    rt_ctps: 0,
    rt_air_minum_layak: 0, rt_tanpa_air_bersih: 0, rt_rentan_kekeringan: 0, akses_air_bersih_persen: 0,
    rt_sampah_terpilah: 0, tps_sementara: 0, tempat_pengolahan_sampah: 0, rt_pemilahan_sampah: 0,
    akses_sanitasi_persen: 0, rt_spal: 0,
    petugas_kebersihan: 0, rumah_kumuh: 0,
};

function SanitasiFormModal({
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
    const [form, setForm] = useState<Record<string, unknown>>({ ...EMPTY_FORM });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            const f: Record<string, unknown> = {};
            for (const k of Object.keys(EMPTY_FORM)) {
                f[k] = (editRow as any)[k] ?? EMPTY_FORM[k];
            }
            f.kelurahan_id = editRow.kelurahan_id ?? "";
            setForm(f);
        } else {
            setForm({ ...EMPTY_FORM, kelurahan_id: kelurahanOptions[0]?.value || "" });
        }
    }, [open, editRow, kelurahanOptions]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(form)) {
            if (k === "kelurahan_id" || k === "status_odf") {
                payload[k] = v;
            } else {
                payload[k] = Number(v) || 0;
            }
        }
        onSubmit(payload);
    }

    if (!open) return null;

    const NumInput = ({ field, label, required = false }: { field: string; label: string; required?: boolean }) => (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                required={required} type="number" min={0}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                value={Number(form[field]) || 0}
                onChange={(e) => set(field, Number(e.target.value))}
            />
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-emerald-50 text-blue-600">
                            <Leaf className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Data Sanitasi" : "Catat Data Sanitasi Baru"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Berdasarkan 5 Pilar STBM, SDGs Goal 6, dan standar BPS.
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

                            {/* Section: Identitas */}
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas & Periode</span>
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
                                        Tahun Data <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required type="number" min={2000} max={2100}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.tahun as number) || new Date().getFullYear()}
                                        onChange={(e) => set("tahun", Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Section: Pilar 1-3 — Air Bersih & Sanitasi Dasar */}
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-100 mt-2">
                                <Droplets className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Pilar 1–3 STBM: Air Bersih & Sanitasi Dasar</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <NumInput field="rt_jamban_sehat" label="RT dengan Jamban Sehat (KK)" />
                                <NumInput field="rt_air_minum_layak" label="Sumber Air Minum Layak (KK)" />
                                <NumInput field="rt_tanpa_jamban" label="Keluarga Tanpa Jamban (KK)" />
                                <NumInput field="rt_tanpa_air_bersih" label="Keluarga Tanpa Akses Air Bersih (KK)" />
                                <NumInput field="rt_tanpa_septictank" label="Keluarga Tanpa Septictank (KK)" />
                                <NumInput field="rt_rentan_kekeringan" label="Keluarga Rentan Kekeringan (KK)" />
                                <NumInput field="rt_ctps" label="RT dengan Sarana CTPS (KK)" />
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Status ODF
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        value={(form.status_odf as string) || "Belum ODF"}
                                        onChange={(e) => set("status_odf", e.target.value)}
                                    >
                                        {STATUS_ODF_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Sliders */}
                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-semibold text-blue-900">Cakupan Akses Air Bersih (SDGs 6.1.1)</label>
                                    <span className="text-xs font-bold px-2 py-1 bg-white text-blue-700 border border-blue-200 rounded-md">
                                        {String(form.akses_air_bersih_persen)}%
                                    </span>
                                </div>
                                <input
                                    type="range" min="0" max="100" step="0.1"
                                    className="w-full h-2 mt-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    value={(form.akses_air_bersih_persen as number) || 0}
                                    onChange={(e) => set("akses_air_bersih_persen", Number(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-blue-600/70 mt-1.5 font-medium px-1 uppercase">
                                    <span>Rendah (0%)</span><span>Merata (100%)</span>
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-semibold text-emerald-900">Cakupan Sanitasi Layak (SDGs 6.2.1)</label>
                                    <span className="text-xs font-bold px-2 py-1 bg-white text-emerald-700 border border-emerald-200 rounded-md">
                                        {String(form.akses_sanitasi_persen)}%
                                    </span>
                                </div>
                                <input
                                    type="range" min="0" max="100" step="0.1"
                                    className="w-full h-2 mt-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={(form.akses_sanitasi_persen as number) || 0}
                                    onChange={(e) => set("akses_sanitasi_persen", Number(e.target.value))}
                                />
                            </div>

                            {/* Section: Pilar 4-5 — Sampah & Limbah */}
                            <div className="flex items-center gap-2 pb-2 border-b border-teal-100 mt-2">
                                <Trash2 className="w-4 h-4 text-teal-500" />
                                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Pilar 4–5 STBM: Sampah & Limbah Cair</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <NumInput field="rt_sampah_terpilah" label="Tempat Sampah Terpilah (Unit)" />
                                <NumInput field="tps_sementara" label="TPS — Tempat Penampungan Sementara" />
                                <NumInput field="tempat_pengolahan_sampah" label="Tempat Pengolahan Sampah" />
                                <NumInput field="rt_pemilahan_sampah" label="Keluarga Melakukan Pemilahan (KK)" />
                                <NumInput field="rt_spal" label="RT Terhubung ke SPAL (KK)" />
                            </div>

                            {/* Section: Infrastruktur & SDM */}
                            <div className="flex items-center gap-2 pb-2 border-b border-indigo-100 mt-2">
                                <Home className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Infrastruktur & SDM</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <NumInput field="petugas_kebersihan" label="Petugas Kebersihan (Orang)" />
                                <NumInput field="rumah_kumuh" label="Rumah Tidak Layak Huni / Kumuh" />
                            </div>

                            {/* Info */}
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                                <Droplets className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    Data mengacu pada standar <b>STBM</b> (Permenkes 3/2014), <b>SDGs Goal 6</b> target 6.1 & 6.2, dan <b>Prodeskel/BPS</b> (Podes).
                                    Cakupan 100% berarti seluruh RT di kelurahan sudah memiliki akses.
                                </p>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
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
                                {isEdit ? "Simpan Perubahan" : "Simpan Data"}
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
   SanitasiDetailModal — Read-only detail view
   ═══════════════════════════════════════════════════════ */

function SanitasiDetailModal({
    open, onClose, row, kelMap,
}: {
    open: boolean;
    onClose: () => void;
    row: Row | null;
    kelMap: Map<string, string>;
}) {
    if (!open || !row) return null;

    const odfColors: Record<string, string> = {
        ODF: "bg-emerald-100 text-emerald-700 border-emerald-200",
        "Proses Verifikasi": "bg-amber-100 text-amber-700 border-amber-200",
        "Belum ODF": "bg-red-100 text-red-700 border-red-200",
    };

    const Item = ({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) => (
        <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
            <div className="text-sm text-gray-800 font-medium">
                {value != null && value !== 0 ? <>{value} {unit && <span className="text-gray-400 text-xs">{unit}</span>}</> : <span className="text-gray-300">-</span>}
            </div>
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-600 px-6 py-5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white rounded-full" />
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white rounded-full" />
                    </div>
                    <div className="relative flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-white/80" />
                                <span className="text-white/70 text-xs font-medium uppercase tracking-wider">Detail Data Sanitasi</span>
                            </div>
                            <h2 className="text-xl font-bold text-white">{kelMap.get(row.kelurahan_id) || "-"}</h2>
                            <p className="text-blue-100 text-sm mt-1">Tahun {row.tahun}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${odfColors[row.status_odf || "Belum ODF"] || odfColors["Belum ODF"]}`}>
                                {row.status_odf || "Belum ODF"}
                            </span>
                            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Tutup">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Cakupan */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cakupan SDGs Goal 6</span>
                        {[
                            { label: "Air Bersih (6.1.1)", pct: row.akses_air_bersih_persen || 0, color: "bg-blue-500" },
                            { label: "Sanitasi Layak (6.2.1)", pct: row.akses_sanitasi_persen || 0, color: "bg-emerald-500" },
                        ].map(b => (
                            <div key={b.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700 font-medium">{b.label}</span>
                                    <span className="font-black text-gray-800">{Number(b.pct).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${b.color} rounded-full transition-all`} style={{ width: `${b.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pilar 1-3 */}
                    <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2"><Droplets className="w-3.5 h-3.5" /> Pilar 1–3: Air Bersih & Sanitasi</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <Item label="RT Jamban Sehat" value={row.rt_jamban_sehat} unit="KK" />
                            <Item label="Sumber Air Minum Layak" value={row.rt_air_minum_layak} unit="KK" />
                            <Item label="Keluarga Tanpa Jamban" value={row.rt_tanpa_jamban} unit="KK" />
                            <Item label="Keluarga Tanpa Air Bersih" value={row.rt_tanpa_air_bersih} unit="KK" />
                            <Item label="Keluarga Tanpa Septictank" value={row.rt_tanpa_septictank} unit="KK" />
                            <Item label="Keluarga Rentan Kekeringan" value={row.rt_rentan_kekeringan} unit="KK" />
                            <Item label="RT dengan CTPS" value={row.rt_ctps} unit="KK" />
                        </div>
                    </div>

                    {/* Pilar 4-5 */}
                    <div>
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-3 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Pilar 4–5: Sampah & Limbah</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <Item label="Tempat Sampah Terpilah" value={row.rt_sampah_terpilah} unit="unit" />
                            <Item label="TPS Sementara" value={row.tps_sementara} unit="unit" />
                            <Item label="Tempat Pengolahan Sampah" value={row.tempat_pengolahan_sampah} unit="unit" />
                            <Item label="Keluarga Pemilahan Sampah" value={row.rt_pemilahan_sampah} unit="KK" />
                            <Item label="RT Terhubung SPAL" value={row.rt_spal} unit="KK" />
                        </div>
                    </div>

                    {/* Infra & SDM */}
                    <div>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2"><Home className="w-3.5 h-3.5" /> Infrastruktur & SDM</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <Item label="Petugas Kebersihan" value={row.petugas_kebersihan} unit="orang" />
                            <Item label="Rumah Kumuh" value={row.rumah_kumuh} unit="unit" />
                        </div>
                    </div>
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
