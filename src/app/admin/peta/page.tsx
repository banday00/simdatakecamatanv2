"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { createClient } from "@/lib/supabase/client";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
    Map, Layers, MapPin, Eye, EyeOff, Globe, FileJson,
    Loader2, Plus, Trash2, Edit, X, Save, AlignLeft, Info
} from "lucide-react";
import { CATEGORY_CONFIG, type GisLayer, type FacilityItem } from "@/components/map/map-config";

/* ─── Dynamic import for Map Preview ─────────────────────────── */
const MapViewer = dynamic(() => import("@/components/map/map-viewer"), {
    ssr: false,
    loading: () => (
        <div className="h-[500px] w-full bg-slate-50 rounded-xl flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
    ),
});

/* ─── Layer Types ────────────────────────────────────────────── */
type LayerRow = Record<string, unknown> & {
    id: string;
    nama: string;
    jenis: string;
    is_visible: boolean;
    created_at: string;
    geojson?: any;
    style?: any;
    urutan?: number;
};

type PoiRow = Record<string, unknown> & {
    id: string;
    nama: string;
    kategori: string;
    deskripsi?: string;
    alamat?: string;
    koordinat_lat?: number;
    koordinat_lng?: number;
    foto?: string;
    created_at: string;
};

/* ─── Tab type ───────────────────────────────────────────────── */
type TabKey = "layers" | "poi" | "preview";

