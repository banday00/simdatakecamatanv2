"use client";

import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StuntingFormModal } from "./stunting-form-modal";
import {
    Baby, AlertTriangle, TrendingDown, Target,
    ClipboardList, ListFilter, FileText, Plus,
    ChevronDown, ChevronUp, Trash2, Edit3, Ruler,
} from "lucide-react";

/* ═══ Types ═══ */
type ChildCard = {
    penduduk_id: string;
    nik: string;
    nama: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    nama_ibu_kandung: string | null;
    no_kk: string | null;
    alamat: string | null;
    rt: string | null;
    rw: string | null;
    kelurahan_id: string;
    total_pemeriksaan: number;
    latest_tanggal: string | null;
    latest_status_tbu: string | null;
    latest_status_bbu: string | null;
    latest_berat_badan: number | null;
    latest_tinggi_badan: number | null;
};

type MeasurementRow = {
    id: string;
    penduduk_id: string;
    kelurahan_id: string;
    posyandu_id: string | null;
    nama_ortu: string | null;
    tanggal_pengukuran: string;
    berat_badan: number | null;
    tinggi_badan: number | null;
    status_tbu: string;
    status_bbu: string;
    intervensi_diterima: string[];
};

type StuntingAgregatRow = {
    id: string;
    kelurahan_id?: string;
    tahun: number;
    bulan?: number;
    balita_total: number;
    balita_stunting: number;
    balita_gizi_buruk?: number;
    balita_gizi_kurang?: number;
};

/* ═══ Agregat Columns ═══ */
const agregatColumns: Column<StuntingAgregatRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun", sortable: true },
    { key: "balita_total", label: "Balita", sortable: true, render: (v) => Number(v ?? 0).toLocaleString("id-ID") },
    { key: "balita_stunting", label: "Stunting", sortable: true, render: (v) => <span className="font-medium text-red-600">{Number(v ?? 0).toLocaleString("id-ID")}</span> },
    {
        key: "prevalensi", label: "Prevalensi", sortable: true, render: (v) => {
            const n = Number(v ?? 0);
            return <span className={`font-semibold ${n > 20 ? "text-red-600" : n > 10 ? "text-amber-600" : "text-green-600"}`}>{n.toFixed(1)}%</span>;
        }
    },
    { key: "balita_gizi_buruk", label: "Gizi Buruk", render: (v) => Number(v ?? 0).toLocaleString("id-ID") },
];

