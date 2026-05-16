"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { School, GraduationCap, BookOpen, Building, X, Loader2, Save, FileText, MapPin, Users, CalendarDays } from "lucide-react";

type FacilityRow = Record<string, unknown> & {
    id: string;
    kelurahan_id?: string;
    nama: string;
    jenjang: string;
    status: string;
    npsn: string;
    jumlah_siswa: number;
    jumlah_siswa_laki: number;
    jumlah_siswa_perempuan: number;
    jumlah_siswa_dalam_kota: number;
    jumlah_siswa_luar_kota: number;
    jumlah_guru: number;
    jumlah_rombel: number;
    jumlah_ruang_kelas: number;
    akreditasi: string;
    semester: number;
    tahun_ajaran: number;
    partisipasi_bos: string;
    koordinat_lat: number;
    koordinat_lng: number;
};

const JENJANG_COLORS: Record<string, string> = {
    "PAUD": "bg-pink-100 text-pink-700 border-pink-200",
    "TK": "bg-rose-100 text-rose-700 border-rose-200",
    "SD": "bg-blue-100 text-blue-700 border-blue-200",
    "SMP": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "SMA": "bg-violet-100 text-violet-700 border-violet-200",
    "SMK": "bg-purple-100 text-purple-700 border-purple-200",
};

