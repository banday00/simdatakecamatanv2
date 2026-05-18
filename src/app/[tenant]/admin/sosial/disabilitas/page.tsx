"use client";

import { useState, useMemo } from "react";
import { useAdminDisabilitas, type DisabilitasRow } from "./use-admin-disabilitas";
import { DisabilitasFormModal } from "./disabilitas-form-modal";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Accessibility, Users, HandHeart, Plus, Pencil, Trash2 } from "lucide-react";

function maskNIK(nik: string | null) {
    if (!nik || nik.length < 4) return "-";
    return "••••" + nik.slice(-4);
}

export default function DisabilitasPage() {
    const {
        data, isLoading, masterDisabilitas, masterBantuan,
        kelMap, kelurahans, stats,
        searchNIK, createEntry, updateEntry, deleteEntry,
    } = useAdminDisabilitas();

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<DisabilitasRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<DisabilitasRow | null>(null);

    const columns: Column<DisabilitasRow>[] = useMemo(() => [
        {
            key: "nama" as keyof DisabilitasRow, label: "Nama", sortable: true,
            render: (v, row) => (
                <div>
                    <p className="font-semibold text-gray-900 text-sm">{String(v)}</p>
                    <p className="text-xs text-gray-400 font-mono">{maskNIK(row.nik)}</p>
                </div>
            ),
        },
        {
            key: "jenis_kelamin" as keyof DisabilitasRow, label: "L/P", sortable: true,
            render: (v) => {
                const isL = ["L", "Laki-laki"].includes(String(v));
                return <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${isL ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-pink-50 text-pink-700 border border-pink-200"}`}>{isL ? "L" : "P"}</span>;
            },
        },
        {
            key: "usia" as keyof DisabilitasRow, label: "Usia", sortable: true,
            render: (v) => v != null ? <span className="text-sm text-gray-700">{String(v)} th</span> : <span className="text-gray-300">-</span>,
        },
        {
            key: "kelurahan_nama" as keyof DisabilitasRow, label: "Alamat", sortable: true,
            render: (_v, row) => (
                <div className="text-xs">
                    <p className="text-gray-700 font-medium">{row.alamat || "-"}</p>
                    <p className="text-gray-400">RT {row.rt || "-"} / RW {row.rw || "-"} · {row.kelurahan_nama || "-"}</p>
                </div>
            ),
        },
        {
            key: "nama_disabilitas" as keyof DisabilitasRow, label: "Disabilitas", sortable: true,
            render: (v) => <span className="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{String(v)}</span>,
        },
        {
            key: "bantuan_list" as keyof DisabilitasRow, label: "Bantuan",
            render: (_v, row) => {
                const list = row.bantuan_list || [];
                if (list.length === 0) return <span className="text-xs text-gray-300 italic">Belum ada</span>;
                return (
                    <div className="flex flex-wrap gap-1">
                        {list.map(b => (
                            <span key={b.bantuan_id} className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {b.nama_bantuan}
                            </span>
                        ))}
                    </div>
                );
            },
        },
        {
            key: "id" as keyof DisabilitasRow, label: "Aksi",
            render: (_v, row) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => { setEditRow(row); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteRow(row)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ], []);

    const handleSubmit = async (payload: Record<string, unknown>, isEdit: boolean) => {
        if (isEdit && editRow) {
            await updateEntry(editRow.id, payload);
        } else {
            await createEntry(payload);
        }
        setModalOpen(false);
        setEditRow(null);
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        try {
            await deleteEntry(deleteRow.id);
        } catch (err: any) {
            alert(err.message);
        }
        setDeleteRow(null);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Penyandang Disabilitas"
                description="Data penduduk penyandang disabilitas dan status bantuan sosial"
                actions={
                    <button
                        onClick={() => { setEditRow(null); setModalOpen(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/25"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Data
                    </button>
                }
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard size="sm" label="Total Penyandang" value={stats.total.toLocaleString("id-ID")} icon={Accessibility} gradient="stat-gradient-purple" />
                <StatCard size="sm" label="Laki-laki" value={stats.lakiLaki.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-blue" />
                <StatCard size="sm" label="Perempuan" value={stats.perempuan.toLocaleString("id-ID")} icon={Users} gradient="stat-gradient-emerald" />
                <StatCard size="sm" label="Penerima Bantuan" value={stats.penerimaBantuan.toLocaleString("id-ID")} icon={HandHeart} gradient="stat-gradient-amber" />
            </div>

            {/* Data Table */}
            <DataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="Belum ada data penyandang disabilitas."
            />

            {/* Form Modal */}
            {modalOpen && (
                <DisabilitasFormModal
                    editRow={editRow}
                    masterDisabilitas={masterDisabilitas}
                    masterBantuan={masterBantuan}
                    kelurahans={kelurahans as any}
                    onSearchNIK={searchNIK}
                    onSubmit={handleSubmit}
                    onClose={() => { setModalOpen(false); setEditRow(null); }}
                />
            )}

            {/* Delete Confirm */}
            <DeleteConfirm
                open={!!deleteRow}
                title="Hapus Data Disabilitas"
                message={`Apakah Anda yakin ingin menghapus data "${deleteRow?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
                onConfirm={handleDelete}
                onClose={() => setDeleteRow(null)}
            />
        </div>
    );
}
