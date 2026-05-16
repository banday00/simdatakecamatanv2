"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTenant } from "@/lib/tenant/context";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ExportButton } from "@/components/ui/export-button";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar,
} from "recharts";
import { GitCompareArrows, Users, Loader2, ChevronDown, X } from "lucide-react";

/* ─── Indicator definitions ──────────────────────────────────── */
const INDICATORS = [
    { key: "penduduk", label: "Jumlah Penduduk", table: "gov_fact_populasi_summary", col: "jml_penduduk_total", color: "#2563eb" },
    { key: "kk", label: "Jumlah KK", table: "gov_fact_populasi_summary", col: "jml_kk_total", color: "#059669" },
    { key: "laki", label: "Laki-laki", table: "gov_fact_populasi_summary", col: "jml_penduduk_lk", color: "#0891b2" },
    { key: "perempuan", label: "Perempuan", table: "gov_fact_populasi_summary", col: "jml_penduduk_pr", color: "#e11d48" },
    { key: "stunting", label: "Kasus Stunting", table: "health_stunting", col: "balita_stunting", color: "#d97706" },
    { key: "balita", label: "Jumlah Balita", table: "health_stunting", col: "balita_total", color: "#7c3aed" },
    { key: "sanitasi", label: "Sanitasi Layak (%)", table: "infra_sanitation", col: "akses_sanitasi_persen", color: "#059669" },
    { key: "air_bersih", label: "Air Bersih (%)", table: "infra_sanitation", col: "akses_air_bersih_persen", color: "#0ea5e9" },
    { key: "rtlh", label: "Rumah Tidak Layak", table: "social_rtlh", col: "jumlah_rtlh", color: "#ef4444" },
] as const;

const BAR_COLORS = ["#2563eb", "#059669", "#d97706", "#e11d48", "#7c3aed", "#0891b2"];

type KelData = Record<string, unknown> & { kelurahan_id: string; kelurahan_nama: string };

