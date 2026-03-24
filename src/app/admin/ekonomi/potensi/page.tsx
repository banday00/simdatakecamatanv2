"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/client";
import { Store, Users, Banknote, TrendingUp, X, Loader2, Save, Tags, PiggyBank } from "lucide-react";

/* ── Types ── */
type RefLapanganUsaha = { id: number; nama: string };

type Row = {
    id: string;
    tenant_id?: string;
    kelurahan_id?: string;
    kelurahan_nama?: string;
    nama_usaha: string;
    alamat_usaha?: string;
    jenis_usaha_id?: number | null;
    jenis_usaha_nama?: string;     // resolved from join
    pemilik?: string;
    jumlah_tenaga_kerja?: number;
    omzet_per_bulan?: number;
    status?: string;
    created_at?: string;
    [key: string]: unknown;
};

/* ── Badge ── */
const STATUS_COLORS: Record<string, string> = {
    "aktif": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "tidak aktif": "bg-red-50 text-red-700 border-red-200",
    "tutup": "bg-slate-100 text-slate-600 border-slate-200",
};

const columns: Column<Row>[] = [
    { key: "nama_usaha", label: "Nama Usaha", sortable: true },
    {
        key: "jenis_usaha_nama", label: "Jenis", sortable: true,
        render: (v) => <span className="inline-flex px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded-md border bg-blue-50 text-blue-700 border-blue-200">{String(v || "-")}</span>
    },
    {
        key: "pemilik", label: "Pemilik", sortable: true,
        render: (v) => <span className="text-slate-700 font-medium">{String(v || "-")}</span>
    },
    {
        key: "jumlah_tenaga_kerja", label: "Tenaga Kerja", sortable: true,
        render: (v) => <span className="text-slate-700 font-medium">{Number(v ?? 0).toLocaleString("id-ID")} orang</span>
    },
    {
        key: "omzet_per_bulan", label: "Omzet/Bulan", sortable: true,
        render: (v) => <span className="text-emerald-700 font-semibold">Rp {Number(v ?? 0).toLocaleString("id-ID")}</span>
    },
    {
        key: "status", label: "Status", sortable: true,
        render: (v) => {
            const val = String(v || "aktif").toLowerCase();
            const cls = STATUS_COLORS[val] || "bg-slate-50 text-slate-600 border-slate-200";
            return <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-md border capitalize ${cls}`}>{val}</span>;
        }
    },
    {
        key: "kelurahan_nama", label: "Kelurahan", sortable: true,
        render: (v) => <span className="text-gray-500 text-xs">{String(v || "-")}</span>
    },
];

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif", "Tutup"];

/* ── Hook: fetch ref_lapangan_usaha ── */
function useRefLapanganUsaha() {
    const [items, setItems] = useState<RefLapanganUsaha[]>([]);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data } = await (supabase as any)
                .schema("sidakota")
                .from("ref_lapangan_usaha")
                .select("id, nama")
                .order("id", { ascending: true });
            setItems(data ?? []);
        }
        load();
    }, []);

    return items;
}

/* ── Hook: fetch econ_potential with join ── */
function useEconPotential(tenantId: string | undefined) {
    const [data, setData] = useState<Row[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        if (!tenantId) return;
        setIsLoading(true);
        const supabase = createClient();
        const { data: rows } = await (supabase as any)
            .schema("sidakota")
            .from("econ_potential")
            .select("*, ref_lapangan_usaha:jenis_usaha_id(id, nama)")
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false });

        setData(
            (rows ?? []).map((r: any) => ({
                ...r,
                jenis_usaha_nama: r.ref_lapangan_usaha?.nama ?? "-",
            }))
        );
        setIsLoading(false);
    }, [tenantId]);

    useEffect(() => { load(); }, [load]);

    return { data, isLoading, reload: load };
}

export default function PotensiPage() {
    const { tenant, kelurahans } = useTenant();
    const { user } = useAuth();
    const isKelurahanAdmin = user?.role === "admin_kelurahan";
    const filterKelurahanId = isKelurahanAdmin ? (user as any)?.kelurahan_id : null;

    const { data: rawData, isLoading, reload } = useEconPotential(tenant?.id);
    const refLapanganUsaha = useRefLapanganUsaha();

    // Enrich with kelurahan_nama + filter
    const enrichedData = rawData
        .map(r => ({ ...r, kelurahan_nama: kelurahans.find(k => k.id === r.kelurahan_id)?.nama || "-" }))
        .filter(r => !filterKelurahanId || r.kelurahan_id === filterKelurahanId);

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kelurahanOptions = isKelurahanAdmin
        ? kelurahans.filter(k => k.id === filterKelurahanId).map(k => ({ label: k.nama, value: k.id }))
        : kelurahans.map(k => ({ label: k.nama, value: k.id }));

    const totalUMKM = enrichedData.length;
    const activeUMKM = enrichedData.filter(r => (r.status || "aktif").toLowerCase() === "aktif").length;
    const totalTK = enrichedData.reduce((s, r) => s + (Number(r.jumlah_tenaga_kerja) || 0), 0);
    const totalOmzet = enrichedData.reduce((s, r) => s + (Number(r.omzet_per_bulan) || 0), 0);

    async function handleSubmit(fd: Record<string, unknown>) {
        if (!tenant?.id) return;
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            const payload = {
                ...fd,
                tenant_id: tenant.id,
                jenis_usaha_id: Number(fd.jenis_usaha_id) || null,
            };
            if (editRow) {
                await (supabase as any).schema("sidakota").from("econ_potential").update(payload).eq("id", editRow.id);
            } else {
                await (supabase as any).schema("sidakota").from("econ_potential").insert(payload);
            }
            setModalOpen(false);
            setEditRow(null);
            await reload();
        } catch {
            alert(editRow ? "Gagal memperbarui data UMKM." : "Gagal menyimpan data UMKM.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            await (supabase as any).schema("sidakota").from("econ_potential").delete().eq("id", deleteRow.id);
            setDeleteRow(null);
            await reload();
        } catch {
            alert("Gagal menghapus data UMKM.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader title="Potensi Usaha / UMKM" description="Data UMKM dan kelola potensi ekonomi masyarakat"
                breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Ekonomi", href: "/admin/ekonomi" }, { label: "Potensi" }]} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total UMKM" value={totalUMKM.toLocaleString("id-ID")} icon={Store} gradient="stat-gradient-soft-blue" />
                <StatCard label="UMKM Aktif" value={activeUMKM.toLocaleString("id-ID")} icon={TrendingUp} gradient="stat-gradient-soft-emerald" />
                <StatCard label="Serapan Tenaga Kerja" value={`${totalTK.toLocaleString("id-ID")} org`} icon={Users} gradient="stat-gradient-soft-amber" />
                <StatCard label="Total Omzet/Bulan" value={`Rp ${totalOmzet >= 1e9 ? (totalOmzet / 1e9).toFixed(1) + " M" : (totalOmzet / 1e6).toFixed(0) + " jt"}`} icon={Banknote} gradient="stat-gradient-soft-rose" />
            </div>

            <DataTable columns={columns} data={enrichedData} isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(r) => { setEditRow(r); setModalOpen(true); }}
                onDelete={(r) => setDeleteRow(r)}
                addLabel="Tambah UMKM" searchPlaceholder="Cari nama usaha, jenis, pemilik..." />

            <PotensiEkonomiFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                kelurahanOptions={kelurahanOptions}
                isSubmitting={isSubmitting}
                filterKelurahanId={filterKelurahanId}
                isKelurahanAdmin={isKelurahanAdmin}
                refLapanganUsaha={refLapanganUsaha}
            />

            <DeleteConfirm open={!!deleteRow} onClose={() => setDeleteRow(null)} onConfirm={handleDelete} isDeleting={isSubmitting}
                title="Hapus Data UMKM?" message={`Yakin ingin menghapus "${deleteRow?.nama_usaha || ""}"? Data tidak dapat dikembalikan.`} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PotensiEkonomiFormModal — Blue Theme
   ═══════════════════════════════════════════════════════ */
function PotensiEkonomiFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, kelurahanOptions, filterKelurahanId, isKelurahanAdmin, refLapanganUsaha,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: Row | null;
    isSubmitting: boolean;
    kelurahanOptions: { label: string; value: string }[];
    filterKelurahanId?: string | null;
    isKelurahanAdmin?: boolean;
    refLapanganUsaha: RefLapanganUsaha[];
}) {
    const isEdit = !!editRow;

    const [form, setForm] = useState<Record<string, unknown>>({
        kelurahan_id: "",
        nama_usaha: "",
        jenis_usaha_id: "",
        pemilik: "",
        alamat_usaha: "",
        jumlah_tenaga_kerja: 0,
        omzet_per_bulan: 0,
        status: "Aktif",
    });

    useEffect(() => {
        if (!open) return;
        const firstId = refLapanganUsaha[0]?.id ?? "";
        if (editRow) {
            setForm({
                kelurahan_id: editRow.kelurahan_id ?? "",
                nama_usaha: editRow.nama_usaha ?? "",
                jenis_usaha_id: editRow.jenis_usaha_id ?? firstId,
                pemilik: editRow.pemilik ?? "",
                alamat_usaha: editRow.alamat_usaha ?? "",
                jumlah_tenaga_kerja: editRow.jumlah_tenaga_kerja ?? 0,
                omzet_per_bulan: editRow.omzet_per_bulan ?? 0,
                status: editRow.status ?? "Aktif",
            });
        } else {
            setForm({
                kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : (kelurahanOptions[0]?.value || ""),
                nama_usaha: "",
                jenis_usaha_id: firstId,
                pemilik: "",
                alamat_usaha: "",
                jumlah_tenaga_kerja: 0,
                omzet_per_bulan: 0,
                status: "Aktif",
            });
        }
    }, [open, editRow, kelurahanOptions, filterKelurahanId, isKelurahanAdmin, refLapanganUsaha]);

    function set(field: string, value: string | number) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />

                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit Profil UMKM" : "Tambah UMKM Baru"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Masukkan rincian usaha dagang, industri kreatif, produksi, maupun UMKM rumahan.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Tutup">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/30">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Left: Profil Usaha */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                    <Tags className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Profil Usaha</span>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Kelurahan <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                disabled={isKelurahanAdmin}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                                                value={(form.kelurahan_id as string) || ""}
                                                onChange={(e) => set("kelurahan_id", e.target.value)}
                                            >
                                                <option value="" disabled>— Pilih —</option>
                                                {kelurahanOptions.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Status Usaha <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.status as string) || "Aktif"}
                                                onChange={(e) => set("status", e.target.value)}
                                            >
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nama Kelompok/Usaha/UMKM <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Contoh: Kedai Mawar, Butik Sejahtera..."
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.nama_usaha as string) || ""}
                                            onChange={(e) => set("nama_usaha", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Industri/Bidang Usaha <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.jenis_usaha_id as number | string) || ""}
                                            onChange={(e) => set("jenis_usaha_id", Number(e.target.value))}
                                        >
                                            <option value="" disabled>— Pilih Bidang Usaha —</option>
                                            {refLapanganUsaha.map((opt) => (
                                                <option key={opt.id} value={opt.id}>{opt.nama}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Pemilik/Penanggung Jawab
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nama pemilik usaha"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={(form.pemilik as string) || ""}
                                            onChange={(e) => set("pemilik", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right: Kapasitas & Finansial */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                    <PiggyBank className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Kapasitas &amp; Finansial</span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Jumlah Tenaga Kerja <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                className="w-full pl-4 pr-16 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.jumlah_tenaga_kerja as number) || 0}
                                                onChange={(e) => set("jumlah_tenaga_kerja", Number(e.target.value))}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                                <span className="text-gray-500 text-sm">orang</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Omzet Per Bulan (Rp) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                                <span className="text-gray-500 font-medium">Rp</span>
                                            </div>
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                value={(form.omzet_per_bulan as number) || 0}
                                                onChange={(e) => set("omzet_per_bulan", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Alamat Usaha
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Jl. Contoh No. 1, RT 01/RW 02..."
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                                            value={(form.alamat_usaha as string) || ""}
                                            onChange={(e) => set("alamat_usaha", e.target.value)}
                                        />
                                    </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                    <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Tips Pendataan</h4>
                                    <p className="text-sm text-blue-700 leading-relaxed">
                                        Data &quot;Omzet&quot; diinputkan dalam satuan nominal <b>Rupiah (Rp)</b>. Harap tidak menyingkat inputan menggunakan &quot;Ribu&quot; atau &quot;Juta&quot;, namun ketikkan angka asli secara keseluruhan (misal: &quot;15000000&quot; bukan &quot;15 Juta&quot;).
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
                        <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
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
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Simpan Perubahan" : "Tambah Usaha"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
