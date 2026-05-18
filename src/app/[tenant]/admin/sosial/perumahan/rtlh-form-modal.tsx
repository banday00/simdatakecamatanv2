"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Save, Search, CheckCircle2, AlertCircle, Home, UserRound } from "lucide-react";
import type { RtlhRow, SearchResult } from "./use-admin-rtlh";

type Props = {
    editRow: RtlhRow | null;
    kelurahans: { id: string; nama: string }[];
    onSearchNIK: (nik: string) => Promise<SearchResult>;
    onSubmit: (payload: Record<string, unknown>, isEdit: boolean) => Promise<void>;
    onClose: () => void;
};

const kategoriOptions = [
    "Bantuan Sosial Tunai",
    "Bantuan Sosial Tidak Terencana",
] as const;

export function RtlhFormModal({ editRow, kelurahans, onSearchNIK, onSubmit, onClose }: Props) {
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<SearchResult>(null);
    const [nikFound, setNikFound] = useState<boolean | null>(null);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    // Form state
    const [form, setForm] = useState({
        penduduk_id: "",
        nik: "",
        nama: "",
        jenis_kelamin: "",
        tanggal_lahir: "",
        tempat_lahir: "",
        no_kk: "",
        alamat: "",
        rt: "",
        rw: "",
        kelurahan_id: "",
        tahun: new Date().getFullYear(),
        kategori: "Bantuan Sosial Tunai" as string,
    });

    useEffect(() => setMounted(true), []);

    // Pre-fill for edit mode
    useEffect(() => {
        if (editRow) {
            setForm({
                penduduk_id: editRow.penduduk_id || "",
                nik: editRow.nik || "",
                nama: editRow.nama || "",
                jenis_kelamin: editRow.jenis_kelamin || "",
                tanggal_lahir: editRow.tanggal_lahir ? editRow.tanggal_lahir.split("T")[0] : "",
                tempat_lahir: "",
                no_kk: editRow.no_kk || "",
                alamat: editRow.alamat || "",
                rt: editRow.rt || "",
                rw: editRow.rw || "",
                kelurahan_id: editRow.kelurahan_id || "",
                tahun: editRow.tahun ?? new Date().getFullYear(),
                kategori: editRow.kategori ?? "Bantuan Sosial Tunai",
            });
            setNikFound(true);
        }
    }, [editRow]);

    const set = (key: string, val: unknown) => setForm(prev => ({ ...prev, [key]: val }));

    // NIK search with debounce
    const handleNIKChange = useCallback((nik: string) => {
        set("nik", nik);
        setNikFound(null);
        setSearchResult(null);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (nik.length === 16) {
            setIsSearching(true);
            searchTimer.current = setTimeout(async () => {
                const result = await onSearchNIK(nik);
                setSearchResult(result);
                setIsSearching(false);
                if (result) {
                    setNikFound(true);
                    setForm(prev => ({
                        ...prev,
                        penduduk_id: result.penduduk_id,
                        nama: result.nama || prev.nama,
                        jenis_kelamin: result.jenis_kelamin || prev.jenis_kelamin,
                        tanggal_lahir: result.tanggal_lahir ? result.tanggal_lahir.split("T")[0] : prev.tanggal_lahir,
                        tempat_lahir: result.tempat_lahir || prev.tempat_lahir,
                        no_kk: result.no_kk || prev.no_kk,
                        alamat: result.alamat || prev.alamat,
                        rt: result.rt || prev.rt,
                        rw: result.rw || prev.rw,
                        kelurahan_id: result.kelurahan_id || prev.kelurahan_id,
                    }));
                } else {
                    setNikFound(false);
                }
            }, 500);
        }
    }, [onSearchNIK]);

    const handleSubmitForm = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit(form, !!editRow);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit = () => {
        if (editRow) return form.tahun && form.kategori;
        return form.nik.length === 16 && form.nama && form.jenis_kelamin && form.kelurahan_id && form.tahun && form.kategori;
    };

    if (typeof document === "undefined" || !mounted) return null;

    const inputCls = "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm";
    const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                {/* Gradient bar */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Home className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{editRow ? "Edit" : "Tambah"} Penerima RTLH</h2>
                            <p className="text-xs text-gray-500">Pendataan warga penerima bantuan RTLH</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">

                    {!editRow && (
                        <>
                            {/* ── Identitas Warga ── */}
                            <div>
                                <div className="border-b border-blue-100 pb-2 mb-4">
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Identitas Warga</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* NIK — search + input */}
                                    <div className="col-span-2">
                                        <label className={labelCls}>NIK <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input value={form.nik} onChange={e => handleNIKChange(e.target.value.replace(/\D/g, "").slice(0, 16))} className={inputCls + " pl-10 font-mono"} placeholder="Masukkan 16 digit NIK" />
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
                                        </div>
                                        {nikFound === true && <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Penduduk ditemukan — data otomatis terisi</p>}
                                        {nikFound === false && <p className="flex items-center gap-1 text-xs text-amber-600 mt-1 font-medium"><AlertCircle className="w-3.5 h-3.5" /> NIK belum terdaftar — lengkapi data di bawah untuk mendaftarkan</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Nama Lengkap <span className="text-red-500">*</span></label>
                                        <input value={form.nama} onChange={e => set("nama", e.target.value)} className={inputCls} placeholder="Nama lengkap sesuai KTP" readOnly={nikFound === true} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Jenis Kelamin <span className="text-red-500">*</span></label>
                                        <select value={form.jenis_kelamin} onChange={e => set("jenis_kelamin", e.target.value)} className={inputCls} disabled={nikFound === true}>
                                            <option value="">Pilih</option>
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Tanggal Lahir</label>
                                        <input type="date" value={form.tanggal_lahir} onChange={e => set("tanggal_lahir", e.target.value)} className={inputCls} readOnly={nikFound === true} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Tempat Lahir</label>
                                        <input value={form.tempat_lahir} onChange={e => set("tempat_lahir", e.target.value)} className={inputCls} placeholder="Kota/Kabupaten" readOnly={nikFound === true} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Data Keluarga ── */}
                            <div>
                                <div className="border-b border-slate-200 pb-2 mb-4">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Data Keluarga</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="col-span-2">
                                        <label className={labelCls}>No. KK</label>
                                        <input value={form.no_kk} onChange={e => set("no_kk", e.target.value.replace(/\D/g, "").slice(0, 16))} className={inputCls + " font-mono"} placeholder="Masukkan 16 digit No. KK" readOnly={nikFound === true} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Kelurahan <span className="text-red-500">*</span></label>
                                        <select value={form.kelurahan_id} onChange={e => set("kelurahan_id", e.target.value)} className={inputCls} disabled={nikFound === true}>
                                            <option value="">Pilih kelurahan</option>
                                            {kelurahans.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>RT</label>
                                            <input value={form.rt} onChange={e => set("rt", e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputCls} placeholder="001" readOnly={nikFound === true} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>RW</label>
                                            <input value={form.rw} onChange={e => set("rw", e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputCls} placeholder="001" readOnly={nikFound === true} />
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-4">
                                        <label className={labelCls}>Alamat</label>
                                        <input value={form.alamat} onChange={e => set("alamat", e.target.value)} className={inputCls} placeholder="Jalan/Kampung/Dusun" readOnly={nikFound === true} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Data Bantuan RTLH ── */}
                    <div>
                        <div className="border-b border-indigo-100 pb-2 mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Data Bantuan RTLH</span>
                        </div>

                        {editRow && (
                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                                    <div><span className="text-gray-400">Nama:</span> <span className="font-semibold text-gray-800">{form.nama}</span></div>
                                    <div><span className="text-gray-400">NIK:</span> <span className="font-mono text-gray-700">{"••••" + form.nik.slice(-4)}</span></div>
                                    <div><span className="text-gray-400">Kelurahan:</span> <span className="font-semibold text-gray-800">{kelurahans.find(k => k.id === form.kelurahan_id)?.nama || "-"}</span></div>
                                    <div><span className="text-gray-400">Alamat:</span> <span className="text-gray-700">{form.alamat || "-"}</span></div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Tahun <span className="text-red-500">*</span></label>
                                <input type="number" min={2000} max={2100} value={form.tahun} onChange={e => set("tahun", Number(e.target.value))} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Kategori <span className="text-red-500">*</span></label>
                                <select value={form.kategori} onChange={e => set("kategori", e.target.value)} className={inputCls}>
                                    {kategoriOptions.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
                    <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
                            Batal
                        </button>
                        <button type="button" onClick={handleSubmitForm} disabled={isSubmitting || !canSubmit()}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {editRow ? "Perbarui Data" : "Simpan Penerima"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