/* ═══ Status Badge ═══ */
function StatusBadge({ status, type }: { status: string; type: "tbu" | "bbu" }) {
    const isBad = type === "tbu"
        ? status === "Sangat Pendek" || status === "Pendek"
        : status === "Gizi Buruk" || status === "Gizi Kurang";
    const isWarning = type === "tbu" ? status === "Pendek" : status === "Gizi Kurang";
    const cls = isBad
        ? isWarning ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
    return <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${cls}`}>{status}</span>;
}

/* ═══════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════ */
export default function StuntingPage() {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();

    const [activeTab, setActiveTab] = useState<"bnba" | "agregat">("bnba");
    const [children, setChildren] = useState<ChildCard[]>([]);
    const [agregatData, setAgregatData] = useState<StuntingAgregatRow[]>([]);
    const [posyandu, setPosyandu] = useState<{ id: string; nama: string; kelurahan_id: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAgregat, setIsLoadingAgregat] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Expanded child + measurements
    const [expandedChild, setExpandedChild] = useState<string | null>(null);
    const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
    const [isLoadingMeas, setIsLoadingMeas] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editMeasurement, setEditMeasurement] = useState<MeasurementRow | null>(null);
    const [modalChild, setModalChild] = useState<ChildCard | null>(null);

    // Delete state
    const [deleteRow, setDeleteRow] = useState<MeasurementRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isKelurahanAdmin = profile?.role === "admin_kelurahan";
    const filterKelurahanId = isKelurahanAdmin ? profile?.kelurahan_id ?? null : null;
    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    const apiBase = `/api/tenants/${tenant?.slug}/admin/kesehatan/stunting`;

    /* ─── Fetch ─── */
    const fetchChildren = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoading(true); setError(null);
        try {
            const res = await fetch(`${apiBase}/bnba`);
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal memuat data");
            setChildren(json.data || []);
        } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
    }, [tenant?.slug, apiBase]);

    const fetchAgregat = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoadingAgregat(true);
        try {
            const res = await fetch(`${apiBase}/agregat`);
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal memuat agregat");
            setAgregatData(json.data || []);
        } catch (err: any) { setError(err.message); } finally { setIsLoadingAgregat(false); }
    }, [tenant?.slug, apiBase]);

    const fetchPosyandu = useCallback(async () => {
        if (!tenant?.slug) return;
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/kesehatan/posyandu`);
            const json = await res.json();
            setPosyandu(json.data || []);
        } catch { /* ignore */ }
    }, [tenant?.slug]);

    useEffect(() => { fetchChildren(); fetchAgregat(); fetchPosyandu(); }, [fetchChildren, fetchAgregat, fetchPosyandu]);

    const fetchMeasurements = useCallback(async (pendudukId: string) => {
        if (!tenant?.slug) return;
        setIsLoadingMeas(true);
        try {
            const res = await fetch(`${apiBase}/bnba/children/${pendudukId}`);
            const json = await res.json();
            setMeasurements(json.data || []);
        } catch { setMeasurements([]); } finally { setIsLoadingMeas(false); }
    }, [tenant?.slug, apiBase]);

    const toggleExpand = (pendudukId: string) => {
        if (expandedChild === pendudukId) { setExpandedChild(null); setMeasurements([]); }
        else { setExpandedChild(pendudukId); fetchMeasurements(pendudukId); }
    };

    /* ─── Actions ─── */
    const handleAddNew = () => { setModalChild(null); setEditMeasurement(null); setModalOpen(true); };
    const handleAddForChild = (child: ChildCard) => { setModalChild(child); setEditMeasurement(null); setModalOpen(true); };
    const handleEditMeas = (meas: MeasurementRow, child: ChildCard) => { setModalChild(child); setEditMeasurement(meas); setModalOpen(true); };

    const handleSubmit = async (payload: Record<string, unknown>) => {
        const isEdit = !!editMeasurement;
        const url = isEdit ? `${apiBase}/bnba/${editMeasurement!.id}` : `${apiBase}/bnba`;
        const res = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal menyimpan");
        setModalOpen(false); setEditMeasurement(null); setModalChild(null);
        await fetchChildren(); await fetchAgregat();
        if (expandedChild) fetchMeasurements(expandedChild);
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${apiBase}/bnba/${deleteRow.id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal menghapus");
            setDeleteRow(null);
            await fetchChildren(); await fetchAgregat();
            if (expandedChild) fetchMeasurements(expandedChild);
        } catch (err: any) { alert(err.message); } finally { setIsDeleting(false); }
    };

    /* ─── Stats ─── */
    const totalAnak = children.length;
    const totalStunting = children.filter(c => c.latest_status_tbu === "Pendek" || c.latest_status_tbu === "Sangat Pendek").length;
    const totalPemeriksaan = children.reduce((s, c) => s + (Number(c.total_pemeriksaan) || 0), 0);
    const prevalensi = totalAnak > 0 ? (totalStunting / totalAnak) * 100 : 0;

    /* ─── Enrich agregat ─── */
    const enrichedAgregat = agregatData.map((r) => {
        const t = Number(r.balita_total) || 0, s = Number(r.balita_stunting) || 0;
        return { ...r, id: r.id || `${r.kelurahan_id}-${r.tahun}-${r.bulan}`, kelurahan_nama: kelurahans.find(k => k.id === r.kelurahan_id)?.nama || "—", prevalensi: t > 0 ? (s / t) * 100 : 0 };
    });

    const kelMap = new Map(kelurahans.map(k => [k.id, k.nama]));

    /* ─── Search NIK ─── */
    const searchNIK = async (nik: string) => {
        if (!tenant?.slug || nik.length < 16) return null;
        try {
            const res = await fetch(`${apiBase}/bnba/search?nik=${nik}`);
            const json = await res.json();
            return json.data || null;
        } catch { return null; }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Data Stunting BNBA" description="Pencatatan rincian status gizi balita By Name By Address (E-PPGBM Nasional)" breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Kesehatan", href: "/admin/kesehatan" }, { label: "Stunting / E-PPGBM" }]} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard size="sm" label="Anak Terdaftar" value={totalAnak.toLocaleString("id-ID")} icon={Baby} gradient="stat-gradient-blue" />
                <StatCard size="sm" label="Kasus Stunting" value={totalStunting.toLocaleString("id-ID")} icon={AlertTriangle} gradient="stat-gradient-rose" />
                <StatCard size="sm" label="Prevalensi" value={`${prevalensi.toFixed(1)}%`} icon={TrendingDown} gradient="stat-gradient-amber" />
                <StatCard size="sm" label="Total Pemeriksaan" value={totalPemeriksaan.toLocaleString("id-ID")} icon={Target} gradient="stat-gradient-emerald" />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveTab("bnba")} className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === "bnba" ? "border-blue-600 text-blue-700 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    <ClipboardList className="w-4 h-4" /> Data Anak (BNBA)
                </button>
                <button onClick={() => setActiveTab("agregat")} className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === "agregat" ? "border-blue-600 text-blue-700 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    <FileText className="w-4 h-4" /> Agregasi Otomatis
                </button>
            </div>

            {/* Tab Content */}
            <div className="pt-2">
                {activeTab === "bnba" ? (
                    <div className="space-y-4">
                        {/* Header + Add Button */}
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">{totalAnak} anak terdaftar</p>
                            <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/25">
                                <Plus className="w-4 h-4" /> Tambah Anak & Pengukuran
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
                        ) : error ? (
                            <p className="text-sm text-red-600 text-center py-8">{error}</p>
                        ) : children.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Baby className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p className="font-semibold">Belum ada data anak</p>
                                <p className="text-sm mt-1">Klik tombol "Tambah Anak & Pengukuran" untuk memulai</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {children.map((child) => {
                                    const isExpanded = expandedChild === child.penduduk_id;
                                    const isStunting = child.latest_status_tbu === "Pendek" || child.latest_status_tbu === "Sangat Pendek";
                                    return (
                                        <div key={child.penduduk_id} className={`bg-white rounded-xl border transition-all ${isStunting ? "border-red-200 shadow-red-100/50" : "border-gray-200"} shadow-sm hover:shadow-md`}>
                                            {/* Card Header */}
                                            <div className="p-4 cursor-pointer" onClick={() => toggleExpand(child.penduduk_id)}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${child.jenis_kelamin === "P" ? "bg-gradient-to-br from-pink-400 to-rose-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"}`}>
                                                            {child.nama?.charAt(0)?.toUpperCase() || "?"}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="font-bold text-gray-900 text-sm">{child.nama}</h3>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{child.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                                                                <span className="font-mono">NIK: {child.nik ? "••••" + child.nik.slice(-4) : "—"}</span>
                                                                {child.tanggal_lahir && <span>Lahir: {child.tanggal_lahir}</span>}
                                                                <span>{kelMap.get(child.kelurahan_id) || "—"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <div className="flex items-center gap-2 justify-end">
                                                                {child.latest_status_tbu && <StatusBadge status={child.latest_status_tbu} type="tbu" />}
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 mt-1">{child.total_pemeriksaan} pemeriksaan</p>
                                                        </div>
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                    </div>
                                                </div>

                                                {/* Quick summary bar */}
                                                {child.latest_tanggal && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                        <div><span className="text-gray-400">Terakhir:</span> <span className="font-medium text-gray-700">{child.latest_tanggal}</span></div>
                                                        <div><span className="text-gray-400">BB:</span> <span className="font-medium text-gray-700">{child.latest_berat_badan ?? "—"} kg</span></div>
                                                        <div><span className="text-gray-400">TB:</span> <span className="font-medium text-gray-700">{child.latest_tinggi_badan ?? "—"} cm</span></div>
                                                        <div><span className="text-gray-400">BB/U:</span> {child.latest_status_bbu ? <StatusBadge status={child.latest_status_bbu} type="bbu" /> : "—"}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expanded: Measurements */}
                                            {isExpanded && (
                                                <div className="border-t border-gray-100 bg-slate-50/50 p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" /> Riwayat Pemeriksaan</h4>
                                                        <button onClick={(e) => { e.stopPropagation(); handleAddForChild(child); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">
                                                            <Plus className="w-3 h-3" /> Tambah Pemeriksaan
                                                        </button>
                                                    </div>
                                                    {isLoadingMeas ? (
                                                        <div className="flex justify-center py-6"><div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
                                                    ) : measurements.length === 0 ? (
                                                        <p className="text-sm text-gray-400 text-center py-4">Belum ada riwayat pemeriksaan</p>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-200">
                                                                    <th className="py-2 pr-3">Tgl Pengukuran</th><th className="py-2 pr-3">BB (kg)</th><th className="py-2 pr-3">TB (cm)</th><th className="py-2 pr-3">TB/U</th><th className="py-2 pr-3">BB/U</th><th className="py-2 pr-3">Ortu</th><th className="py-2 text-right">Aksi</th>
                                                                </tr></thead>
                                                                <tbody>
                                                                    {measurements.map((m) => (
                                                                        <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-white transition-colors">
                                                                            <td className="py-2.5 pr-3 font-medium text-gray-800">{m.tanggal_pengukuran}</td>
                                                                            <td className="py-2.5 pr-3 font-mono">{m.berat_badan ?? "—"}</td>
                                                                            <td className="py-2.5 pr-3 font-mono">{m.tinggi_badan ?? "—"}</td>
                                                                            <td className="py-2.5 pr-3"><StatusBadge status={m.status_tbu} type="tbu" /></td>
                                                                            <td className="py-2.5 pr-3"><StatusBadge status={m.status_bbu} type="bbu" /></td>
                                                                            <td className="py-2.5 pr-3 text-gray-500 text-xs">{m.nama_ortu || "—"}</td>
                                                                            <td className="py-2.5 text-right">
                                                                                <div className="flex items-center gap-1 justify-end">
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleEditMeas(m, child); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                                                                                    <button onClick={(e) => { e.stopPropagation(); setDeleteRow(m); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex items-start gap-3">
                            <ListFilter className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-semibold text-teal-800 text-sm">Laporan Agregat Terkalkulasi Otomatis</h4>
                                <p className="text-teal-700 text-xs mt-0.5">Seluruh angka dihitung real-time dari data input BNBA per bulan pengukuran.</p>
                            </div>
                        </div>
                        <DataTable columns={agregatColumns} data={enrichedAgregat} isLoading={isLoadingAgregat} searchPlaceholder="Cari rekap stunting..." />
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {modalOpen && (
                <StuntingFormModal
                    onClose={() => { setModalOpen(false); setEditMeasurement(null); setModalChild(null); }}
                    onSubmit={handleSubmit}
                    editMeasurement={editMeasurement}
                    child={modalChild}
                    kelurahanOptions={kelurahanOptions}
                    posyandus={posyandu}
                    isKelurahanAdmin={isKelurahanAdmin}
                    filterKelurahanId={filterKelurahanId}
                    onSearchNIK={searchNIK}
                />
            )}

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                title="Hapus Catatan Pemeriksaan"
                message={`Apakah Anda yakin ingin menghapus catatan pemeriksaan tanggal "${deleteRow?.tanggal_pengukuran}"?`}
                isDeleting={isDeleting}
            />
        </div>
    );
}
