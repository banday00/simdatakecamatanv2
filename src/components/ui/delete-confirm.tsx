"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";

type DeleteConfirmProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title?: string;
    message?: string;
    isDeleting?: boolean;
};

export function DeleteConfirm({
    open,
    onClose,
    onConfirm,
    title = "Hapus Data",
    message = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
    isDeleting = false,
}: DeleteConfirmProps) {
    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Full-page dark backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/75 backdrop-blur-md"
                onClick={!isDeleting ? onClose : undefined}
            />

            {/* Dialog card */}
            <div
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                style={{ animation: "modalSlideIn 0.25s ease-out" }}
            >
                {/* Red accent bar */}
                <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    disabled={isDeleting}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                    aria-label="Tutup"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="px-7 py-7 text-center">
                    {/* Warning icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 to-rose-100 border border-red-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-7">{message}</p>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl transition-all shadow-lg shadow-red-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Menghapus...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Ya, Hapus
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
