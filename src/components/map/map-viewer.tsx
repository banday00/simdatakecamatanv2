"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
    MapContainer,
    TileLayer,
    GeoJSON,
    CircleMarker,
    Popup,
    LayersControl,
    LayerGroup,
    useMap,
    useMapEvents,
    ScaleControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { FacilityItem, GisLayer, CATEGORY_CONFIG, MapViewerProps } from "./map-config";

export type { MapViewerProps };

/* ─── Category Config ────────────────────────────────────────── */
/* Imported from map-config */


/* ─── Fix Leaflet Icons ──────────────────────────────────────── */
const fixLeafletIcon = () => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
};

/* ─── Map controller (invalidate size, coord tracking) ───────── */
function MapController({ onCoordinateChange }: { onCoordinateChange?: (lat: number, lng: number) => void }) {
    const map = useMap();

    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 200);
    }, [map]);

    useMapEvents({
        mousemove(e) {
            onCoordinateChange?.(e.latlng.lat, e.latlng.lng);
        },
    });

    return null;
}

/* ─── GeoJSON Layer with hover highlight ─────────────────────── */
function BoundaryLayer({ layer }: { layer: GisLayer }) {
    const geoJsonRef = useRef<L.GeoJSON | null>(null);

    const baseStyle = useMemo(
        () => ({
            color: layer.style?.color || "#3b82f6",
            weight: layer.style?.weight || 2,
            opacity: 0.8,
            fillColor: layer.style?.fillColor || "#3b82f6",
            fillOpacity: layer.style?.fillOpacity || 0.12,
        }),
        [layer.style]
    );

    const highlightStyle = useMemo(
        () => ({
            ...baseStyle,
            weight: 3,
            fillOpacity: 0.3,
            color: "#1d4ed8",
        }),
        [baseStyle]
    );

    function onEachFeature(feature: any, leafletLayer: L.Layer) {
        const props = feature.properties || {};
        const name = props.nama || props.name || props.NAMA || props.NAME || layer.nama;
        const labels = Object.entries(props)
            .filter(([k]) => !["nama", "name", "NAMA", "NAME"].includes(k))
            .slice(0, 5)
            .map(([k, v]) => `<b style="text-transform:capitalize">${k.replace(/_/g, " ")}:</b> ${v}`)
            .join("<br/>");

        leafletLayer.bindPopup(
            `<div style="min-width:180px;font-family:system-ui,sans-serif">
                <h3 style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1e293b">${name}</h3>
                ${labels ? `<div style="font-size:12px;color:#475569;line-height:1.5">${labels}</div>` : ""}
            </div>`
        );

        const path = leafletLayer as L.Path;
        path.on("mouseover", () => path.setStyle(highlightStyle));
        path.on("mouseout", () => path.setStyle(baseStyle));
    }

    if (!layer.geojson) return null;

    return (
        <GeoJSON
            ref={(ref) => { geoJsonRef.current = ref; }}
            key={layer.id}
            data={layer.geojson}
            style={() => baseStyle}
            onEachFeature={onEachFeature}
        />
    );
}

/* ─── Main MapViewer ─────────────────────────────────────────── */
export default function MapViewer({
    layers,
    facilities,
    visibleCategories,
    onFacilityClick,
    onCoordinateChange,
}: MapViewerProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        fixLeafletIcon();
        setMounted(true);
    }, []);

    // Bogor Utara coordinates
    const center: [number, number] = [-6.5971, 106.806];

    // Filter facilities by visible categories
    const visibleFacilities = useMemo(() => {
        if (!visibleCategories) return facilities;
        return facilities.filter((f) => visibleCategories.has(f.type));
    }, [facilities, visibleCategories]);

    if (!mounted) {
        return (
            <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <span className="text-slate-500 font-medium text-sm">Memuat Peta...</span>
                </div>
            </div>
        );
    }

    return (
        <MapContainer
            center={center}
            zoom={14}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            scrollWheelZoom={true}
            zoomControl={false}
        >
            <MapController onCoordinateChange={onCoordinateChange} />
            <ScaleControl position="bottomleft" imperial={false} />

            {/* ── Base Maps ── */}
            <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="RBI Indonesia (BIG)">
                    <TileLayer
                        attribution='&copy; <a href="https://www.big.go.id">BIG</a> - Peta RBI'
                        url="https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="OpenStreetMap">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="Satelit (Esri)">
                    <TileLayer
                        attribution="Tiles &copy; Esri"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="Topografi">
                    <TileLayer
                        attribution='Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                        maxZoom={17}
                    />
                </LayersControl.BaseLayer>
            </LayersControl>

            {/* ── GeoJSON Boundary Layers ── */}
            {layers
                .filter((l) => l.geojson && l.is_visible)
                .map((layer) => (
                    <BoundaryLayer key={layer.id} layer={layer} />
                ))}

            {/* ── Facility Markers (grouped by category) ── */}
            {Object.entries(CATEGORY_CONFIG).map(([type, cfg]) => {
                const items = visibleFacilities.filter((f) => f.type === type);
                if (items.length === 0) return null;
                return (
                    <LayerGroup key={type}>
                        {items.map((f) => {
                            if (!f.koordinat_lat || !f.koordinat_lng) return null;
                            return (
                                <CircleMarker
                                    key={f.id}
                                    center={[Number(f.koordinat_lat), Number(f.koordinat_lng)]}
                                    radius={8}
                                    pathOptions={{
                                        color: cfg.color,
                                        fillColor: cfg.fillColor,
                                        fillOpacity: 0.85,
                                        weight: 2,
                                    }}
                                    eventHandlers={{
                                        click: () => onFacilityClick?.(f),
                                    }}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 200, fontFamily: "system-ui, sans-serif" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                                <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                                                    {f.nama}
                                                </h3>
                                            </div>
                                            {f.jenis && (
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        padding: "2px 8px",
                                                        borderRadius: 999,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        background: cfg.fillColor,
                                                        color: cfg.color,
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    {f.jenis}
                                                </span>
                                            )}
                                            {f.kategori && (
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        padding: "2px 8px",
                                                        borderRadius: 999,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        background: cfg.fillColor,
                                                        color: cfg.color,
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    {f.kategori}
                                                </span>
                                            )}
                                            {(f.alamat || f.lokasi) && (
                                                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                                                    📍 {f.alamat || f.lokasi}
                                                </p>
                                            )}
                                            {f.deskripsi && (
                                                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                                                    {f.deskripsi}
                                                </p>
                                            )}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                    </LayerGroup>
                );
            })}
        </MapContainer>
    );
}
