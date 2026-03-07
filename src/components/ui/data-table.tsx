"use client";

import { useState, useMemo } from "react";
import {
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    Download,
    Upload,
    Plus,
    Pencil,
    Trash2,
    Eye,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
    key: string;
    label: string;
    sortable?: boolean;
    className?: string;
    render?: (value: unknown, row: T) => React.ReactNode;
};

type DataTableProps<T extends Record<string, unknown>> = {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    onAdd?: () => void;
    onView?: (row: T) => void;
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
    onImport?: () => void;
    onExport?: () => void;
    addLabel?: string;
    pageSize?: number;
    emptyMessage?: string;
};

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    isLoading = false,
    searchable = true,
    searchPlaceholder = "Cari data...",
    onAdd,
    onView,
    onEdit,
    onDelete,
    onImport,
    onExport,
    addLabel = "Tambah Data",
    pageSize = 10,
    emptyMessage = "Belum ada data",
}: DataTableProps<T>) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(0);

    // Filter
    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter((row) =>
            columns.some((col) => {
                const val = row[col.key];
                return val != null && String(val).toLowerCase().includes(q);
            })
        );
    }, [data, search, columns]);

    // Sort
    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        return [...filtered].sort((a, b) => {
            const av = a[sortKey] ?? "";
            const bv = b[sortKey] ?? "";
            const cmp = String(av).localeCompare(String(bv), "id", { numeric: true });
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    // Paginate
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

    function handleSort(key: string) {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    }

    const hasActions = onView || onEdit || onDelete;

    return (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                    {searchable && (
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(0);
                                }}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onImport && (
                        <button
                            onClick={onImport}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Upload className="w-4 h-4" /> Import
                        </button>
                    )}
                    {onExport && (
                        <button
                            onClick={onExport}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Download className="w-4 h-4" /> Export
                        </button>
                    )}
                    {onAdd && (
                        <button
                            onClick={onAdd}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> {addLabel}
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                                No
                            </th>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
                                        col.sortable && "cursor-pointer select-none hover:text-gray-700",
                                        col.className
                                    )}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable && sortKey === col.key && (
                                            sortDir === "asc" ? (
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            )
                                        )}
                                    </div>
                                </th>
                            ))}
                            {hasActions && (
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                                    Aksi
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (hasActions ? 2 : 1)}
                                    className="px-4 py-16 text-center"
                                >
                                    <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Memuat data...</p>
                                </td>
                            </tr>
                        ) : paginated.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (hasActions ? 2 : 1)}
                                    className="px-4 py-16 text-center"
                                >
                                    <p className="text-sm text-gray-400">{emptyMessage}</p>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row, idx) => (
                                <tr
                                    key={(row.id as string) || idx}
                                    className="hover:bg-primary-50/30 transition-colors"
                                >
                                    <td className="px-4 py-3 text-gray-400 text-xs">
                                        {page * pageSize + idx + 1}
                                    </td>
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={cn("px-4 py-3 text-gray-700", col.className)}
                                        >
                                            {col.render
                                                ? col.render(row[col.key], row)
                                                : (row[col.key] as React.ReactNode) ?? "—"}
                                        </td>
                                    ))}
                                    {hasActions && (
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {onView && (
                                                    <button
                                                        onClick={() => onView(row)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {onEdit && (
                                                    <button
                                                        onClick={() => onEdit(row)}
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(row)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {sorted.length > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        Menampilkan {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)}{" "}
                        dari {sorted.length} data
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(0)}
                            disabled={page === 0}
                            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 text-xs font-medium text-gray-600">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(totalPages - 1)}
                            disabled={page >= totalPages - 1}
                            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
