"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTenant } from "@/lib/tenant/context";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ExportButton } from "@/components/ui/export-button";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { TrendingUp, Calendar, Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";

/* ─── Indicator definitions ──────────────────────────────────── */
const INDICATORS = [
    { key: "penduduk", label: "Jumlah Penduduk", table: "gov_fact_populasi_summary", col: "jml_penduduk_total", yearCol: "periode_id", unit: "jiwa" },
    { key: "kk", label: "Jumlah KK", table: "gov_fact_populasi_summary", col: "jml_kk_total", yearCol: "periode_id", unit: "KK" },
    { key: "stunting", label: "Kasus Stunting", table: "health_stunting", col: "balita_stunting", yearCol: "tahun", unit: "kasus" },
    { key: "balita", label: "Jumlah Balita", table: "health_stunting", col: "balita_total", yearCol: "tahun", unit: "jiwa" },
    { key: "prevalensi", label: "Prevalensi Stunting", table: "health_stunting", col: "prevalensi", yearCol: "tahun", unit: "%", calc: { numerator: "balita_stunting", denominator: "balita_total" } },
    { key: "sanitasi", label: "Sanitasi Layak", table: "infra_sanitation", col: "akses_sanitasi_persen", yearCol: "tahun", unit: "%" },
    { key: "air_bersih", label: "Air Bersih", table: "infra_sanitation", col: "akses_air_bersih_persen", yearCol: "tahun", unit: "%" },
    { key: "rtlh", label: "Penerima RTLH", table: "social_rtlh_recipients", col: "jumlah_rtlh", yearCol: "tahun", unit: "warga" },
    { key: "bantuan", label: "Penerima Bantuan", table: "social_assistance", col: "jumlah_penerima", yearCol: "tahun", unit: "KPM" },
] as const;

const LINE_COLORS = ["#2563eb", "#059669", "#d97706", "#e11d48", "#7c3aed", "#0891b2", "#f97316", "#84cc16"];

type TrendPoint = { tahun: number;[key: string]: number | string };

