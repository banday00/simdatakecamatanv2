"use client";

import { useState, useMemo } from "react";
import { useAdminRtlh, type RtlhRow } from "./use-admin-rtlh";
import { RtlhFormModal } from "./rtlh-form-modal";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Home, Users, MapPinHouse, IdCard, Plus, Pencil, Trash2 } from "lucide-react";

function maskNIK(nik: string | null) {
    if (!nik || nik.length < 4) return "-";
    return "••••" + nik.slice(-4);
}

export default function PerumahanPage() {
    const {
        data, isLoading, kelMap, kelurahans, stats,
        searchNIK, createEntry, updateEntry, deleteEntry,
    } = useAdminRtlh();
    const [showForm, setShowForm] = useState(false);
    const [editRow, setEditRow] = useState<RtlhRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<RtlhRow | null>(null);

    const enrichedData = useMemo(
        () => data.map(r => ({ ...r, kelurahan_nama: kelMap.get(r.kelurahan_id) || "-" })),
        [data, kelMap]
    );

    const columns: Column<RtlhRow & { kelurahan_nama?: string }>[] = useMemo(() => [
        {
            key: "nama", label: "Nama", sortable: true,
            render: (v) => <span className="font-semibold text-slate-800">{String(v ?? "-")}</span>,
        },
        {
            key: "nik", label: "NIK", sortable: true,
            render: (v) => <span className="font-mono text-xs text-slate-500">{maskNIK(String(v ?? ""))}</span>,
        },
        {
            key: "alamat", label: "Alamat",
            render: (_v, row) => (
                <div className="space-y-0.5">
                    <div className="text-sm text-slate-700 line-clamp-1">{String(row.alamat ?? "-")}</div>
                    <div className="text-xs text-slate-400">RT {String(row.rt ?? "-")} / RW {String(row.rw ?? "-")}</div>
                </div>
            ),
        },
        { key: "kelurahan_nama" as keyof RtlhRow, label: "Kelurahan", sortable: true },
        {
            key: "kategori", label: "Kategori", sortable: true,
            render: (v) => {
                const kategori = String(v ?? "");
                const cls = kategori === "Bantuan Sosial Tunai"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200";
                return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{kategori || "-"}</span>;
            },
        },
        { key: "tahun", label: "Tahun", sortable: true },
    ], []);

    async function handleSubmit(payload: Record<string, unknown>, isEdit: boolean) {
        if (isEdit && editRow) {
            await updateEntry(editRow.id, payload);
        } else {
            await createEntry(payload);
        }
        setShowForm(false);
        setEditRow(null);
    }

    async function handleDelete() {
        if (!deleteRow) return;
        await deleteEntry(deleteRow.id);
        setDeleteRow(null);
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader
                title="Penerima Bantuan RTLH"
                description="Pendataan warga penerima bantuan rumah tidak layak huni per nama dan alamat."
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Sosial", href: "/admin/sosial" },
                    { label: "Perumahan / RTLH" },
                ]}
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard size="sm" label="Total Penerima" value={stats.total.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-soft-blue" />
                <StatCard size="sm" label="Bansos Tunai" value={stats.tunai.toLocaleString("id-ID")} icon={Home} gradient="stat-gradient-soft-emerald" />
                <StatCard size="sm" label="Tidak Terencana" value={stats.tidakTerencana.toLocaleString("id-ID")} icon={MapPinHouse} gradient="stat-gradient-soft-amber" />
                <StatCard size="sm" label="Tahun Terbaru" value={stats.latestYear ? String(stats.latestYear) : "-"} icon={IdCard} gradient="stat-gradient-soft-rose" />
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={enrichedData}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setShowForm(true); }}
                onEdit={(row) => { setEditRow(row); setShowForm(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Penerima RTLH"
                searchPlaceholder="Cari nama, NIK, alamat, atau kategori..."
                emptyMessage="Belum ada data penerima RTLH."
            />

            {/* Form Modal */}
            {showForm && (
                <RtlhFormModal
                    editRow={editRow}
                    kelurahans={kelurahans}
                    onSearchNIK={searchNIK}
                    onSubmit={handleSubmit}
                    onClose={() => { setShowForm(false); setEditRow(null); }}
                />
            )}

            {/* Delete Confirm */}
            <DeleteConfirm
                open={!!deleteRow}
                title="Hapus Penerima RTLH"
                message={`Apakah Anda yakin ingin menghapus data "${deleteRow?.nama}" tahun ${deleteRow?.tahun}? Tindakan ini tidak dapat dibatalkan.`}
                onConfirm={handleDelete}
                onClose={() => setDeleteRow(null)}
            />
        </div>
    );
}
