"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* ─── Types ──────────────────────────────────────────────────── */
export type ExportColumn = {
    key: string;
    label: string;
    format?: (val: unknown) => string;
};

export type ExportConfig = {
    title: string;
    subtitle?: string;
    filename: string;
    columns: ExportColumn[];
    data: Record<string, unknown>[];
    tenantName?: string;
};

/* ─── PDF Export ──────────────────────────────────────────────── */
export function exportToPDF(config: ExportConfig) {
    const { title, subtitle, filename, columns, data, tenantName } = config;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();

    // Header gradient bar
    doc.setFillColor(30, 64, 175); // primary-800
    doc.rect(0, 0, pageW, 22, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 10);

    // Subtitle
    if (subtitle || tenantName) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(191, 219, 254); // blue-200
        doc.text(subtitle || tenantName || "", 14, 16);
    }

    // Date
    doc.setFontSize(8);
    doc.setTextColor(191, 219, 254);
    const dateStr = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    doc.text(`Dicetak: ${dateStr}`, pageW - 14, 10, { align: "right" });

    // Data count
    doc.text(`Total data: ${data.length}`, pageW - 14, 16, { align: "right" });

    // Table
    const headers = columns.map((c) => c.label);
    const rows = data.map((row) =>
        columns.map((col) => {
            const val = row[col.key];
            if (col.format) return col.format(val);
            if (val == null) return "—";
            return String(val);
        })
    );

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        theme: "grid",
        headStyles: {
            fillColor: [37, 99, 235], // blue-600
            textColor: 255,
            fontSize: 8,
            fontStyle: "bold",
            halign: "center",
            cellPadding: 3,
        },
        bodyStyles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            textColor: [51, 65, 85], // slate-700
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252], // slate-50
        },
        styles: {
            lineColor: [226, 232, 240], // slate-200
            lineWidth: 0.3,
            overflow: "linebreak",
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (hookData) => {
            // Footer
            const pageH = doc.internal.pageSize.getHeight();
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `SIMDATA Kecamatan — ${tenantName || ""}`,
                14,
                pageH - 6
            );
            doc.text(
                `Halaman ${hookData.pageNumber}`,
                pageW - 14,
                pageH - 6,
                { align: "right" }
            );
        },
    });

    doc.save(`${filename}.pdf`);
}

/* ─── Excel Export ────────────────────────────────────────────── */
export function exportToExcel(config: ExportConfig) {
    const { title, filename, columns, data, tenantName } = config;

    // Header row
    const headers = columns.map((c) => c.label);

    // Data rows
    const rows = data.map((row) =>
        columns.map((col) => {
            const val = row[col.key];
            if (col.format) return col.format(val);
            if (val == null) return "";
            return val;
        })
    );

    // Build worksheet
    const wsData = [
        [title],
        [tenantName || ""],
        [`Dicetak: ${new Date().toLocaleDateString("id-ID")}`],
        [],
        headers,
        ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = columns.map((col) => ({
        wch: Math.max(col.label.length + 2, 15),
    }));

    // Merge title row
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: columns.length - 1 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
