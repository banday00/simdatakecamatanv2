"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useCrud } from "@/hooks/use-crud";
import { createClient } from "@/lib/supabase/client";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
    GraduationCap, TrendingUp, TrendingDown, BarChart3,
    X, Loader2, Save, MapPin, Activity, Users, Calculator,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════ */

type Row = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    jenjang: string;
    tahun: number;
    semester?: number;
    angka_partisipasi: number;
    angka_putus_sekolah: number;
    angka_melek_huruf: number;
    jumlah_usia_7_12?: number;
    jumlah_usia_13_15?: number;
    jumlah_usia_16_18?: number;
};

const JENJANG_COLORS: Record<string, string> = {
    "SD": "bg-blue-100 text-blue-700 border-blue-200",
    "SMP": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "SMA": "bg-violet-100 text-violet-700 border-violet-200",
};

/**
 * Mapping jenjang di edu_facilities → kelompok umur APK
 * SD + SPK SD → 7-12 thn
 * SMP + SPK SMP → 13-15 thn
 * SMA + SPK SMA + SMK → 16-18 thn
 */
const JENJANG_SD_MAP = ["SD", "SPK SD"];
const JENJANG_SMP_MAP = ["SMP", "SPK SMP"];
const JENJANG_SMA_MAP = ["SMA", "SPK SMA", "SMK"];

const JENJANG_OPTIONS = ["SD", "SMP", "SMA"];