const columns: Column<FacilityRow>[] = [
    { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
    { key: "nama", label: "Nama Sekolah", sortable: true },
    {
        key: "jenjang",
        label: "Jenjang",
        sortable: true,
        render: (val) => (
            <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${JENJANG_COLORS[String(val)] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {String(val)}
            </span>
        ),
    },
    {
        key: "status",
        label: "Status",
        render: (val) => {
            const isNegeri = (String(val) || "").toLowerCase() === "negeri";
            return (
                <span className={`inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-md border ${isNegeri ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {String(val)}
                </span>
            );
        },
    },
    {
        key: "tahun_ajaran",
        label: "T.A.",
        sortable: true,
        render: (val, row) => {
            const sem = Number(row.semester) || 0;
            const semDisplay = sem > 10 ? (sem % 10) : sem;
            return (
                <span className="text-xs text-slate-500 font-mono">
                    {val ? `${val}/${Number(val)+1}` : "-"}
                    {semDisplay ? ` S${semDisplay}` : ""}
                </span>
            );
        },
    },
    {
        key: "jumlah_siswa",
        label: "Siswa",
        sortable: true,
        render: (val, row) => (
            <div className="text-right">
                <div className="font-bold text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</div>
                {(Number(row.jumlah_siswa_laki) > 0 || Number(row.jumlah_siswa_perempuan) > 0) && (
                    <div className="text-[10px] text-slate-400">
                        ♂{Number(row.jumlah_siswa_laki ?? 0)} ♀{Number(row.jumlah_siswa_perempuan ?? 0)}
                    </div>
                )}
            </div>
        ),
    },
    {
        key: "jumlah_guru",
        label: "Guru",
        sortable: true,
        render: (val) => <span className="font-medium text-slate-700">{Number(val ?? 0).toLocaleString("id-ID")}</span>,
    },
    {
        key: "jumlah_rombel",
        label: "Rombel",
        render: (val) => <span className="font-medium text-slate-600">{Number(val ?? 0)}</span>,
    },
    {
        key: "akreditasi",
        label: "Akreditasi",
        render: (val) => {
            const v = String(val || "Belum");
            const color = v === "A" ? "text-emerald-600 font-bold" : v === "B" ? "text-blue-600 font-bold" : v === "C" ? "text-amber-600 font-bold" : "text-slate-400";
            return <span className={color}>{v}</span>;
        },
    },
    {
        key: "partisipasi_bos",
        label: "BOS",
        render: (val) => {
            const v = (String(val || "tidak")).toLowerCase();
            return (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${v === "ya" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {v === "ya" ? "YA" : "TIDAK"}
                </span>
            );
        },
    },
];

const JENJANG_OPTIONS = ["PAUD", "TK", "SD", "SMP", "SMA", "SMK"];
const STATUS_OPTIONS = ["Negeri", "Swasta"];
const AKREDITASI_OPTIONS = ["A", "B", "C", "Belum"];
const BOS_OPTIONS = ["ya", "tidak"];
const SEMESTER_OPTIONS = [
    { label: "Semester 1 (Ganjil)", value: 1 },
    { label: "Semester 2 (Genap)", value: 2 },
];

function generateTahunAjaranOptions() {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
        years.push(y);
    }
    return years;
}

export default function SaranaPage() {
    const { tenant, kelurahans } = useTenant();
    const { profile } = useAuth();
    const isKelurahanAdmin = profile?.role === "admin_kelurahan";
    const filterKelurahanId = isKelurahanAdmin ? profile?.kelurahan_id ?? null : null;

    const [data, setData] = useState<FacilityRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<FacilityRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<FacilityRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/pendidikan/sarana`);
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal memuat sarana pendidikan");
            }
            setData(json.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal memuat sarana pendidikan";
            setError(message);
            console.error("[PendidikanSarana] fetchData:", err);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter((k) => k.id === filterKelurahanId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Enrich data with kelurahan_nama
    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelurahans.find((k) => k.id === row.kelurahan_id)?.nama || "—",
    }));

    const total = data.length;
    const totalSiswa = data.reduce((s, r) => s + (r.jumlah_siswa || 0), 0);
    const totalGuru = data.reduce((s, r) => s + (r.jumlah_guru || 0), 0);
    const negeri = data.filter((r) => (r.status || "").toLowerCase() === "negeri").length;

    async function handleSubmit(formData: Record<string, unknown>) {
        setIsSubmitting(true);
        try {
            if (!tenant?.slug) throw new Error("Tenant belum tersedia.");
            const url = editRow
                ? `/api/tenants/${tenant.slug}/admin/pendidikan/sarana/${editRow.id}`
                : `/api/tenants/${tenant.slug}/admin/pendidikan/sarana`;
            const res = await fetch(url, {
                method: editRow ? "PATCH" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(formData),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menyimpan sarana pendidikan");
            }
            await fetchData();
            setModalOpen(false);
            setEditRow(null);
        } catch (err: any) {
            console.error("[Sarana] handleSubmit:", err);
            alert(`Gagal menyimpan: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.slug) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/tenants/${tenant.slug}/admin/pendidikan/sarana/${deleteRow.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Gagal menghapus sarana pendidikan");
            }
            await fetchData();
            setDeleteRow(null);
        }
        catch (err: any) {
            console.error("[Sarana] handleDelete:", err);
            alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
        }
        finally { setIsSubmitting(false); }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Sarana Pendidikan"
                description="Data sarana pendidikan dari PAUD hingga SMA/SMK"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Pendidikan", href: "/admin/pendidikan" },
                    { label: "Sarana" },
                ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Sekolah" value={total} icon={School} gradient="stat-gradient-soft-blue" />
                <StatCard label="Total Siswa" value={totalSiswa} icon={GraduationCap} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Total Guru" value={totalGuru} icon={BookOpen} gradient="stat-gradient-soft-indigo" />
                <StatCard label="Sekolah Negeri" value={negeri} icon={Building} gradient="stat-gradient-soft-amber" />
            </div>

            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Sarana"
                searchPlaceholder="Cari sekolah..."
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <SaranaFormModal
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
                title="Hapus Sarana Pendidikan"
                message={`Apakah Anda yakin ingin menghapus "${deleteRow?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SaranaFormModal
   ═══════════════════════════════════════════════════════ */

function SaranaFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, isKelurahanAdmin, filterKelurahanId,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: FacilityRow | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
}) {
    const isEdit = !!editRow;
    const currentYear = new Date().getFullYear();
    const tahunAjaranOptions = generateTahunAjaranOptions();

    const defaultForm = {
        kelurahan_id: "",
        nama: "",
        npsn: "",
        jenjang: "SD",
        status: "Negeri",
        akreditasi: "Belum",
        tahun_ajaran: currentYear,
        semester: 1,
        jumlah_siswa: 0,
        jumlah_siswa_laki: 0,
        jumlah_siswa_perempuan: 0,
        jumlah_siswa_dalam_kota: 0,
        jumlah_siswa_luar_kota: 0,
        jumlah_guru: 0,
        jumlah_rombel: 0,
        jumlah_ruang_kelas: 0,
        partisipasi_bos: "tidak",
        koordinat_lat: "",
        koordinat_lng: "",
    };

    const [form, setForm] = useState<Record<string, unknown>>(defaultForm);

    useEffect(() => {
        if (!open) return;
        if (editRow) {
            // Parse semester: jika format gabungan (20251), ambil digit terakhir
            const rawSem = editRow.semester ?? 1;
            const parsedSemester = rawSem > 10 ? (rawSem % 10) : rawSem;
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama: editRow.nama ?? "",
                npsn: editRow.npsn ?? "",
                jenjang: editRow.jenjang ?? "SD",
                status: editRow.status ?? "Negeri",
                akreditasi: editRow.akreditasi ?? "Belum",
                tahun_ajaran: editRow.tahun_ajaran ?? currentYear,
                semester: parsedSemester,
                jumlah_siswa: editRow.jumlah_siswa ?? 0,
                jumlah_siswa_laki: editRow.jumlah_siswa_laki ?? 0,
                jumlah_siswa_perempuan: editRow.jumlah_siswa_perempuan ?? 0,
                jumlah_siswa_dalam_kota: editRow.jumlah_siswa_dalam_kota ?? 0,
                jumlah_siswa_luar_kota: editRow.jumlah_siswa_luar_kota ?? 0,
                jumlah_guru: editRow.jumlah_guru ?? 0,
                jumlah_rombel: editRow.jumlah_rombel ?? 0,
                jumlah_ruang_kelas: editRow.jumlah_ruang_kelas ?? 0,
                partisipasi_bos: editRow.partisipasi_bos ?? "tidak",
                koordinat_lat: editRow.koordinat_lat ?? "",
                koordinat_lng: editRow.koordinat_lng ?? "",
            });
        } else {
            setForm({
                ...defaultForm,
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
            });
        }
    }, [open, editRow, isKelurahanAdmin, filterKelurahanId]);

    function set(field: string, value: string | number) {
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            // Auto-calculate Total Siswa = Laki-laki + Perempuan
            if (field === "jumlah_siswa_laki" || field === "jumlah_siswa_perempuan") {
                const laki = Number(field === "jumlah_siswa_laki" ? value : next.jumlah_siswa_laki) || 0;
                const perempuan = Number(field === "jumlah_siswa_perempuan" ? value : next.jumlah_siswa_perempuan) || 0;
                next.jumlah_siswa = laki + perempuan;
            }
            return next;
        });
    }

    // Validasi: Dalam Kota + Luar Kota harus = Total Siswa
    const totalSiswa = Number(form.jumlah_siswa) || 0;
    const dalamKota = Number(form.jumlah_siswa_dalam_kota) || 0;
    const luarKota = Number(form.jumlah_siswa_luar_kota) || 0;
    const kotaSum = dalamKota + luarKota;
    const kotaMismatch = totalSiswa > 0 && kotaSum > 0 && kotaSum !== totalSiswa;

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        // Validasi dalam + luar kota
        if (kotaMismatch) {
            alert(`Dalam Kota (${dalamKota}) + Luar Kota (${luarKota}) = ${kotaSum} tidak sama dengan Total Siswa (${totalSiswa}). Harap perbaiki.`);
            return;
        }
        const submitData = { ...form };
        submitData.koordinat_lat = form.koordinat_lat ? Number(form.koordinat_lat) : null;
        submitData.koordinat_lng = form.koordinat_lng ? Number(form.koordinat_lng) : null;
        // Format semester: tahun_ajaran * 10 + semester (misal 20251)
        const ta = Number(form.tahun_ajaran) || currentYear;
        const sem = Number(form.semester) || 1;
        submitData.semester = ta * 10 + sem;
        onSubmit(submitData);
    }

    if (!open) return null;

    const inputCls = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm";
    const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";
    const sectionHeaderCls = "flex items-center gap-2 pb-2 border-b border-gray-200";

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                {/* Gradient accent - Blue Theme */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
                            <School className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Sarana Pendidikan" : "Tambah Sarana Pendidikan"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Catat informasi legalitas, kapasitas, dan operasional sarana pendidikan.
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

                        {/* ── Bagian 1: Identitas & Legalitas ── */}
                        <div>
                            <div className={sectionHeaderCls}>
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identitas & Legalitas</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                                <div className="sm:col-span-2 lg:col-span-3">
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

                                <div className="sm:col-span-2 lg:col-span-3">
                                    <label className={labelCls}>Nama Sekolah <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        className={inputCls}
                                        value={(form.nama as string) || ""}
                                        onChange={(e) => set("nama", e.target.value)}
                                        placeholder="Contoh: SDN 01 Bogor Utara"
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>NPSN</label>
                                    <input
                                        type="text"
                                        className={inputCls}
                                        value={(form.npsn as string) || ""}
                                        onChange={(e) => set("npsn", e.target.value)}
                                        placeholder="8 Digit Nomor Pokok"
                                        maxLength={10}
                                    />
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
                                    <label className={labelCls}>Status</label>
                                    <select
                                        className={inputCls}
                                        value={(form.status as string) || "Negeri"}
                                        onChange={(e) => set("status", e.target.value)}
                                    >
                                        {STATUS_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Akreditasi</label>
                                    <select
                                        className={inputCls}
                                        value={(form.akreditasi as string) || "Belum"}
                                        onChange={(e) => set("akreditasi", e.target.value)}
                                    >
                                        {AKREDITASI_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Partisipasi BOS</label>
                                    <select
                                        className={inputCls}
                                        value={(form.partisipasi_bos as string) || "tidak"}
                                        onChange={(e) => set("partisipasi_bos", e.target.value)}
                                    >
                                        {BOS_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>{opt === "ya" ? "Ya" : "Tidak"}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── Bagian 2: Periode Data ── */}
                        <div>
                            <div className={sectionHeaderCls}>
                                <CalendarDays className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Periode Data</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                                <div>
                                    <label className={labelCls}>Tahun Ajaran <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        className={inputCls}
                                        value={(form.tahun_ajaran as number) || currentYear}
                                        onChange={(e) => set("tahun_ajaran", Number(e.target.value))}
                                    >
                                        {tahunAjaranOptions.map((y) => (
                                            <option key={y} value={y}>{y}/{y + 1}</option>
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
                                        {SEMESTER_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── Bagian 3: Data Siswa ── */}
                        <div>
                            <div className={sectionHeaderCls}>
                                <Users className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data Siswa</span>
                                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-500 rounded-full">Total = L + P</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                                {/* Siswa Laki-laki */}
                                <div>
                                    <label className={labelCls}>Siswa Laki-laki <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={(form.jumlah_siswa_laki as number) || 0}
                                        onChange={(e) => set("jumlah_siswa_laki", Number(e.target.value))}
                                    />
                                </div>

                                {/* Siswa Perempuan */}
                                <div>
                                    <label className={labelCls}>Siswa Perempuan <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="number"
                                        min={0}
                                        className={inputCls}
                                        value={(form.jumlah_siswa_perempuan as number) || 0}
                                        onChange={(e) => set("jumlah_siswa_perempuan", Number(e.target.value))}
                                    />
                                </div>

                                {/* Total Siswa (readonly, auto-calculated) */}
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Total Siswa</label>
                                    <div className="relative">
                                        <input
                                            readOnly
                                            type="number"
                                            className={`${inputCls} bg-emerald-50 border-emerald-300 text-emerald-700 font-bold cursor-not-allowed`}
                                            value={totalSiswa}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-bold">AUTO</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        = Laki-laki ({Number(form.jumlah_siswa_laki) || 0}) + Perempuan ({Number(form.jumlah_siswa_perempuan) || 0})
                                    </p>
                                </div>

                                {/* Dalam Kota */}
                                <div>
                                    <label className={labelCls}>Dalam Kota</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className={`${inputCls} ${kotaMismatch ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                        value={(form.jumlah_siswa_dalam_kota as number) || 0}
                                        onChange={(e) => set("jumlah_siswa_dalam_kota", Number(e.target.value))}
                                    />
                                </div>

                                {/* Luar Kota */}
                                <div>
                                    <label className={labelCls}>Luar Kota</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className={`${inputCls} ${kotaMismatch ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                        value={(form.jumlah_siswa_luar_kota as number) || 0}
                                        onChange={(e) => set("jumlah_siswa_luar_kota", Number(e.target.value))}
                                    />
                                </div>

                                {/* Validasi Dalam+Luar Kota */}
                                {kotaMismatch && (
                                    <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                                        ⚠️ Dalam Kota ({dalamKota.toLocaleString('id-ID')}) + Luar Kota ({luarKota.toLocaleString('id-ID')}) = <strong>{kotaSum.toLocaleString('id-ID')}</strong> ≠ Total Siswa (<strong>{totalSiswa.toLocaleString('id-ID')}</strong>)
                                    </div>
                                )}
                                {!kotaMismatch && kotaSum > 0 && (
                                    <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                                        ✅ Dalam Kota ({dalamKota.toLocaleString('id-ID')}) + Luar Kota ({luarKota.toLocaleString('id-ID')}) = Total Siswa ({totalSiswa.toLocaleString('id-ID')})
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Bagian 4: Kapasitas & Lokasi ── */}
                        <div>
                            <div className={sectionHeaderCls}>
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kapasitas & Lokasi</span>
                            </div>
                            <div className="space-y-5 mt-5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div>
                                        <label className={labelCls}>Jumlah Guru</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputCls}
                                            value={(form.jumlah_guru as number) || 0}
                                            onChange={(e) => set("jumlah_guru", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelCls}>Rombel</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputCls}
                                            value={(form.jumlah_rombel as number) || 0}
                                            onChange={(e) => set("jumlah_rombel", Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelCls}>Ruang Kelas</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputCls}
                                            value={(form.jumlah_ruang_kelas as number) || 0}
                                            onChange={(e) => set("jumlah_ruang_kelas", Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelCls}>Latitude</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            className={inputCls}
                                            value={(form.koordinat_lat as string | number) ?? ""}
                                            onChange={(e) => set("koordinat_lat", e.target.value)}
                                            placeholder="-6.xxxxxx"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelCls}>Longitude</label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            className={inputCls}
                                            value={(form.koordinat_lng as string | number) ?? ""}
                                            onChange={(e) => set("koordinat_lng", e.target.value)}
                                            placeholder="106.xxxxxx"
                                        />
                                    </div>
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
