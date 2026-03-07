"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { exportToPDF, exportToExcel, type ExportColumn } from "@/lib/utils/export";
import { useTenant } from "@/lib/tenant/context";

type ExportButtonProps = {
    data: Record<string, unknown>[];
    columns: ExportColumn[];
    filename: string;
    title: string;
    subtitle?: string;
};

export function ExportButton({ data, columns, filename, title, subtitle }: ExportButtonProps) {
    const { tenant } = useTenant();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const config = {
        title,
        subtitle,
        filename: `${filename}_${new Date().toISOString().slice(0, 10)}`,
        columns,
        data,
        tenantName: tenant?.nama,
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-fade-in">
                    <button
                        onClick={() => { exportToPDF(config); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                        <FileText className="w-4 h-4 text-red-500" />
                        Export PDF
                    </button>
                    <button
                        onClick={() => { exportToExcel(config); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        Export Excel
                    </button>
                </div>
            )}
        </div>
    );
}
