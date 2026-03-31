"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormModal, type FieldDef } from "@/components/ui/form-modal";
import { DeleteConfirm } from "@/components/ui/delete-confirm";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import {
    Users, FileText, Heart, GraduationCap, Briefcase, Baby,
    Droplets, Calendar, CreditCard, BookOpen, HeartHandshake,
    Save, X, Loader2
} from "lucide-react";
import { createPortal } from "react-dom";

/* ================================================================
   Types & Constants
================================================================ */
type Row = Record<string, unknown> & { id: string };
type RefOption = { label: string; value: string };
type PeriodeOption = { label: string; value: number };

const TAB_CONFIG = [
    {
        key: "summary", label: "Ringkasan", icon: Users,
        table: "gov_fact_populasi_summary",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            {
                key: "jml_penduduk_total",
                label: "Data Penduduk",
                sortable: true,
                render: (val: unknown, row: Row) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{Number(val ?? 0).toLocaleString("id-ID")} Jiwa</span>
                        <span className="text-xs text-slate-500">L: {Number(row.jml_penduduk_lk ?? 0).toLocaleString("id-ID")} | P: {Number(row.jml_penduduk_pr ?? 0).toLocaleString("id-ID")}</span>
                    </div>
                )
            },
            {
                key: "jml_kk_total",
                label: "Kepala Keluarga",
                sortable: true,
                render: (val: unknown, row: Row) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{Number(val ?? 0).toLocaleString("id-ID")} KK</span>
                        <span className="text-xs text-slate-500">L: {Number(row.jml_kk_lk ?? 0).toLocaleString("id-ID")} | P: {Number(row.jml_kk_pr ?? 0).toLocaleString("id-ID")}</span>
                    </div>
                )
            },
        ],
        fields: [
            { name: "jml_penduduk_lk", label: "Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_penduduk_pr", label: "Perempuan", type: "number" as const, min: 0 },
            { name: "jml_penduduk_total", label: "Total Penduduk", type: "number" as const, min: 0 },
            { name: "jml_kk_lk", label: "KK Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_kk_pr", label: "KK Perempuan", type: "number" as const, min: 0 },
            { name: "jml_kk_total", label: "Total KK", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "kelompok_umur", label: "Kelompok Umur", icon: Calendar,
        table: "gov_fact_populasi_kelompok_umur",
        refTable: "ref_kelompok_umur", refKey: "kelompok_umur_id", refLabel: "rentang_umur",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "ref_label", label: "Kelompok Umur", sortable: true },
            { key: "jml_lk", label: "Laki-laki", sortable: true, fmt: true },
            { key: "jml_pr", label: "Perempuan", sortable: true, fmt: true },
            { key: "total", label: "Total", sortable: true, fmt: true },
        ],
        fields: [
            { name: "jml_lk", label: "Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_pr", label: "Perempuan", type: "number" as const, min: 0 },
            { name: "total", label: "Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "umur_tunggal", label: "Umur Tunggal", icon: Calendar,
        table: "gov_fact_populasi_umur_tunggal",
        extraField: { name: "umur", label: "Umur (tahun)", type: "number" as const, required: true, min: 0 },
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "umur", label: "Umur", sortable: true },
            { key: "jml_lk", label: "Laki-laki", sortable: true, fmt: true },
            { key: "jml_pr", label: "Perempuan", sortable: true, fmt: true },
            { key: "total", label: "Total", sortable: true, fmt: true },
        ],
        fields: [
            { name: "jml_lk", label: "Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_pr", label: "Perempuan", type: "number" as const, min: 0 },
            { name: "total", label: "Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "agama", label: "Agama", icon: HeartHandshake,
        table: "gov_fact_populasi_agama",
        refTable: "ref_agama", refKey: "agama_id", refLabel: "nama_agama",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "ref_label", label: "Agama", sortable: true },
            { key: "jml_lk", label: "Laki-laki", sortable: true, fmt: true },
            { key: "jml_pr", label: "Perempuan", sortable: true, fmt: true },
            { key: "total", label: "Total", sortable: true, fmt: true },
        ],
        fields: [
            { name: "jml_lk", label: "Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_pr", label: "Perempuan", type: "number" as const, min: 0 },
            { name: "total", label: "Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "pendidikan", label: "Pendidikan", icon: GraduationCap,
        table: "gov_fact_populasi_pendidikan",
        refTable: "ref_pendidikan", refKey: "pendidikan_id", refLabel: "jenjang_pendidikan",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "ref_label", label: "Pendidikan", sortable: true },
            { key: "jml_lk", label: "Laki-laki", sortable: true, fmt: true },
            { key: "jml_pr", label: "Perempuan", sortable: true, fmt: true },
            { key: "total", label: "Total", sortable: true, fmt: true },
        ],
        fields: [
            { name: "jml_lk", label: "Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_pr", label: "Perempuan", type: "number" as const, min: 0 },
            { name: "total", label: "Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "pekerjaan", label: "Pekerjaan", icon: Briefcase,
        table: "gov_fact_populasi_pekerjaan",
        refTable: "ref_pekerjaan", refKey: "pekerjaan_id", refLabel: "jenis_pekerjaan",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "ref_label", label: "Pekerjaan", sortable: true },
            { key: "jml_lk", label: "Laki-laki", sortable: true, fmt: true },
            { key: "jml_pr", label: "Perempuan", sortable: true, fmt: true },
            { key: "total", label: "Total", sortable: true, fmt: true },
        ],
        fields: [
            { name: "jml_lk", label: "Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_pr", label: "Perempuan", type: "number" as const, min: 0 },
            { name: "total", label: "Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "status_kawin", label: "Status Kawin", icon: Heart,
        table: "gov_fact_populasi_status_kawin",
        refTable: "ref_status_kawin", refKey: "status_kawin_id", refLabel: "status",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "ref_label", label: "Status Kawin", sortable: true },
            { key: "jml_lk", label: "Laki-laki", sortable: true, fmt: true },
            { key: "jml_pr", label: "Perempuan", sortable: true, fmt: true },
            { key: "total", label: "Total", sortable: true, fmt: true },
        ],
        fields: [
            { name: "jml_lk", label: "Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_pr", label: "Perempuan", type: "number" as const, min: 0 },
            { name: "total", label: "Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "golongan_darah", label: "Gol. Darah", icon: Droplets,
        table: "gov_fact_populasi_golongan_darah",
        refTable: "ref_golongan_darah", refKey: "goldar_id", refLabel: "nama_goldar",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "ref_label", label: "Golongan Darah", sortable: true },
            { key: "jml_lk", label: "Laki-laki", sortable: true, fmt: true },
            { key: "jml_pr", label: "Perempuan", sortable: true, fmt: true },
            { key: "total", label: "Total", sortable: true, fmt: true },
        ],
        fields: [
            { name: "jml_lk", label: "Laki-laki", type: "number" as const, min: 0 },
            { name: "jml_pr", label: "Perempuan", type: "number" as const, min: 0 },
            { name: "total", label: "Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "ktp", label: "Dokumen KTP", icon: CreditCard,
        table: "gov_fact_dokumen_ktp",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "wajib_ktp_total", label: "Wajib KTP", sortable: true, fmt: true },
            { key: "punya_ktp_total", label: "Punya KTP", sortable: true, fmt: true },
        ],
        fields: [
            { name: "wajib_ktp_lk", label: "Wajib KTP Laki-laki", type: "number" as const, min: 0 },
            { name: "wajib_ktp_pr", label: "Wajib KTP Perempuan", type: "number" as const, min: 0 },
            { name: "wajib_ktp_total", label: "Wajib KTP Total", type: "number" as const, min: 0 },
            { name: "punya_ktp_lk", label: "Punya KTP Laki-laki", type: "number" as const, min: 0 },
            { name: "punya_ktp_pr", label: "Punya KTP Perempuan", type: "number" as const, min: 0 },
            { name: "punya_ktp_total", label: "Punya KTP Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "kia", label: "Dokumen KIA", icon: Baby,
        table: "gov_fact_dokumen_kia",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "wajib_kia_total", label: "Wajib KIA", sortable: true, fmt: true },
            { key: "punya_kia_total", label: "Punya KIA", sortable: true, fmt: true },
        ],
        fields: [
            { name: "wajib_kia_lk", label: "Wajib KIA Laki-laki", type: "number" as const, min: 0 },
            { name: "wajib_kia_pr", label: "Wajib KIA Perempuan", type: "number" as const, min: 0 },
            { name: "wajib_kia_total", label: "Wajib KIA Total", type: "number" as const, min: 0 },
            { name: "punya_kia_lk", label: "Punya KIA Laki-laki", type: "number" as const, min: 0 },
            { name: "punya_kia_pr", label: "Punya KIA Perempuan", type: "number" as const, min: 0 },
            { name: "punya_kia_total", label: "Punya KIA Total", type: "number" as const, min: 0 },
        ],
    },
    {
        key: "akta", label: "Akta Lahir", icon: FileText,
        table: "gov_fact_dokumen_akta_lahir",
        columns: [
            { key: "periode_label", label: "Periode", sortable: true },
            { key: "kelurahan_nama", label: "Kelurahan", sortable: true },
            { key: "penduduk_0_18_total", label: "Penduduk 0-18", sortable: true, fmt: true },
            { key: "punya_akta_total", label: "Punya Akta", sortable: true, fmt: true },
        ],
        fields: [
            { name: "penduduk_0_18_lk", label: "Penduduk 0-18 LK", type: "number" as const, min: 0 },
            { name: "penduduk_0_18_pr", label: "Penduduk 0-18 PR", type: "number" as const, min: 0 },
            { name: "penduduk_0_18_total", label: "Penduduk 0-18 Total", type: "number" as const, min: 0 },
            { name: "punya_akta_lk", label: "Punya Akta LK", type: "number" as const, min: 0 },
            { name: "punya_akta_pr", label: "Punya Akta PR", type: "number" as const, min: 0 },
            { name: "punya_akta_total", label: "Punya Akta Total", type: "number" as const, min: 0 },
        ],
    },
];