/* ─── Main Page ──────────────────────────────────────────────── */
export default function PerbandinganPage() {
    const { tenant, kelurahans } = useTenant();
    const [selectedKels, setSelectedKels] = useState<string[]>([]);
    const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["penduduk", "kk", "stunting", "sanitasi"]);
    const [data, setData] = useState<KelData[]>([]);
    const [loading, setLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Auto-select first 2 kelurahan
    useEffect(() => {
        if (kelurahans.length >= 2 && selectedKels.length === 0) {
            setSelectedKels(kelurahans.slice(0, 2).map((k) => k.id));
        }
    }, [kelurahans, selectedKels.length]);

    /* ── Fetch comparison data ── */
    const fetchData = useCallback(async () => {
        if (!tenant || selectedKels.length === 0) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                kelurahanIds: selectedKels.join(","),
                indicators: selectedIndicators.join(","),
            });
            const response = await fetch(`/api/tenants/${tenant.slug}/admin/comparison?${params.toString()}`, {
                cache: "no-store",
            });
            const result = await response.json();
            if (!response.ok || result.error || !result.data) {
                throw new Error(result.error?.message ?? "Gagal memuat data perbandingan.");
            }

            setData((result.data.rows as KelData[]) || []);
        } catch (e) {
            console.error("Error", e);
        } finally {
            setLoading(false);
        }
    }, [tenant, selectedKels, selectedIndicators]);

    useEffect(() => {
        if (selectedKels.length > 0) fetchData();
    }, [fetchData, selectedKels]);

    /* ── Toggle kelurahan ── */
    const toggleKel = (id: string) => {
        setSelectedKels((prev) => {
            if (prev.includes(id)) return prev.filter((k) => k !== id);
            if (prev.length >= 6) return prev;
            return [...prev, id];
        });
    };

    const toggleIndicator = (key: string) => {
        setSelectedIndicators((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    /* ── Chart data ── */
    const chartData = useMemo(() => {
        return selectedIndicators
            .map((key) => {
                const ind = INDICATORS.find((i) => i.key === key);
                if (!ind) return null;
                const item: Record<string, unknown> = { indicator: ind.label };
                for (const d of data) {
                    item[d.kelurahan_nama] = d[key] ?? 0;
                }
                return item;
            })
            .filter(Boolean);
    }, [data, selectedIndicators]);

    /* ── Radar data ── */
    const radarData = useMemo(() => {
        if (data.length === 0 || selectedIndicators.length < 3) return [];
        // Normalize values 0-100 for radar
        const maxVals: Record<string, number> = {};
        for (const key of selectedIndicators) {
            maxVals[key] = Math.max(...data.map((d) => Number(d[key]) || 0), 1);
        }
        return selectedIndicators.map((key) => {
            const ind = INDICATORS.find((i) => i.key === key);
            const item: Record<string, unknown> = { indicator: ind?.label || key };
            for (const d of data) {
                const raw = Number(d[key]) || 0;
                item[d.kelurahan_nama] = Math.round((raw / maxVals[key]) * 100);
            }
            return item;
        });
    }, [data, selectedIndicators]);

    /* ── Export columns ── */
    const exportColumns = [
        { key: "kelurahan_nama", label: "Kelurahan" },
        ...selectedIndicators.map((key) => {
            const ind = INDICATORS.find((i) => i.key === key);
            return { key, label: ind?.label || key };
        }),
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <PageHeader
                    title="Perbandingan Kelurahan"
                    description="Bandingkan indikator antar kelurahan secara side-by-side"
                    breadcrumbs={[
                        { label: "Dashboard", href: "/admin" },
                        { label: "Perbandingan" },
                    ]}
                />
                {data.length > 0 && (
                    <ExportButton
                        data={data}
                        columns={exportColumns}
                        filename="perbandingan_kelurahan"
                        title="Perbandingan Kelurahan"
                        subtitle={`${data.map((d) => d.kelurahan_nama).join(" vs ")}`}
                    />
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Kelurahan" value={kelurahans.length} icon={Users} gradient="stat-gradient-soft-blue" />
                <StatCard label="Kelurahan Dipilih" value={selectedKels.length} icon={GitCompareArrows} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Indikator Aktif" value={selectedIndicators.length} icon={GitCompareArrows} gradient="stat-gradient-soft-amber" />
                <StatCard label="Data Tersedia" value={data.filter((d) => Object.keys(d).length > 2).length} icon={GitCompareArrows} gradient="stat-gradient-soft-rose" />
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Kelurahan selector */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">
                            Pilih Kelurahan (maks 6)
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg hover:border-primary-400 transition-colors"
                            >
                                <span className="text-slate-600">
                                    {selectedKels.length} kelurahan dipilih
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            {dropdownOpen && (
                                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {kelurahans.map((kel) => {
                                        const active = selectedKels.includes(kel.id);
                                        return (
                                            <button
                                                key={kel.id}
                                                onClick={() => toggleKel(kel.id)}
                                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${active ? "bg-primary-50 text-primary-700" : "text-slate-700"}`}
                                            >
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${active ? "bg-primary-600 border-primary-600" : "border-slate-300"}`}>
                                                    {active && <span className="text-white text-[10px] font-bold">✓</span>}
                                                </div>
                                                {kel.nama}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {/* Selected chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedKels.map((id, i) => {
                                const kel = kelurahans.find((k) => k.id === id);
                                return (
                                    <span
                                        key={id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white"
                                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                                    >
                                        {kel?.nama || id}
                                        <button onClick={() => toggleKel(id)}><X className="w-3 h-3" /></button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Indicator selector */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">
                            Pilih Indikator
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {INDICATORS.map((ind) => {
                                const active = selectedIndicators.includes(ind.key);
                                return (
                                    <button
                                        key={ind.key}
                                        onClick={() => toggleIndicator(ind.key)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${active
                                            ? "border-primary-300 bg-primary-50 text-primary-700"
                                            : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                            }`}
                                    >
                                        {ind.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
            )}

            {/* Charts */}
            {!loading && data.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Grouped Bar Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
                        <h3 className="font-semibold text-slate-900 mb-4">Perbandingan per Indikator</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="indicator" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                                    {data.map((d, i) => (
                                        <Bar key={d.kelurahan_id} dataKey={d.kelurahan_nama} fill={BAR_COLORS[i % BAR_COLORS.length]} radius={[4, 4, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Radar Chart */}
                    {radarData.length >= 3 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
                            <h3 className="font-semibold text-slate-900 mb-4">Radar Perbandingan (Nilai Normalisasi)</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="indicator" tick={{ fontSize: 10 }} />
                                        <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                                        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                                        {data.map((d, i) => (
                                            <Radar
                                                key={d.kelurahan_id}
                                                name={d.kelurahan_nama}
                                                dataKey={d.kelurahan_nama}
                                                stroke={BAR_COLORS[i % BAR_COLORS.length]}
                                                fill={BAR_COLORS[i % BAR_COLORS.length]}
                                                fillOpacity={0.15}
                                            />
                                        ))}
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Comparison Table */}
            {!loading && data.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900">Tabel Perbandingan</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Indikator</th>
                                    {data.map((d, i) => (
                                        <th key={d.kelurahan_id} className="px-5 py-3 text-right font-semibold" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }}>
                                            {d.kelurahan_nama}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {selectedIndicators.map((key) => {
                                    const ind = INDICATORS.find((i) => i.key === key);
                                    if (!ind) return null;
                                    const vals = data.map((d) => Number(d[key]) || 0);
                                    const maxVal = Math.max(...vals);
                                    return (
                                        <tr key={key} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3 font-medium text-slate-700">{ind.label}</td>
                                            {data.map((d, i) => {
                                                const val = Number(d[key]) || 0;
                                                const isMax = val === maxVal && val > 0;
                                                return (
                                                    <td key={d.kelurahan_id} className={`px-5 py-3 text-right tabular-nums ${isMax ? "font-bold" : "text-slate-600"}`} style={isMax ? { color: BAR_COLORS[i % BAR_COLORS.length] } : {}}>
                                                        {val.toLocaleString("id-ID")}
                                                        {isMax && <span className="ml-1 text-[10px]">🏆</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && selectedKels.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <GitCompareArrows className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-semibold text-slate-700">Pilih Kelurahan</h3>
                    <p className="text-sm text-slate-400 mt-1">Pilih minimal 2 kelurahan untuk membandingkan data</p>
                </div>
            )}
        </div>
    );
}
