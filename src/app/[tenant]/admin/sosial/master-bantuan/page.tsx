"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/lib/tenant/context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { HandHeart, X, Loader2, Save, Plus, Pencil, Trash2 } from "lucide-react";

type MasterRow = {
    id: string;
    nama_bantuan: string;
    keterangan: string | null;
    created_at: string;
};

const columns: Column<MasterRow>[] = [
    {
        key: "nama_bantuan", label: "Jenis Bantuan", sortable: true,
        render: (v) => (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <HandHeart className="w-3 h-3" />
                {String(v)}
            </span>
        ),
    },
    {
        key: "keterangan", label: "Keterangan", sortable: false,
        render: (v) => <span className="text-slate-500 text-sm">{String(v || "-")}</span>,
    },
];

export default function MasterBantuanPage() {
    const { tenant } = useTenant();
    const [data, setData] = useState<MasterRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<MasterRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<MasterRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const apiBase = `/api/tenants/${tenant?.slug}/admin/sosial/master-bantuan`;

    const fetchData = useCallback(async () => {
        if (!tenant?.slug) return;
        try {
            setIsLoading(true);
            const res = await fetch(apiBase, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal memuat data.");
            setData(json.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.slug, apiBase]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);
            const payload = {
                nama_bantuan: formData.get("nama_bantuan") as string,
                keterangan: formData.get("keterangan") as string || null,
            };

            const url = editRow ? `${apiBase}/${editRow.id}` : apiBase;
            const method = editRow ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal menyimpan data.");

            setModalOpen(false);
            setEditRow(null);
            await fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        try {
            const res = await fetch(`${apiBase}/${deleteRow.id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error?.message || "Gagal menghapus data.");
            setDeleteRow(null);
            await fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const actionColumn: Column<MasterRow> = {
        key: "id" as keyof MasterRow,
        label: "Aksi",
        render: (_v, row) => (
            <div className="flex items-center gap-1">
                <button
                    onClick={() => { setEditRow(row); setModalOpen(true); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setDeleteRow(row)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        ),
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Master Jenis Bantuan"
                description="Kelola data referensi jenis-jenis bantuan sosial"
                actions={
                    <button
                        onClick={() => { setEditRow(null); setModalOpen(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-lg shadow-emerald-600/25"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Jenis
                    </button>
                }
            />

            <DataTable
                data={data}
                columns={[...columns, actionColumn]}
                isLoading={isLoading}
                emptyMessage="Belum ada data jenis bantuan."
            />

            {/* Form Modal */}
            {modalOpen && <FormModal
                editRow={editRow}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
            />}

            {/* Delete Confirm */}
            <DeleteConfirm
                open={!!deleteRow}
                title="Hapus Jenis Bantuan"
                message={`Apakah Anda yakin ingin menghapus "${deleteRow?.nama_bantuan}"? Data yang terhubung akan terpengaruh.`}
                onConfirm={handleDelete}
                onClose={() => setDeleteRow(null)}
            />
        </div>
    );
}

function FormModal({
    editRow,
    isSubmitting,
    onSubmit,
    onClose,
}: {
    editRow: MasterRow | null;
    isSubmitting: boolean;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onClose: () => void;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (typeof document === "undefined" || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shrink-0" />

                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600">
                            <HandHeart className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{editRow ? "Edit" : "Tambah"} Jenis Bantuan</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Data referensi jenis bantuan sosial</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 custom-scrollbar">
                    <form id="master-form" onSubmit={onSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Nama Jenis Bantuan <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="nama_bantuan"
                                defaultValue={editRow?.nama_bantuan || ""}
                                required
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                placeholder="contoh: PKH, BPNT, PBI JK"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Keterangan</label>
                            <textarea
                                name="keterangan"
                                defaultValue={editRow?.keterangan || ""}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm resize-none"
                                placeholder="Keterangan tambahan (opsional)"
                            />
                        </div>
                    </form>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
                    <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
                            Batal
                        </button>
                        <button
                            type="submit"
                            form="master-form"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