/* ─── Main Page ──────────────────────────────────────────────── */
export default function TrenPage() {
    const { tenant, kelurahans } = useTenant();
    const [activeIndicator, setActiveIndicator] = useState("penduduk");
    const [selectedKels, setSelectedKels] = useState<string[]>([]);
    const [showAggregate, setShowAggregate] = useState(true);
    const [trendData, setTrendData] = useState<TrendPoint[]>([]);
    const [loading, setLoading] = useState(false);

    const indicator = INDICATORS.find((i) => i.key === activeIndicator)!;

    /* ── Fetch trend data ── */
    const fetchTrend = useCallback(async () => {
        if (!tenant) return;
        setLoading(true);

        try {
            const response = await fetch(`/api/tenants/${tenant.slug}/admin/trends?indicator=${indicator.key}`, {
                cache: "no-store",
            });
            const result = await response.json();
            if (!response.ok || result.error || !result.data) {
                throw new Error(result.error?.message ?? "Gagal memuat data tren.");
            }

            const rows = result.data.rows as Record<string, unknown>[];

            if (!rows || rows.length === 0) {
                setTrendData([]);
                setLoading(false);
                return;
            }

            // Resolve periode_id → tahun for gov_fact_populasi_summary
            let periodeMap: Record<number, number> = {};
            if (indicator.yearCol === "periode_id") {
                periodeMap = result.data.periodeMap || {};
            }

            // Filter by kelurahan client-side if in per-kelurahan mode
            let filtered = rows;
            if (selectedKels.length > 0 && !showAggregate) {
                filtered = filtered.filter((r) => selectedKels.includes(String(r.kelurahan_id)));
            }

            // Determine if this is a calculated indicator
            const isCalc = 'calc' in indicator && indicator.calc;

            // Group by year
            const yearMap = new Map<number, Record<string, number[]>>();
            for (const row of filtered) {
                let tahun: number;
                if (indicator.yearCol === "periode_id" && periodeMap[Number(row.periode_id)]) {
                    tahun = periodeMap[Number(row.periode_id)];
                } else {
                    tahun = Number(row[indicator.yearCol] || row.tahun);
                }
                if (!tahun || isNaN(tahun)) continue;

                let val: number;
                if (isCalc) {
                    const num = Number(row[indicator.calc!.numerator]) || 0;
                    const den = Number(row[indicator.calc!.denominator]) || 0;
                    val = den > 0 ? Math.round((num / den) * 10000) / 100 : 0;
                } else {
                    val = Number(row[indicator.col]) || 0;
                }
                const kelId = String(row.kelurahan_id || "_agg");

                if (!yearMap.has(tahun)) yearMap.set(tahun, {});
                const yearEntry = yearMap.get(tahun)!;
                if (!yearEntry[kelId]) yearEntry[kelId] = [];
                yearEntry[kelId].push(val);
            }

            // Build trend points
            const points: TrendPoint[] = [];
            for (const [tahun, kelVals] of yearMap) {
                const point: TrendPoint = { tahun };

                if (showAggregate) {
                    // Aggregate: sum all kelurahans for this year
                    let total = 0;
                    for (const vals of Object.values(kelVals)) {
                        total += vals.reduce((s, v) => s + v, 0);
                    }
                    // For percentage indicators, average instead of sum
                    if (indicator.unit === "%") {
                        const count = Object.keys(kelVals).length;
                        point["Kecamatan"] = count > 0 ? Math.round(total / count * 100) / 100 : 0;
                    } else {
                        point["Kecamatan"] = total;
                    }
                } else {
                    // Per-kelurahan lines
                    for (const kelId of selectedKels) {
                        const kel = kelurahans.find((k) => k.id === kelId);
                        const name = kel?.nama || kelId;
                        const vals = kelVals[kelId] || [0];
                        point[name] = vals.reduce((s, v) => s + v, 0);
                    }
                }

                points.push(point);
            }

            // Sort by year
            points.sort((a, b) => a.tahun - b.tahun);
            setTrendData(points);
        } catch (e) {
            console.error("Error", e);
        } finally {
            setLoading(false);
        }
    }, [tenant, indicator, selectedKels, showAggregate, kelurahans]);

    useEffect(() => {
        fetchTrend();
    }, [fetchTrend]);

    /* ── Line keys ── */
    const lineKeys = useMemo(() => {
        if (trendData.length === 0) return [];
        const keys = new Set<string>();
        for (const pt of trendData) {
            for (const k of Object.keys(pt)) {
                if (k !== "tahun") keys.add(k);
            }
        }
        return Array.from(keys);
    }, [trendData]);

    /* ── Summary stats ── */
    const stats = useMemo(() => {
        if (trendData.length < 2 || lineKeys.length === 0) return null;
        const firstKey = lineKeys[0];
        const first = Number(trendData[0][firstKey]) || 0;
        const last = Number(trendData[trendData.length - 1][firstKey]) || 0;
        const change = last - first;
        const changePct = first !== 0 ? Math.round((change / first) * 10000) / 100 : 0;
        const years = trendData.length;
        return { first, last, change, changePct, years, firstYear: trendData[0].tahun, lastYear: trendData[trendData.length - 1].tahun };
    }, [trendData, lineKeys]);

    /* ── Export ── */
    const exportCols = [
        { key: "tahun", label: "Tahun" },
        ...lineKeys.map((k) => ({ key: k, label: k })),
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <PageHeader
                    title="Analisis Tren"
                    description="Pantau perkembangan indikator dari tahun ke tahun"
                    breadcrumbs={[
                        { label: "Dashboard", href: "/admin" },
                        { label: "Analisis Tren" },
                    ]}
                />
                {trendData.length > 0 && (
                    <ExportButton
                        data={trendData as Record<string, unknown>[]}
                        columns={exportCols}
                        filename={`tren_${activeIndicator}`}
                        title={`Tren ${indicator.label}`}
                    />
                )}
            </div>

            {/* Summary Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label={`Tahun ${stats.firstYear}`} value={stats.first.toLocaleString("id-ID")} icon={Calendar} gradient="stat-gradient-soft-blue" />
                    <StatCard label={`Tahun ${stats.lastYear}`} value={stats.last.toLocaleString("id-ID")} icon={Calendar} gradient="stat-gradient-soft-emerald" />
                    <StatCard
                        label="Perubahan"
                        value={`${stats.change >= 0 ? "+" : ""}${stats.change.toLocaleString("id-ID")}`}
                        icon={stats.change > 0 ? ArrowUp : stats.change < 0 ? ArrowDown : Minus}
                        gradient={stats.change >= 0 ? "stat-gradient-soft-emerald" : "stat-gradient-soft-rose"}
                    />
                    <StatCard label="Perubahan (%)" value={`${stats.changePct >= 0 ? "+" : ""}${stats.changePct}%`} icon={TrendingUp} gradient="stat-gradient-soft-amber" />
                </div>
            )}

            {/* Controls */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="space-y-4">
                    {/* Indicator selector */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Pilih Indikator</label>
                        <div className="flex flex-wrap gap-2">
                            {INDICATORS.map((ind) => (
                                <button
                                    key={ind.key}
                                    onClick={() => setActiveIndicator(ind.key)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${activeIndicator === ind.key
                                        ? "border-primary-400 bg-primary-50 text-primary-700 shadow-sm"
                                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                        }`}
                                >
                                    {ind.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-slate-700">Tampilan:</label>
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => { setShowAggregate(true); setSelectedKels([]); }}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${showAggregate ? "bg-white shadow-sm text-primary-700" : "text-slate-500"}`}
                            >
                                Agregat Kecamatan
                            </button>
                            <button
                                onClick={() => setShowAggregate(false)}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${!showAggregate ? "bg-white shadow-sm text-primary-700" : "text-slate-500"}`}
                            >
                                Per Kelurahan
                            </button>
                        </div>
                    </div>

                    {/* Kelurahan selector (when per-kelurahan mode) */}
                    {!showAggregate && (
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Pilih Kelurahan</label>
                            <div className="flex flex-wrap gap-2">
                                {kelurahans.map((kel) => {
                                    const active = selectedKels.includes(kel.id);
                                    return (
                                        <button
                                            key={kel.id}
                                            onClick={() =>
                                                setSelectedKels((prev) =>
                                                    active ? prev.filter((k) => k !== kel.id)
                                                        : prev.length < 6 ? [...prev, kel.id]
                                                            : prev
                                                )
                                            }
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${active
                                                ? "border-primary-400 bg-primary-50 text-primary-700"
                                                : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                                }`}
                                        >
                                            {kel.nama}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
            )}

            {/* Charts */}
            {!loading && trendData.length > 0 && (
                <div className="space-y-5">
                    {/* Line Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-1">
                            Tren {indicator.label}
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">
                            {showAggregate ? "Agregat seluruh kecamatan" : `${selectedKels.length} kelurahan dipilih`} · Satuan: {indicator.unit}
                        </p>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="tahun" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}
                                        formatter={(val: number) => [val.toLocaleString("id-ID"), ""]}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                                    {lineKeys.map((key, i) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            name={key}
                                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                                            activeDot={{ r: 6 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Area Chart */}
                    {lineKeys.length === 1 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-semibold text-slate-900 mb-4">Area Chart — {indicator.label}</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="tahun" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                                        <Area
                                            type="monotone"
                                            dataKey={lineKeys[0]}
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#trendGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">Data Tren per Tahun</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-5 py-3 text-left font-semibold text-slate-600">Tahun</th>
                                        {lineKeys.map((k, i) => (
                                            <th key={k} className="px-5 py-3 text-right font-semibold" style={{ color: LINE_COLORS[i % LINE_COLORS.length] }}>{k}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {trendData.map((pt) => (
                                        <tr key={pt.tahun} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3 font-medium text-slate-700">{pt.tahun}</td>
                                            {lineKeys.map((k) => (
                                                <td key={k} className="px-5 py-3 text-right tabular-nums text-slate-600">
                                                    {Number(pt[k] || 0).toLocaleString("id-ID")}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && trendData.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-semibold text-slate-700">Belum Ada Data Tren</h3>
                    <p className="text-sm text-slate-400 mt-1">Data multi-tahun belum tersedia untuk indikator ini</p>
                </div>
            )}
        </div>
    );
}
