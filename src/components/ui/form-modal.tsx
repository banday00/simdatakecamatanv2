"use client";

import { useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FieldDef = {
    name: string;
    label: string;
    type: "text" | "number" | "email" | "textarea" | "select" | "date" | "year" | "file";
    required?: boolean;
    placeholder?: string;
    options?: { label: string; value: string }[];
    className?: string;
    min?: number;
    max?: number;
    step?: number;
};

type FormModalProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    title: string;
    fields: FieldDef[];
    initialData?: Record<string, unknown>;
    isSubmitting?: boolean;
    submitLabel?: string;
    size?: "sm" | "md" | "lg";
};

export function FormModal({
    open,
    onClose,
    onSubmit,
    title,
    fields,
    initialData,
    isSubmitting = false,
    submitLabel,
    size = "md",
}: FormModalProps) {
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    const isEdit = !!initialData;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const form = formRef.current;
        if (!form) return;

        const fd = new FormData(form);
        const data: Record<string, unknown> = {};

        fields.forEach((field) => {
            const val = fd.get(field.name);
            if (field.type === "number") {
                data[field.name] = val ? Number(val) : null;
            } else if (field.type === "file") {
                data[field.name] = fd.get(field.name) as File | null;
            } else {
                data[field.name] = val || null;
            }
        });

        await onSubmit(data);
    }

    const sizeClass = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
    }[size];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={cn(
                    "relative w-full bg-white rounded-2xl shadow-2xl animate-fade-in",
                    sizeClass
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form ref={formRef} onSubmit={handleSubmit}>
                    <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        {fields.map((field) => (
                            <div key={field.name} className={field.className}>
                                <label
                                    htmlFor={field.name}
                                    className="block text-sm font-medium text-gray-700 mb-1.5"
                                >
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                </label>

                                {field.type === "textarea" ? (
                                    <textarea
                                        id={field.name}
                                        name={field.name}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        defaultValue={(initialData?.[field.name] as string) ?? ""}
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
                                    />
                                ) : field.type === "select" ? (
                                    <select
                                        id={field.name}
                                        name={field.name}
                                        required={field.required}
                                        defaultValue={(initialData?.[field.name] as string) ?? ""}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
                                    >
                                        <option value="">— Pilih —</option>
                                        {field.options?.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : field.type === "year" ? (
                                    <input
                                        id={field.name}
                                        name={field.name}
                                        type="number"
                                        required={field.required}
                                        placeholder={field.placeholder || "2025"}
                                        defaultValue={(initialData?.[field.name] as number) ?? new Date().getFullYear()}
                                        min={2000}
                                        max={2099}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    />
                                ) : (
                                    <input
                                        id={field.name}
                                        name={field.name}
                                        type={field.type}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        defaultValue={(initialData?.[field.name] as string | number) ?? ""}
                                        min={field.min}
                                        max={field.max}
                                        step={field.step}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {submitLabel || (isEdit ? "Simpan Perubahan" : "Tambah")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