/* ─── Layer Columns & Fields ─────────────────────────────────── */
const layerColumns: Column<LayerRow>[] = [
    { key: "nama", label: "Nama Layer", sortable: true },
    {
        key: "jenis",
        label: "Jenis",
        sortable: true,
        render: (val) => {
            const labels: Record<string, string> = { boundary: "Batas Wilayah", point: "Titik", line: "Jalur" };
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                    {labels[String(val)] || String(val)}
                </span>
            );
        },
    },
    {
        key: "geojson",
        label: "Data",
        render: (val) => (
            <span className={`text-xs font-medium ${val ? "text-green-600" : "text-slate-400"}`}>
                {val ? "✓ Ada" : "— Kosong"}
            </span>
        ),
    },
    {
        key: "is_visible",
        label: "Status",
        render: (val) => (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${val ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {val ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {val ? "Tampil" : "Sembunyi"}
            </span>
        ),
    },
    {
        key: "urutan",
        label: "Urutan",
        sortable: true,
        render: (val) => <span className="text-xs text-slate-500">{val != null ? String(val) : "—"}</span>,
    },
];

/* ─── POI Columns & Fields ───────────────────────────────────── */
const poiColumns: Column<PoiRow>[] = [
    { key: "nama", label: "Nama", sortable: true },
    {
        key: "kategori",
        label: "Kategori",
        sortable: true,
        render: (val) => (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-teal-50 text-teal-700">
                📍 {String(val)}
            </span>
        ),
    },
    {
        key: "alamat",
        label: "Alamat",
        render: (val) => (
            <span className="text-xs text-slate-500 truncate max-w-[200px] block">{val ? String(val) : "—"}</span>
        ),
    },
    {
        key: "koordinat_lat",
        label: "Koordinat",
        render: (val, row) => {
            if (!val) return <span className="text-xs text-slate-400">— Belum ada</span>;
            return (
                <span className="text-xs font-mono text-slate-600">
                    {Number(val).toFixed(4)}, {Number(row.koordinat_lng).toFixed(4)}
                </span>
            );
        },
    },
    {
        key: "created_at",
        label: "Dibuat",
        sortable: true,
        render: (val) =>
            val ? new Date(String(val)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—",
    },
];

/* ─── Main Admin Page ────────────────────────────────────────── */
export default function PetaAdminPage() {
    const { tenant } = useTenant();

    /* Tab state */
    const [activeTab, setActiveTab] = useState<TabKey>("layers");

    /* Layer CRUD */
    const layerCrud = useCrud<LayerRow>({ table: "gis_layers", orderBy: "urutan" });
    const [layerModal, setLayerModal] = useState(false);
    const [editLayer, setEditLayer] = useState<LayerRow | null>(null);
    const [deleteLayer, setDeleteLayer] = useState<LayerRow | null>(null);
    const [layerSubmitting, setLayerSubmitting] = useState(false);

    /* POI CRUD */
    const poiCrud = useCrud<PoiRow>({ table: "gis_poi", orderBy: "created_at" });
    const [poiModal, setPoiModal] = useState(false);
    const [editPoi, setEditPoi] = useState<PoiRow | null>(null);
    const [deletePoi, setDeletePoi] = useState<PoiRow | null>(null);
    const [poiSubmitting, setPoiSubmitting] = useState(false);

    /* Preview data */
    const [previewFacilities, setPreviewFacilities] = useState<FacilityItem[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    /* Load preview data when tab switches */
    const loadPreview = useCallback(async () => {
        if (!tenant) return;
        setPreviewLoading(true);
        const supabase = createClient();
        try {
            const [healthRes, eduRes, econRes, religRes, poiRes] = await Promise.all([
                supabase.schema("sidakota").from("health_facilities").select("id,nama,jenis,alamat,koordinat_lat,koordinat_lng").eq("tenant_id", tenant.id),
                supabase.schema("sidakota").from("edu_facilities").select("id,nama,jenis,alamat,koordinat_lat,koordinat_lng").eq("tenant_id", tenant.id),
                supabase.schema("sidakota").from("econ_facilities").select("id,nama,jenis,alamat,koordinat_lat,koordinat_lng").eq("tenant_id", tenant.id),
                supabase.schema("sidakota").from("social_religious").select("id,nama,jenis,lokasi,kapasitas,koordinat_lat,koordinat_lng").eq("tenant_id", tenant.id),
                supabase.schema("sidakota").from("gis_poi").select("id,nama,kategori,deskripsi,alamat,koordinat_lat,koordinat_lng,foto").eq("tenant_id", tenant.id),
            ]);
            const all: FacilityItem[] = [
                ...(healthRes.data || []).map((f: any) => ({ ...f, type: "health" as const })),
                ...(eduRes.data || []).map((f: any) => ({ ...f, type: "edu" as const })),
                ...(econRes.data || []).map((f: any) => ({ ...f, type: "econ" as const })),
                ...(religRes.data || []).map((f: any) => ({ ...f, type: "religious" as const })),
                ...(poiRes.data || []).map((f: any) => ({ ...f, type: "poi" as const })),
            ];
            setPreviewFacilities(all);
        } catch { /* ignore */ }
        finally { setPreviewLoading(false); }
    }, [tenant]);

    useEffect(() => {
        if (activeTab === "preview") loadPreview();
    }, [activeTab, loadPreview]);

    /* ── Layer submit ── */
    async function handleLayerSubmit(formData: Record<string, unknown>) {
        setLayerSubmitting(true);
        try {
            let geojsonData = editLayer?.geojson;
            if (formData.file instanceof File && formData.file.size > 0) {
                const text = await formData.file.text();
                try { geojsonData = JSON.parse(text); }
                catch { alert("File GeoJSON tidak valid!"); setLayerSubmitting(false); return; }
            }

            let styleData = editLayer?.style || {};
            if (typeof formData.style === "string" && formData.style.trim()) {
                try { styleData = JSON.parse(formData.style); } catch { /* keep old */ }
            }

            const payload: Partial<LayerRow> = {
                nama: String(formData.nama),
                jenis: String(formData.jenis),
                is_visible: formData.is_visible === "true" || formData.is_visible === true,
                style: styleData,
                urutan: Number(formData.urutan) || 0,
                geojson: geojsonData,
            };

            if (editLayer) await layerCrud.update(editLayer.id, payload);
            else await layerCrud.create(payload);

            setLayerModal(false);
            setEditLayer(null);
        } catch (e: any) {
            alert("Gagal: " + e.message);
        } finally {
            setLayerSubmitting(false);
        }
    }

    /* ── POI submit ── */
    async function handlePoiSubmit(formData: Record<string, unknown>) {
        setPoiSubmitting(true);
        try {
            const payload: Partial<PoiRow> = {
                nama: String(formData.nama),
                kategori: String(formData.kategori),
                deskripsi: formData.deskripsi ? String(formData.deskripsi) : undefined,
                alamat: formData.alamat ? String(formData.alamat) : undefined,
                koordinat_lat: Number(formData.koordinat_lat),
                koordinat_lng: Number(formData.koordinat_lng),
                foto: formData.foto ? String(formData.foto) : undefined,
            };

            if (editPoi) await poiCrud.update(editPoi.id, payload);
            else await poiCrud.create(payload);

            setPoiModal(false);
            setEditPoi(null);
        } catch (e: any) {
            alert("Gagal: " + e.message);
        } finally {
            setPoiSubmitting(false);
        }
    }

    /* ── Stats ── */
    const totalLayers = layerCrud.data.length;
    const activeLayers = layerCrud.data.filter((r) => r.is_visible).length;
    const totalPoi = poiCrud.data.length;
    const poiKategori = new Set(poiCrud.data.map((p) => p.kategori)).size;

    /* ── Tab config ── */
    const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
        { key: "layers", label: "Layer Peta", icon: Layers },
        { key: "poi", label: "Titik Penting (POI)", icon: MapPin },
        { key: "preview", label: "Preview Peta", icon: Globe },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Manajemen Peta Digital"
                description="Kelola layer peta, batas wilayah, titik penting, dan data geospasial"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Peta & GIS" },
                ]}
            />

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Layer" value={totalLayers} icon={Layers} gradient="stat-gradient-soft-blue" />
                <StatCard label="Layer Aktif" value={activeLayers} icon={Eye} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Total POI" value={totalPoi} icon={MapPin} gradient="stat-gradient-soft-amber" />
                <StatCard label="Kategori POI" value={poiKategori} icon={Map} gradient="stat-gradient-soft-violet" />
            </div>

            {/* ── Tabs ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-200">
                    <nav className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition-all ${activeTab === tab.key
                                    ? "border-primary-600 text-primary-700 bg-primary-50/50"
                                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-0">
                    {/* ═══ TAB: Layers ═══ */}
                    {activeTab === "layers" && (
                        <div className="p-4">
                            <DataTable
                                columns={layerColumns}
                                data={layerCrud.data}
                                isLoading={layerCrud.isLoading}
                                onAdd={() => { setEditLayer(null); setLayerModal(true); }}
                                onEdit={(row) => { setEditLayer(row); setLayerModal(true); }}
                                onDelete={(row) => setDeleteLayer(row)}
                                addLabel="Tambah Layer"
                                searchPlaceholder="Cari layer..."
                            />
                        </div>
                    )}

                    {/* ═══ TAB: POI ═══ */}
                    {activeTab === "poi" && (
                        <div className="p-4">
                            <DataTable
                                columns={poiColumns}
                                data={poiCrud.data}
                                isLoading={poiCrud.isLoading}
                                onAdd={() => { setEditPoi(null); setPoiModal(true); }}
                                onEdit={(row) => { setEditPoi(row); setPoiModal(true); }}
                                onDelete={(row) => setDeletePoi(row)}
                                addLabel="Tambah POI"
                                searchPlaceholder="Cari titik penting..."
                            />
                        </div>
                    )}

                    {/* ═══ TAB: Preview ═══ */}
                    {activeTab === "preview" && (
                        <div className="p-4">
                            <div className="rounded-xl overflow-hidden border border-slate-200 h-[500px] relative">
                                {previewLoading ? (
                                    <div className="h-full flex items-center justify-center bg-slate-50">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                                            <span className="text-sm text-slate-500">Memuat preview...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <MapViewer
                                        layers={layerCrud.data as GisLayer[]}
                                        facilities={previewFacilities}
                                    />
                                )}
                            </div>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {Object.entries(CATEGORY_CONFIG).map(([type, cfg]) => {
                                    const count = previewFacilities.filter((f) => f.type === type && f.koordinat_lat).length;
                                    return (
                                        <div
                                            key={type}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                                        >
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                                                style={{ backgroundColor: cfg.fillColor, color: cfg.color }}
                                            >
                                                {cfg.icon}
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-700">{cfg.label}</p>
                                                <p className="text-xs text-slate-400">{count} titik</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Modals ═══ */}
            <LayerFormModal
                open={layerModal}
                onClose={() => { setLayerModal(false); setEditLayer(null); }}
                onSubmit={handleLayerSubmit}
                editRow={editLayer}
                isSubmitting={layerSubmitting}
            />

            <PoiFormModal
                open={poiModal}
                onClose={() => { setPoiModal(false); setEditPoi(null); }}
                onSubmit={handlePoiSubmit}
                editRow={editPoi}
                isSubmitting={poiSubmitting}
            />

            <DeleteConfirm
                open={!!deleteLayer}
                onClose={() => setDeleteLayer(null)}
                onConfirm={async () => {
                    if (!deleteLayer) return;
                    setLayerSubmitting(true);
                    try { await layerCrud.remove(deleteLayer.id); setDeleteLayer(null); }
                    catch { alert("Gagal menghapus"); }
                    finally { setLayerSubmitting(false); }
                }}
                title="Hapus Layer"
                message={`Hapus layer "${deleteLayer?.nama}"?`}
                isDeleting={layerSubmitting}
            />

            <DeleteConfirm
                open={!!deletePoi}
                onClose={() => setDeletePoi(null)}
                onConfirm={async () => {
                    if (!deletePoi) return;
                    setPoiSubmitting(true);
                    try { await poiCrud.remove(deletePoi.id); setDeletePoi(null); }
                    catch { alert("Gagal menghapus"); }
                    finally { setPoiSubmitting(false); }
                }}
                title="Hapus POI"
                message={`Hapus titik "${deletePoi?.nama}"?`}
                isDeleting={poiSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   LayerFormModal
   ═══════════════════════════════════════════════════════ */
function LayerFormModal({ open, onClose, onSubmit, editRow, isSubmitting }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: LayerRow | null;
    isSubmitting: boolean;
}) {
    const isEdit = !!editRow;
    const [form, setForm] = useState<Record<string, unknown>>({
        nama: "", jenis: "boundary", is_visible: "true", style: "", urutan: 1, file: null
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                nama: editRow.nama || "",
                jenis: editRow.jenis || "boundary",
                is_visible: editRow.is_visible ? "true" : "false",
                style: editRow.style ? JSON.stringify(editRow.style, null, 2) : "",
                urutan: editRow.urutan || 1,
                file: null
            });
        } else {
            setForm({ nama: "", jenis: "boundary", is_visible: "true", style: "", urutan: 1, file: null });
        }
    }, [open, editRow]);

    function set(field: string, value: any) { setForm(p => ({ ...p, [field]: value })); }

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 shrink-0" />

                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Layer Peta" : "Tambah Layer Baru"}</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Kelola data geospasial (GeoJSON) untuk dirender di peta</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/30">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identitas Layer</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Layer <span className="text-red-500">*</span></label>
                                    <input type="text" value={String(form.nama)} onChange={e => set("nama", e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenis Layer <span className="text-red-500">*</span></label>
                                    <select value={String(form.jenis)} onChange={e => set("jenis", e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                                        <option value="boundary">Batas Wilayah (Polygon)</option>
                                        <option value="point">Titik Lokasi (Point)</option>
                                        <option value="line">Jalur/Rute (LineString)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tampilkan</label>
                                        <select value={String(form.is_visible)} onChange={e => set("is_visible", e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                                            <option value="true">Ya</option>
                                            <option value="false">Tidak</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Urutan</label>
                                        <input type="number" min="0" value={Number(form.urutan)} onChange={e => set("urutan", e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <FileJson className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data Geospasial</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">File GeoJSON {isEdit && <span className="text-xs font-normal text-gray-400">(Abaikan jika tidak ingin mengubah data map)</span>}</label>
                                    <input type="file" accept=".geojson,.json" onChange={e => set("file", e.target.files?.[0] || null)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Style (JSON) <span className="text-gray-400 font-normal text-xs">(Opsional)</span></label>
                                    <textarea value={String(form.style)} onChange={e => set("style", e.target.value)} rows={4} placeholder='{"color": "#3b82f6", "fillColor": "#93c5fd", "fillOpacity": 0.15, "weight": 2}' className="w-full font-mono text-xs px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">Batal</button>
                            <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Simpan Perubahan" : "Tambah Layer"}
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
   PoiFormModal
   ═══════════════════════════════════════════════════════ */
function PoiFormModal({ open, onClose, onSubmit, editRow, isSubmitting }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: PoiRow | null;
    isSubmitting: boolean;
}) {
    const isEdit = !!editRow;
    const [form, setForm] = useState<Record<string, unknown>>({
        nama: "", kategori: "Pemerintahan", deskripsi: "", alamat: "", koordinat_lat: "", koordinat_lng: "", foto: ""
    });

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            setForm({
                nama: editRow.nama || "",
                kategori: editRow.kategori || "Pemerintahan",
                deskripsi: editRow.deskripsi || "",
                alamat: editRow.alamat || "",
                koordinat_lat: editRow.koordinat_lat || "",
                koordinat_lng: editRow.koordinat_lng || "",
                foto: editRow.foto || ""
            });
        } else {
            setForm({ nama: "", kategori: "Pemerintahan", deskripsi: "", alamat: "", koordinat_lat: "", koordinat_lng: "", foto: "" });
        }
    }, [open, editRow]);

    function set(field: string, value: any) { setForm(p => ({ ...p, [field]: value })); }

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-sky-500 to-blue-600 shrink-0" />

                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Titik POI" : "Tambah Titik Penting"}</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Kelola data titik penting / point of interest</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/30">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <AlignLeft className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identitas Lokasi</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lokasi <span className="text-red-500">*</span></label>
                                    <input type="text" value={String(form.nama)} onChange={e => set("nama", e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori <span className="text-red-500">*</span></label>
                                    <select value={String(form.kategori)} onChange={e => set("kategori", e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                                        <option value="Pemerintahan">Pemerintahan</option>
                                        <option value="Wisata">Wisata</option>
                                        <option value="Pasar">Pasar</option>
                                        <option value="Taman">Taman</option>
                                        <option value="Infrastruktur">Infrastruktur</option>
                                        <option value="Lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">URL Foto <span className="text-gray-400 font-normal text-xs">(Opsional)</span></label>
                                    <input type="text" value={String(form.foto)} onChange={e => set("foto", e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>
                            </div>

                            <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Info className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detail Koordinat</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Latitude <span className="text-red-500">*</span></label>
                                        <input type="number" step="0.000001" value={String(form.koordinat_lat)} onChange={e => set("koordinat_lat", e.target.value)} required placeholder="-6.59" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Longitude <span className="text-red-500">*</span></label>
                                        <input type="number" step="0.000001" value={String(form.koordinat_lng)} onChange={e => set("koordinat_lng", e.target.value)} required placeholder="106.80" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat <span className="text-gray-400 font-normal text-xs">(Opsional)</span></label>
                                    <textarea value={String(form.alamat)} onChange={e => set("alamat", e.target.value)} rows={2} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deskripsi <span className="text-gray-400 font-normal text-xs">(Opsional)</span></label>
                                    <textarea value={String(form.deskripsi)} onChange={e => set("deskripsi", e.target.value)} rows={2} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
                        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">Batal</button>
                            <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Simpan Perubahan" : "Tambah POI"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

