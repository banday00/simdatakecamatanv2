import { ReactNode } from "react";

export type FacilityItem = {
    id: string;
    nama: string;
    jenis?: string;
    alamat?: string;
    lokasi?: string;
    kategori?: string;
    deskripsi?: string;
    foto?: string;
    kapasitas?: number;
    koordinat_lat: number;
    koordinat_lng: number;
    type: "health" | "edu" | "econ" | "religious" | "poi";
};

export type GisLayer = {
    id: string;
    nama: string;
    jenis: string;
    geojson: any;
    style?: { color?: string; fillColor?: string; fillOpacity?: number; weight?: number };
    is_visible: boolean;
    urutan?: number;
};

export type MapViewerProps = {
    layers: GisLayer[];
    facilities: FacilityItem[];
    visibleCategories?: Set<string>;
    onFacilityClick?: (facility: FacilityItem) => void;
    onCoordinateChange?: (lat: number, lng: number) => void;
};

export const CATEGORY_CONFIG: Record<
    string,
    { label: string; color: string; fillColor: string; icon: string }
> = {
    health: { label: "Fasilitas Kesehatan", color: "#ef4444", fillColor: "#fca5a5", icon: "🏥" },
    edu: { label: "Sarana Pendidikan", color: "#3b82f6", fillColor: "#93c5fd", icon: "🎓" },
    econ: { label: "Sarana Ekonomi", color: "#f59e0b", fillColor: "#fcd34d", icon: "🏪" },
    religious: { label: "Sarana Ibadah", color: "#8b5cf6", fillColor: "#c4b5fd", icon: "🕌" },
    poi: { label: "Titik Penting (POI)", color: "#14b8a6", fillColor: "#5eead4", icon: "📍" },
};