/* ================================================================
   Custom Form Modal for Kependudukan
================================================================ */

function KependudukanFormModal({
    open, onClose, onSubmit, editRow, isSubmitting, title, fields, initialData, icon: Icon
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    editRow: Row | null;
    isSubmitting: boolean;
    title: string;
    fields: FieldDef[];
    initialData?: Record<string, unknown>;
    icon: React.ElementType;
}) {
    const isEdit = !!editRow;
    const [form, setForm] = useState<Record<string, unknown>>({});

    // Track latest values via refs so the init effect only runs when 'open' toggles,
    // not on every render when parent re-creates fields/initialData arrays.
    const fieldsRef = useRef(fields);
    const initialDataRef = useRef(initialData);
    fieldsRef.current = fields;
    initialDataRef.current = initialData;

    const prevOpenRef = useRef(false);
    useEffect(() => {
        if (!open) {
            prevOpenRef.current = false;
            return;
        }
        if (prevOpenRef.current) return; // Already initialized for this open session
        prevOpenRef.current = true;

        const defaultForm: Record<string, unknown> = { ...initialDataRef.current };
        fieldsRef.current.forEach(f => {
            if (defaultForm[f.name] === undefined) {
                defaultForm[f.name] = "";
            }
        });
        setForm(defaultForm);
    }, [open]);

    function setVal(field: string, value: unknown) {
        setForm(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calculate total = lk + pr
            if (field === 'jml_lk' || field === 'jml_pr') {
                const lk = Number(field === 'jml_lk' ? value : updated.jml_lk) || 0;
                const pr = Number(field === 'jml_pr' ? value : updated.jml_pr) || 0;
                updated.total = lk + pr;
            } else if (field.endsWith('_lk')) {
                const base = field.slice(0, -3);
                const totalField = base + '_total';
                const lk = Number(value) || 0;
                const pr = Number(updated[base + '_pr']) || 0;
                updated[totalField] = lk + pr;
            } else if (field.endsWith('_pr')) {
                const base = field.slice(0, -3);
                const totalField = base + '_total';
                const pr = Number(value) || 0;
                const lk = Number(updated[base + '_lk']) || 0;
                updated[totalField] = lk + pr;
            }

            return updated;
        });
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit(form);
    }

    if (!open) return null;

    // Split fields logically: context fields (select/text) vs values (numbers)
    const contextFields = fields.filter(f => f.type === "select" || f.type === "text" || !["jml_lk", "jml_pr", "total", "jml_penduduk_lk", "jml_penduduk_pr", "jml_penduduk_total", "jml_kk_lk", "jml_kk_pr", "jml_kk_total", "wajib_ktp_lk", "wajib_ktp_pr", "wajib_ktp_total", "punya_ktp_lk", "punya_ktp_pr", "punya_ktp_total", "wajib_kia_lk", "wajib_kia_pr", "wajib_kia_total", "punya_kia_lk", "punya_kia_pr", "punya_kia_total", "penduduk_0_18_lk", "penduduk_0_18_pr", "penduduk_0_18_total", "punya_akta_lk", "punya_akta_pr", "punya_akta_total", "umur"].includes(f.name));

    // Explicitly place umur in the context side if it exists
    const umurField = fields.find(f => f.name === "umur");
    if (umurField && !contextFields.includes(umurField)) {
        contextFields.push(umurField);
    }

    const valueFields = fields.filter(f => !contextFields.includes(f));

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />

            <div
                className="relative w-full max-w-4xl mx-4 my-8 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ animation: "modalSlideIn 0.3s ease-out" }}
            >
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shrink-0" />

                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600">
                            <Icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEdit ? "Edit" : "Tambah"} {title}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Lengkapi formulir data kependudukan di bawah ini.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col overflow-hidden">
                    <div className="px-8 py-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Left Column: Context */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 pb-2 mb-4 border-b border-gray-100">
                                    <BookOpen className="w-5 h-5 text-indigo-500" />
                                    <h3 className="font-semibold text-gray-800 text-sm tracking-wide">Konteks Data</h3>
                                </div>
                                {contextFields.map(f => (
                                    <div key={f.name} className="flex flex-col space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">
                                            {f.label} {f.required && <span className="text-red-500">*</span>}
                                        </label>
                                        {f.type === "select" ? (
                                            <select
                                                value={String(form[f.name] ?? "")}
                                                onChange={(e) => setVal(f.name, e.target.value)}
                                                required={f.required}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                                disabled={f.name === "kelurahan_id" && contextFields.find(cf => cf.name === "kelurahan_id")?.options?.length === 1}
                                            >
                                                <option value="">— Pilih {f.label} —</option>
                                                {f.options?.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={f.type === "number" ? "number" : "text"}
                                                value={String(form[f.name] ?? "")}
                                                onChange={(e) => setVal(f.name, f.type === "number" ? Number(e.target.value) : e.target.value)}
                                                required={f.required}
                                                min={f.min}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Right Column: Values */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 pb-2 mb-4 border-b border-gray-100">
                                    <Users className="w-5 h-5 text-purple-500" />
                                    <h3 className="font-semibold text-gray-800 text-sm tracking-wide">Nilai Penduduk</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {valueFields.map(f => {
                                        const isTotal = f.name === 'total' || f.name.endsWith('_total');
                                        return (
                                            <div key={f.name} className={`flex flex-col space-y-1.5 ${isTotal ? 'col-span-2' : 'col-span-1'}`}>
                                                <label className={`text-sm font-medium flex items-center gap-1.5 ${isTotal ? 'text-indigo-600' : 'text-gray-700'}`}>
                                                    {f.label}
                                                    {isTotal && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded">Otomatis</span>}
                                                </label>
                                                {isTotal ? (
                                                    <div className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 tabular-nums">
                                                        {Number(form[f.name] ?? 0).toLocaleString('id-ID')}
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={String(form[f.name] ?? '')}
                                                        onChange={(e) => setVal(f.name, Number(e.target.value))}
                                                        required={f.required}
                                                        min={f.min ?? 0}
                                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="flex items-center justify-between px-8 py-4 border-t border-gray-100 shrink-0 bg-gray-50/80">
                        <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Simpan Data
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}


/* ================================================================
   Generic Tab Panel Component
================================================================ */
function TabPanel({
    config,
    kelurahans,
    periodes,
    refOptions,
}: {
    config: (typeof TAB_CONFIG)[number];
    kelurahans: { id: string; nama: string }[];
    periodes: PeriodeOption[];
    refOptions: RefOption[];
}) {
    const { tenant } = useTenant();
    const { profile } = useAuth();
    const [db] = useState(() => createClient().schema("sidakota"));

    const isKelAdmin = profile?.role === "admin_kelurahan" && !!profile?.kelurahan_id;
    const kelId = isKelAdmin ? (profile?.kelurahan_id ?? null) : null;

    const [data, setData] = useState<Row[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState<Row | null>(null);
    const [deleteRow, setDeleteRow] = useState<Row | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!tenant?.id) return;
        setIsLoading(true);
        try {
            let query = db
                .from(config.table)
                .select("*")
                .eq("tenant_id", tenant.id)
                .order("created_at", { ascending: false });
            // Auto-filter for admin_kelurahan
            if (kelId) query = query.eq("kelurahan_id", kelId);
            const { data: rows, error } = await query;
            if (error) console.error(`[Kependudukan] fetchData (${config.table}):`, error);
            setData((rows as Row[]) || []);
        } catch (err) {
            console.error(`[Kependudukan] fetchData unexpected error:`, err);
        } finally {
            setIsLoading(false);
        }
    }, [tenant?.id, config.table, kelId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Build kelurahan & periode lookup maps
    const kelMap = new Map(kelurahans.map((k) => [k.id, k.nama]));
    const perMap = new Map(periodes.map((p) => [p.value, p.label]));
    const refMap = new Map(refOptions.map((r) => [r.value, r.label]));

    // Enrich data
    const enrichedData = data.map((row) => ({
        ...row,
        kelurahan_nama: kelMap.get(row.kelurahan_id as string) || "—",
        periode_label: perMap.get(row.periode_id as number) || String(row.periode_id ?? "—"),
        ref_label: config.refKey ? (refMap.get(String(row[config.refKey])) || String(row[config.refKey] ?? "—")) : undefined,
    }));

    // Build table columns with custom logic preferring c.render
    const tableColumns: Column<Row>[] = config.columns.map((c: any) => ({
        key: c.key,
        label: c.label,
        sortable: c.sortable,
        // If config explicitly provides a render (like Ringkasan grouped data), use it.
        // Otherwise, fallback to the default number formatter if c.fmt is true.
        render: c.render || (c.fmt
            ? (val: unknown) => <span className="font-medium tabular-nums">{Number(val ?? 0).toLocaleString("id-ID")}</span>
            : undefined),
    }));

    // Restrict kelurahan options for admin_kelurahan
    const kelurahanOpts = isKelAdmin
        ? kelurahans.filter((k) => k.id === kelId).map((k) => ({ label: k.nama, value: k.id }))
        : kelurahans.map((k) => ({ label: k.nama, value: k.id }));

    // Build form fields
    const formFields: FieldDef[] = [
        {
            name: "kelurahan_id", label: "Kelurahan", type: "select", required: true,
            options: kelurahanOpts,
        },
        {
            name: "periode_id", label: "Periode", type: "select", required: true,
            options: periodes.map((p) => ({ label: p.label, value: String(p.value) })),
        },
        ...(config.refKey && config.refLabel
            ? [{
                name: config.refKey, label: config.refLabel.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
                type: "select" as const, required: true,
                options: refOptions,
            }]
            : []),
        ...(config.extraField ? [config.extraField] : []),
        ...config.fields,
    ];

    async function handleSubmit(formData: Record<string, unknown>) {
        if (!tenant?.id) return;
        setIsSubmitting(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload: any = { ...formData, tenant_id: tenant.id };
            if (payload.periode_id) payload.periode_id = Number(payload.periode_id);
            if (config.refKey && payload[config.refKey]) {
                payload[config.refKey] = Number(payload[config.refKey]);
            }
            // Always enforce kelurahan_id for admin_kelurahan, override any form value
            if (kelId) payload.kelurahan_id = kelId;

            // Strip generated/computed columns — DB calculates these automatically
            Object.keys(payload).forEach(key => {
                if (key === 'total' || key.endsWith('_total')) {
                    delete payload[key];
                }
            });

            if (editRow) {
                // On update: exclude tenant_id from payload (RLS already enforces it)
                // and add .eq('tenant_id') guard for safety
                const { tenant_id: _tid, ...updatePayload } = payload;
                const { error } = await db
                    .from(config.table)
                    .update(updatePayload)
                    .eq("id", editRow.id)
                    .eq("tenant_id", tenant.id);
                if (error) throw error;
            } else {
                const { error } = await db.from(config.table).insert(payload);
                if (error) throw error;
            }
            setModalOpen(false);
            setEditRow(null);
            await fetchData();
        } catch (err: any) {
            console.error("[Kependudukan] handleSubmit error:", err);
            alert(`Gagal menyimpan data: ${err?.message || 'Silakan coba lagi.'}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!deleteRow || !tenant?.id) return;
        setIsSubmitting(true);
        try {
            const { error } = await db
                .from(config.table)
                .delete()
                .eq("id", deleteRow.id)
                .eq("tenant_id", tenant.id); // Guard: only delete own tenant's record
            if (error) throw error;
            setDeleteRow(null);
            await fetchData();
        } catch (err: any) {
            console.error("[Kependudukan] handleDelete error:", err);
            alert(`Gagal menghapus data: ${err?.message || 'Silakan coba lagi.'}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-4">
            <DataTable
                columns={tableColumns}
                data={enrichedData as Row[]}
                isLoading={isLoading}
                onAdd={() => { setEditRow(null); setModalOpen(true); }}
                onEdit={(row) => { setEditRow(row); setModalOpen(true); }}
                onDelete={(row) => setDeleteRow(row)}
                addLabel="Tambah Data"
                searchPlaceholder="Cari data..."
            />

            <KependudukanFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditRow(null); }}
                onSubmit={handleSubmit}
                editRow={editRow}
                title={config.label}
                icon={config.icon}
                fields={formFields}
                initialData={editRow ? {
                    ...editRow,
                    periode_id: String(editRow.periode_id ?? ""),
                    ...(config.refKey ? { [config.refKey]: String(editRow[config.refKey] ?? "") } : {}),
                } : (isKelAdmin && kelId ? { kelurahan_id: kelId } : undefined)}
                isSubmitting={isSubmitting}
            />

            <DeleteConfirm
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                title={`Hapus ${config.label}`}
                message="Apakah Anda yakin ingin menghapus data ini?"
                isDeleting={isSubmitting}
            />
        </div>
    );
}

/* ================================================================
   Main Page
================================================================ */
export default function KependudukanPage() {
    const { tenant, kelurahans } = useTenant();
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get("tab") || TAB_CONFIG[0].key;
    const [activeTab, setActiveTab] = useState(tabFromUrl);
    const [periodes, setPeriodes] = useState<PeriodeOption[]>([]);
    const [refData, setRefData] = useState<Record<string, RefOption[]>>({});

    // Sync active tab when URL query changes (e.g. sidebar navigation)
    useEffect(() => {
        const validTab = TAB_CONFIG.find(t => t.key === tabFromUrl) ? tabFromUrl : TAB_CONFIG[0].key;
        setActiveTab(validTab);
    }, [tabFromUrl]);

    const [db] = useState(() => createClient().schema("sidakota"));

    // Load periodes & all ref tables on mount
    useEffect(() => {
        if (!tenant?.id) return;

        async function loadRefs() {
            // Periodes
            const { data: per } = await db.from("gov_ref_periode").select("*").order("tahun", { ascending: false });
            setPeriodes(
                (per || []).map((p: Record<string, unknown>) => ({
                    label: `Semester ${p.semester} Tahun ${p.tahun}`,
                    value: Number(p.id),
                }))
            );

            // Load all ref tables needed
            const refTables = [
                { table: "ref_agama", key: "agama_id", label: "nama_agama" },
                { table: "ref_golongan_darah", key: "goldar_id", label: "nama_goldar" },
                { table: "ref_kelompok_umur", key: "kelompok_umur_id", label: "rentang_umur" },
                { table: "ref_pekerjaan", key: "pekerjaan_id", label: "jenis_pekerjaan" },
                { table: "ref_pendidikan", key: "pendidikan_id", label: "jenjang_pendidikan" },
                { table: "ref_status_kawin", key: "status_kawin_id", label: "status" },
            ];

            const results: Record<string, RefOption[]> = {};
            await Promise.all(
                refTables.map(async (rt) => {
                    const { data: rows } = await db.from(rt.table).select("*").order("id");
                    results[rt.key] = (rows || []).map((r: Record<string, unknown>) => ({
                        label: String(r[rt.label] ?? ""),
                        value: String(r.id),
                    }));
                })
            );
            setRefData(results);
        }

        loadRefs();
    }, [tenant?.id, db]);

    const activeConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;

    return (
        <div className="animate-fade-in space-y-6 pb-12">
            <PageHeader
                title="Data Kependudukan"
                description="Manajemen rekapitulasi data kependudukan per kelurahan dan periode"
                breadcrumbs={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Kependudukan" },
                ]}
            />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Vertical Sidebar Navigation */}
                <div className="w-full lg:w-64 shrink-0 space-y-1">
                    <h3 className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori Data</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-sm flex flex-col gap-1">
                        {TAB_CONFIG.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all w-full text-left",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-w-0">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                {(() => {
                                    const Icon = activeConfig.icon;
                                    return <Icon className="w-5 h-5" />;
                                })()}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{activeConfig.label}</h2>
                                <p className="text-sm text-slate-500">
                                    Kelola data {activeConfig.label.toLowerCase()} secara terperinci.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <TabPanel
                            key={activeTab}
                            config={activeConfig}
                            kelurahans={kelurahans}
                            periodes={periodes}
                            refOptions={activeConfig.refKey ? (refData[activeConfig.refKey] || []) : []}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