const columns: Column<Row>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "tahun", label: "Tahun", sortable: true },
    {
        key: "semester",
        label: "Semester",
        sortable: true,
        render: (v) => {
            const raw = Number(v) || 0;
            const sem = raw > 10 ? (raw % 10) : raw;
            return <span className="text-xs font-mono text-slate-500">{sem ? `S${sem}` : "—"}</span>;
        },
    },
    {
        key: "jenjang",
        label: "Jenjang",
        sortable: true,
        render: (v) => (
            <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${JENJANG_COLORS[String(v)] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {String(v)}
            </span>
        ),
    },
    {
        key: "angka_partisipasi",
        label: "APK (%)",
        sortable: true,
        render: (v) => <span className="font-semibold text-indigo-700">{Number(v ?? 0).toFixed(1)}%</span>,
    },
    {
        key: "angka_putus_sekolah",
        label: "Putus Sekolah",
        sortable: true,
        render: (v) => {
            const val = Number(v ?? 0);
            return <span className={val > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-medium"}>{val.toLocaleString("id-ID")}</span>;
        },
    },
    {
        key: "angka_melek_huruf",
        label: "Melek Huruf (%)",
        sortable: true,
        render: (v) => <span className="font-semibold text-emerald-700">{Number(v ?? 0).toFixed(1)}%</span>,
    },
];

/* ═══════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════ */

export default function PartisipasiPage() {
    const { kelurahans } = useTenant();
    const { data, isLoading, create, update, remove, isKelurahanAdmin, filterKelurahanId } = useCrud<Row>({ table: "edu_participation" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    const avgPartisipasi = data.length ? (data.reduce((s, r) => s + (r.angka_partisipasi || 0), 0) / data.length).toFixed(1) : "0";
    const totalPutus = data.reduce((s, r) => s + (r.angka_putus_sekolah || 0), 0);
    const avgMelekHuruf = data.length ? (data.reduce((s, r) => s + (r.angka_melek_huruf || 0), 0) / data.length).toFixed(1) : "0";

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (editRow) await update(editRow.id, formData);
            else await create(formData);
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            console.error("[Partisipasi] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try { await remove(deleteRow.id); setDeleteRow(null); }
        catch (err: any) {
            console.error("[Partisipasi] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Partisipasi Pendidikan"
                description="Angka partisipasi, melek huruf, dan putus sekolah per jenjang"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pendidikan", href: "/admin/pendidikan" },
                    { label: "Partisipasi" }
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Data Entries" value={data.length} icon={BarChart3} gradient="stat-gradient-soft-blue" />
                <StatCard label="Rata-rata APK" value={`${avgPartisipasi}%`} icon={GraduationCap} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Total Putus Sekolah" value={totalPutus.toLocaleString("id-ID")} icon={TrendingDown} gradient="stat-gradient-soft-rose" />
                <StatCard label="Rata-rata Melek Huruf" value={`${avgMelekHuruf}%`} icon={TrendingUp} gradient="stat-gradient-soft-amber" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)}
                addLabel="Tambah Data"
                searchPlaceholder="Cari jenjang..."
            />

            <PartisipasiFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                isSubmitting={isSubmitting}
                kelurahanOptions={kelurahanOptions}
                isKelurahanAdmin={isKelurahanAdmin}
                filterKelurahanId={filterKelurahanId}
            />

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                title="Hapus Data Partisipasi"
                message={`Apakah Anda yakin ingin menghapus data ${deleteRow?.jenjang} tahun ${deleteRow?.tahun} S${(deleteRow?.semester ?? 0) > 10 ? ((deleteRow?.semester ?? 0) % 10) : (deleteRow?.semester ?? '')}? Tindakan ini tidak dapat dibatalkan.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PartisipasiFormModal
   ═══════════════════════════════════════════════════════ */

const inputCls = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm";
const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";
const sectionHeaderCls = "flex items-center gap-2 pb-2 border-b border-gray-200 mb-5";

function PartisipasiFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: Row | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;

    const emptyForm = useCallback(() => ({
        kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
        tahun: new Date().getFullYear(),
        semester: 1,
        jenjang: "SD",
        angka_partisipasi: 0,
        angka_putus_sekolah: 0,
        angka_melek_huruf: 0,
        jumlah_usia_7_12: 0,
        jumlah_usia_13_15: 0,
        jumlah_usia_16_18: 0,
    }), [isKelurahanAdmin, filterKelurahanId]);

    const [form, setForm] = useState<Record<string, unknown>>(emptyForm());

    // Jumlah siswa dari edu_facilities (fetched)
    const [siswaFromFacilities, setSiswaFromFacilities] = useState<{
        sd: number; smp: number; sma: number;
    }>({ sd: 0, smp: 0, sma: 0 });
    const [loadingSiswa, setLoadingSiswa] = useState(false);

    // AbortController untuk mencegah race condition
    const abortRef = useRef<AbortController | null>(null);

    // Fetch data siswa dari edu_facilities berdasarkan kelurahan + semester (format: tahun*10+sem)
    const fetchSiswa = useCallback(async (kelurahanId: string, tahun: number, semester: number) => {
        if (!kelurahanId) {
            setSiswaFromFacilities({ sd: 0, smp: 0, sma: 0 });
            return;
        }
        // Abort fetch sebelumnya jika masih berjalan
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoadingSiswa(true);
        const semesterCombined = tahun * 10 + semester; // e.g. 20251
        try {
            const supabase = createClient();
            const { data: facilities } = await supabase
                .schema("sidakota")
                .from("edu_facilities")
                .select("jenjang, jumlah_siswa")
                .eq("kelurahan_id", kelurahanId)
                .eq("tahun_ajaran", tahun)
                .eq("semester", semesterCombined)
                .abortSignal(controller.signal);

            if (controller.signal.aborted) return;

            if (facilities && facilities.length > 0) {
                let sd = 0, smp = 0, sma = 0;
                facilities.forEach((f: any) => {
                    const j = (f.jenjang || "").trim();
                    const siswa = Number(f.jumlah_siswa) || 0;
                    if (JENJANG_SD_MAP.includes(j)) sd += siswa;
                    if (JENJANG_SMP_MAP.includes(j)) smp += siswa;
                    if (JENJANG_SMA_MAP.includes(j)) sma += siswa;
                });
                setSiswaFromFacilities({ sd, smp, sma });
            } else {
                setSiswaFromFacilities({ sd: 0, smp: 0, sma: 0 });
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            console.error("[Partisipasi] fetchSiswa:", err);
            setSiswaFromFacilities({ sd: 0, smp: 0, sma: 0 });
        } finally {
            if (!controller.signal.aborted) setLoadingSiswa(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            // Parse semester: jika format gabungan (20251), ambil digit terakhir untuk form display
            const rawSem = (editRow as any).semester ?? 1;
            const parsedSemester = rawSem > 10 ? (rawSem % 10) : rawSem;
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                semester: parsedSemester,
                jenjang: editRow.jenjang ?? "SD",
                angka_partisipasi: editRow.angka_partisipasi ?? 0,
                angka_putus_sekolah: editRow.angka_putus_sekolah ?? 0,
                angka_melek_huruf: editRow.angka_melek_huruf ?? 0,
                jumlah_usia_7_12: editRow.jumlah_usia_7_12 ?? 0,
                jumlah_usia_13_15: editRow.jumlah_usia_13_15 ?? 0,
                jumlah_usia_16_18: editRow.jumlah_usia_16_18 ?? 0,
            });
            if (editRow.kelurahan_id) {
                fetchSiswa(editRow.kelurahan_id, editRow.tahun ?? new Date().getFullYear(), parsedSemester);
            }
        } else {
            setForm(emptyForm());
            setSiswaFromFacilities({ sd: 0, smp: 0, sma: 0 });
        }
    }, [open, editRow, emptyForm, fetchSiswa]);

    function set(field: string, value: string | number) {
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            const kelId = (field === "kelurahan_id" ? value : next.kelurahan_id) as string;
            const thn = (field === "tahun" ? Number(value) : Number(next.tahun)) || new Date().getFullYear();
            const sem = (field === "semester" ? Number(value) : Number(next.semester)) || 1;
            // Re-fetch data siswa ketika kelurahan, tahun, atau semester berubah
            if ((field === "kelurahan_id" || field === "tahun" || field === "semester") && kelId) {
                fetchSiswa(kelId, thn, sem);
            }
            return next;
        });
    }

    // Jumlah siswa bersekolah sesuai jenjang aktif (dari edu_facilities)
    const siswaAktif = useMemo(() => {
        const j = form.jenjang as string;
        if (j === "SD") return siswaFromFacilities.sd;
        if (j === "SMP") return siswaFromFacilities.smp;
        if (j === "SMA") return siswaFromFacilities.sma;
        return 0;
    }, [form.jenjang, siswaFromFacilities]);

    // Penduduk kelompok umur sesuai jenjang aktif
    const pendudukAktif = useMemo(() => {
        const j = form.jenjang as string;
        if (j === "SD") return Number(form.jumlah_usia_7_12) || 0;
        if (j === "SMP") return Number(form.jumlah_usia_13_15) || 0;
        if (j === "SMA") return Number(form.jumlah_usia_16_18) || 0;
        return 0;
    }, [form.jenjang, form.jumlah_usia_7_12, form.jumlah_usia_13_15, form.jumlah_usia_16_18]);

    // Hitung APK otomatis
    const computedAPK = useMemo(() => {
        if (pendudukAktif <= 0) return null;
        return Math.min((siswaAktif / pendudukAktif) * 100, 999);
    }, [siswaAktif, pendudukAktif]);

    // Sync APK ke form saat berubah
    useEffect(() => {
        if (computedAPK !== null) {
            setForm((prev) => ({ ...prev, angka_partisipasi: Number(computedAPK.toFixed(2)) }));
        }
    }, [computedAPK]);

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        const submitData = { ...form };
        // Format semester: tahun * 10 + semester (misal 20251)
        const ta = Number(form.tahun) || new Date().getFullYear();
        const sem = Number(form.semester) || 1;
        submitData.semester = ta * 10 + sem;
        onSubmit(submitData);
    }

    if (!open) return null;

    const availableYears = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
    const jenjang = form.jenjang as string;

    // Label dan field aktif per jenjang
    const ageGroup = jenjang === "SD"
        ? { label: "Usia 7–12 Tahun (SD/MI)", field: "jumlah_usia_7_12", color: "blue" }
        : jenjang === "SMP"
            ? { label: "Usia 13–15 Tahun (SMP/MTs)", field: "jumlah_usia_13_15", color: "indigo" }
            : { label: "Usia 16–18 Tahun (SMA/SMK)", field: "jumlah_usia_16_18", color: "violet" };

    const colorMap: Record<string, string> = {
        blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-700",
        indigo: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700",
        violet: "from-violet-50 to-violet-100 border-violet-200 text-violet-700",
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Partisipasi Pendidikan" : "Tambah Partisipasi Pendidikan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                APK dihitung otomatis dari data sarana pendidikan & jumlah penduduk kelompok umur
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Tutup">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/30 space-y-8">

                        {/* ── Bagian 1: Konteks Laporan ── */}
                        <div>
                            <div className={sectionHeaderCls}>
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Konteks Laporan</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <div>
                                    <label className={labelCls}>Kelurahan <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        className={inputCls}
                                        value={(form.kelurahan_id as string) || ""}
                                        onChange={(e) => set("kelurahan_id", e.target.value)}
                                        disabled={kelurahanOptions.length === 1}
                                    >
                                        <option value="" disabled>— Pilih Kelurahan —</option>
                                        {kelurahanOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Jenjang <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        className={inputCls}
                                        value={(form.jenjang as string) || "SD"}
                                        onChange={(e) => set("jenjang", e.target.value)}
                                    >
                                        {JENJANG_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Tahun Data <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        className={inputCls}
                                        value={(form.tahun as number) || new Date().getFullYear()}
                                        onChange={(e) => set("tahun", Number(e.target.value))}
                                    >
                                        {availableYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Semester <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        className={inputCls}
                                        value={(form.semester as number) || 1}
                                        onChange={(e) => set("semester", Number(e.target.value))}
                                    >
                                        <option value={1}>Semester 1 (Ganjil)</option>
                                        <option value={2}>Semester 2 (Genap)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── Bagian 2: Data Kelompok Umur + Perhitungan APK ── */}
                        <div>
                            <div className={sectionHeaderCls}>
                                <Users className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data Kelompok Umur & APK</span>
                                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-full">APK = Siswa Sarana ÷ Penduduk Usia × 100</span>
                            </div>

                            {/* Input penduduk kelompok umur aktif */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelCls}>
                                        Jumlah Penduduk {ageGroup.label}
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={Number(form[ageGroup.field]) || 0}
                                        onChange={(e) => set(ageGroup.field, Number(e.target.value))}
                                        placeholder="Total penduduk kelompok umur ini"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Sumber: BPS / Data Kependudukan</p>
                                </div>

                                <div>
                                    <label className={labelCls}>
                                        Jumlah Siswa dari Sarana ({jenjang})
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            readOnly
                                            className={`${inputCls} bg-slate-50 cursor-not-allowed font-semibold text-indigo-700`}
                                            value={siswaAktif}
                                        />
                                        {loadingSiswa && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Otomatis dari tabel Sarana Pendidikan (edu_facilities)
                                    </p>
                                </div>
                            </div>


                            {/* APK Preview */}
                            {!!form.kelurahan_id && (
                                <div className={`mt-4 p-4 rounded-xl border bg-gradient-to-r ${colorMap[ageGroup.color]} flex items-center gap-4`}>
                                    <Calculator className="w-6 h-6 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">APK {jenjang} (Dihitung Otomatis)</p>
                                        <p className="text-3xl font-black leading-tight">
                                            {computedAPK !== null ? `${computedAPK.toFixed(2)}%` : "—"}
                                        </p>
                                        <p className="text-[10px] opacity-60 mt-0.5">
                                            = {siswaAktif.toLocaleString("id-ID")} siswa ÷ {pendudukAktif.toLocaleString("id-ID")} penduduk × 100
                                        </p>
                                    </div>
                                    {!siswaAktif && !loadingSiswa && (
                                        <p className="text-[10px] font-bold bg-white/60 px-3 py-1.5 rounded-lg text-amber-700">
                                            ⚠ Belum ada data sarana {jenjang} di kelurahan ini
                                        </p>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* ── Bagian 3: Indikator Lainnya ── */}
                        <div>
                            <div className={sectionHeaderCls}>
                                <Activity className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Indikator Lainnya</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <div>
                                    <label className={labelCls}>APK (%) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            readOnly={computedAPK !== null}
                                            className={`${inputCls} ${computedAPK !== null ? "bg-indigo-50 border-indigo-300 font-semibold text-indigo-700 cursor-not-allowed" : ""}`}
                                            value={(form.angka_partisipasi as number) || 0}
                                            onChange={(e) => set("angka_partisipasi", Number(e.target.value))}
                                            placeholder="contoh: 95.5"
                                        />
                                        {computedAPK !== null && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-500 font-bold">AUTO</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Otomatis jika data kelompok umur terisi</p>
                                </div>

                                <div>
                                    <label className={labelCls}>Putus Sekolah (jiwa)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={(form.angka_putus_sekolah as number) || 0}
                                        onChange={(e) => set("angka_putus_sekolah", Number(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Melek Huruf (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        max={100}
                                        className={inputCls}
                                        value={(form.angka_melek_huruf as number) || 0}
                                        onChange={(e) => set("angka_melek_huruf", Number(e.target.value))}
                                        placeholder="contoh: 98.7"
                                    />
                                </div>
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Simpan Perubahan" : "Tambah Data"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
