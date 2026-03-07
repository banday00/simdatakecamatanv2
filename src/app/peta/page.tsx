"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
import {
    Loader2, Layers, ChevronLeft, ChevronRight, Search,
    MapPin, X, Building2, GraduationCap, Heart,
    ChurchIcon, Landmark,
} from "lucide-react";
import { CATEGORY_CONFIG, type FacilityItem, type GisLayer } from "@/components/map/map-config";

/* ─── Dynamic import (no SSR for Leaflet) ────────────────────── */
const MapViewer = dynamic(() => import("@/components/map/map-viewer"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <span className="text-slate-500 font-medium text-sm">Memuat Peta...</span>
            </div>
        </div>
    ),
});

/* ─── Category Icons (Lucide) ────────────────────────────────── */
const CATEGORY_ICONS: Record<string, React.ElementType> = {
    health: Heart,
    edu: GraduationCap,
    econ: Building2,
    religious: ChurchIcon,
    poi: MapPin,
};

/* ─── Main Public Map Page ───────────────────────────────────── */
export default function PetaPage() {
    const { tenant } = useTenant();

    /* ── Data state ── */
    const [layers, setLayers] = useState<GisLayer[]>([]);
    const [facilities, setFacilities] = useState<FacilityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    /* ── UI state ── */
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
        new Set(Object.keys(CATEGORY_CONFIG))
    );
    const [selectedFacility, setSelectedFacility] = useState<FacilityItem | null>(null);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    /* ── Fetch all data ── */
    const fetchData = useCallback(async () => {
        if (!tenant) return;
        const supabase = createClient();
        setIsLoading(true);

        try {
            const [gisRes, healthRes, eduRes, econRes, religiousRes, poiRes] = await Promise.all([
                supabase.from("gis_layers").select("*").eq("tenant_id", tenant.id).order("urutan"),
                supabase.from("health_facilities").select("id,nama,jenis,alamat,koordinat_lat,koordinat_lng").eq("tenant_id", tenant.id),
                supabase.from("edu_facilities").select("id,nama,jenis,alamat,koordinat_lat,koordinat_lng").eq("tenant_id", tenant.id),
                supabase.from("econ_facilities").select("id,nama,jenis,alamat,koordinat_lat,koordinat_lng").eq("tenant_id", tenant.id),
                supabase.from("social_religious").select("id,nama,jenis,lokasi,kapasitas,koordinat_lat,koordinat_lng").eq("tenant_id", tenant.id),
                supabase.from("gis_poi").select("id,nama,kategori,deskripsi,alamat,koordinat_lat,koordinat_lng,foto").eq("tenant_id", tenant.id),
            ]);

            setLayers((gisRes.data as GisLayer[]) || []);

            const all: FacilityItem[] = [
                ...(healthRes.data || []).map((f: any) => ({ ...f, type: "health" as const })),
                ...(eduRes.data || []).map((f: any) => ({ ...f, type: "edu" as const })),
                ...(econRes.data || []).map((f: any) => ({ ...f, type: "econ" as const })),
                ...(religiousRes.data || []).map((f: any) => ({ ...f, type: "religious" as const })),
                ...(poiRes.data || []).map((f: any) => ({ ...f, type: "poi" as const })),
            ];
            setFacilities(all);
        } catch (e) {
            console.error("Error loading map data", e);
        } finally {
            setIsLoading(false);
        }
    }, [tenant]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ── Toggle category ── */
    const toggleCategory = (cat: string) => {
        setVisibleCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const toggleAll = () => {
        if (visibleCategories.size === Object.keys(CATEGORY_CONFIG).length) {
            setVisibleCategories(new Set());
        } else {
            setVisibleCategories(new Set(Object.keys(CATEGORY_CONFIG)));
        }
    };

    /* ── Counts per category ── */
    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const type of Object.keys(CATEGORY_CONFIG)) {
            c[type] = facilities.filter(
                (f) => f.type === type && f.koordinat_lat && f.koordinat_lng
            ).length;
        }
        return c;
    }, [facilities]);

    /* ── Filtered facility list (for sidebar) ── */
    const filteredFacilities = useMemo(() => {
        let list = facilities.filter(
            (f) => visibleCategories.has(f.type) && f.koordinat_lat && f.koordinat_lng
        );
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (f) =>
                    f.nama.toLowerCase().includes(q) ||
                    f.jenis?.toLowerCase().includes(q) ||
                    f.alamat?.toLowerCase().includes(q) ||
                    f.kategori?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [facilities, visibleCategories, searchQuery]);

    const totalVisible = filteredFacilities.length;

    return (
        <div className="h-[calc(100vh-64px)] w-full relative flex overflow-hidden bg-slate-100">

            {/* ═══════ SIDEBAR ═══════ */}
            <aside
                className={`
                    relative z-[1001] flex flex-col bg-white border-r border-slate-200 shadow-lg
                    transition-all duration-300 ease-in-out shrink-0
                    ${sidebarOpen ? "w-[340px]" : "w-0"}
                `}
            >
                {sidebarOpen && (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-primary-50 to-cyan-50">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-primary-600" />
                                        Peta Digital
                                    </h1>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {tenant?.nama || "Kecamatan"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari fasilitas..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Layer Toggles */}
                        <div className="p-3 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Layer Fasilitas
                                </span>
                                <button
                                    onClick={toggleAll}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    {visibleCategories.size === Object.keys(CATEGORY_CONFIG).length
                                        ? "Sembunyikan Semua"
                                        : "Tampilkan Semua"}
                                </button>
                            </div>
                            <div className="space-y-1">
                                {Object.entries(CATEGORY_CONFIG).map(([type, cfg]) => {
                                    const Icon = CATEGORY_ICONS[type];
                                    const active = visibleCategories.has(type);
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => toggleCategory(type)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${active
                                                ? "bg-slate-50 text-slate-900"
                                                : "text-slate-400 hover:bg-slate-50"
                                                }`}
                                        >
                                            <div
                                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                                                style={{
                                                    backgroundColor: active ? cfg.fillColor : "#f1f5f9",
                                                    color: active ? cfg.color : "#94a3b8",
                                                }}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="flex-1 text-left font-medium">{cfg.label}</span>
                                            <span
                                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{
                                                    backgroundColor: active ? cfg.fillColor : "#f1f5f9",
                                                    color: active ? cfg.color : "#94a3b8",
                                                }}
                                            >
                                                {counts[type] || 0}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Facility List */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Daftar Lokasi
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {totalVisible} lokasi
                                    </span>
                                </div>
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                                    </div>
                                ) : filteredFacilities.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-slate-400">
                                        {searchQuery ? "Tidak ditemukan" : "Belum ada data fasilitas"}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {filteredFacilities.slice(0, 100).map((f) => {
                                            const cfg = CATEGORY_CONFIG[f.type];
                                            const Icon = CATEGORY_ICONS[f.type];
                                            const isSelected = selectedFacility?.id === f.id;
                                            return (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setSelectedFacility(isSelected ? null : f)}
                                                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all ${isSelected
                                                        ? "bg-primary-50 ring-1 ring-primary-200"
                                                        : "hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                                        style={{ backgroundColor: cfg.fillColor, color: cfg.color }}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">
                                                            {f.nama}
                                                        </p>
                                                        <p className="text-xs text-slate-400 truncate">
                                                            {f.jenis || f.kategori || cfg.label}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {filteredFacilities.length > 100 && (
                                            <p className="text-xs text-center text-slate-400 py-2">
                                                +{filteredFacilities.length - 100} lokasi lainnya
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* GIS Layer Boundaries */}
                        {layers.length > 0 && (
                            <div className="p-3 border-t border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                                    Batas Wilayah
                                </span>
                                <div className="space-y-1">
                                    {layers.filter(l => l.geojson).map((l) => (
                                        <div
                                            key={l.id}
                                            className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-600"
                                        >
                                            <div
                                                className="w-4 h-3 rounded-sm border"
                                                style={{
                                                    backgroundColor: (l.style?.fillColor || "#3b82f6") + "33",
                                                    borderColor: l.style?.color || "#3b82f6",
                                                }}
                                            />
                                            <span className="truncate">{l.nama}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </aside>

            {/* ═══════ Sidebar Toggle (when closed) ═══════ */}
            {!sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="absolute top-4 left-4 z-[1001] bg-white p-2.5 rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    title="Buka Panel"
                >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
            )}

            {/* ═══════ MAP AREA ═══════ */}
            <div className="flex-1 relative">
                <MapViewer
                    layers={layers}
                    facilities={facilities}
                    visibleCategories={visibleCategories}
                    onFacilityClick={(f) => setSelectedFacility(f)}
                    onCoordinateChange={(lat, lng) => setCoords({ lat, lng })}
                />

                {/* ── Coordinate display ── */}
                {coords && (
                    <div className="absolute bottom-6 right-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs font-mono text-slate-600">
                        {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </div>
                )}

                {/* ── Stats bar (top) ── */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md border border-slate-200">
                    {Object.entries(CATEGORY_CONFIG).map(([type, cfg]) => {
                        const Icon = CATEGORY_ICONS[type];
                        const active = visibleCategories.has(type);
                        return (
                            <button
                                key={type}
                                onClick={() => toggleCategory(type)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${active ? "opacity-100" : "opacity-40"
                                    }`}
                                title={cfg.label}
                            >
                                <div
                                    className="w-5 h-5 rounded flex items-center justify-center"
                                    style={{ backgroundColor: cfg.fillColor, color: cfg.color }}
                                >
                                    <Icon className="w-3 h-3" />
                                </div>
                                <span className="hidden lg:inline text-slate-700">{counts[type] || 0}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ═══════ DETAIL PANEL (slide from right) ═══════ */}
            {selectedFacility && (
                <div className="absolute top-0 right-0 z-[1002] h-full w-80 bg-white shadow-2xl border-l border-slate-200 animate-fade-in flex flex-col">
                    {/* Header */}
                    <div
                        className="p-4 text-white"
                        style={{
                            background: `linear-gradient(135deg, ${CATEGORY_CONFIG[selectedFacility.type]?.color || "#3b82f6"}, ${CATEGORY_CONFIG[selectedFacility.type]?.color || "#3b82f6"}cc)`,
                        }}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium opacity-80">
                                    {CATEGORY_CONFIG[selectedFacility.type]?.icon}{" "}
                                    {CATEGORY_CONFIG[selectedFacility.type]?.label}
                                </span>
                                <h2 className="text-lg font-bold mt-1 leading-tight">
                                    {selectedFacility.nama}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedFacility(null)}
                                className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Photo */}
                        {selectedFacility.foto && (
                            <div className="rounded-xl overflow-hidden border border-slate-100">
                                <img
                                    src={selectedFacility.foto}
                                    alt={selectedFacility.nama}
                                    className="w-full h-40 object-cover"
                                />
                            </div>
                        )}

                        {/* Info rows */}
                        <div className="space-y-3">
                            {selectedFacility.jenis && (
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Jenis</span>
                                    <p className="text-sm text-slate-800 mt-0.5">{selectedFacility.jenis}</p>
                                </div>
                            )}
                            {selectedFacility.kategori && (
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Kategori</span>
                                    <p className="text-sm text-slate-800 mt-0.5">{selectedFacility.kategori}</p>
                                </div>
                            )}
                            {(selectedFacility.alamat || selectedFacility.lokasi) && (
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Alamat</span>
                                    <p className="text-sm text-slate-800 mt-0.5">
                                        {selectedFacility.alamat || selectedFacility.lokasi}
                                    </p>
                                </div>
                            )}
                            {selectedFacility.deskripsi && (
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Deskripsi</span>
                                    <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">
                                        {selectedFacility.deskripsi}
                                    </p>
                                </div>
                            )}
                            {selectedFacility.kapasitas && (
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Kapasitas</span>
                                    <p className="text-sm text-slate-800 mt-0.5">
                                        {selectedFacility.kapasitas.toLocaleString("id-ID")} orang
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Coordinates */}
                        <div className="bg-slate-50 rounded-lg p-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Koordinat</span>
                            <p className="text-sm font-mono text-slate-700 mt-1">
                                {Number(selectedFacility.koordinat_lat).toFixed(6)},{" "}
                                {Number(selectedFacility.koordinat_lng).toFixed(6)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
