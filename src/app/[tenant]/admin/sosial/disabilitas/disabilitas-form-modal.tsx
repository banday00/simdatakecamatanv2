"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Save, Search, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Accessibility, HandHeart, User } from "lucide-react";
import type { DisabilitasRow, MasterDisabilitas, MasterBantuan, SearchResult } from "./use-admin-disabilitas";

type Props = {
    editRow: DisabilitasRow | null;
    masterDisabilitas: MasterDisabilitas[];
    masterBantuan: MasterBantuan[];
    kelurahans: { id: string; nama: string }[];
    onSearchNIK: (nik: string) => Promise<SearchResult>;
    onSubmit: (payload: Record<string, unknown>, isEdit: boolean) => Promise<void>;
    onClose: () => void;
};

const STEPS = ["Identitas Penduduk", "Klasifikasi Disabilitas", "Bantuan & Ringkasan"];

export function DisabilitasFormModal({ editRow, masterDisabilitas, masterBantuan, kelurahans, onSearchNIK, onSubmit, onClose }: Props) {
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState(0);
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
        disabilitas_id: "",
        keterangan_disabilitas: "",
        bantuan_ids: [] as string[],
        bantuan_keterangan: {} as Record<string, string>,
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
                disabilitas_id: editRow.disabilitas_id || "",
                keterangan_disabilitas: editRow.keterangan_disabilitas || "",
                bantuan_ids: (editRow.bantuan_list || []).map(b => b.bantuan_id),
                bantuan_keterangan: Object.fromEntries((editRow.bantuan_list || []).filter(b => b.keterangan).map(b => [b.bantuan_id, b.keterangan!])),
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

    const toggleBantuan = (id: string) => {
        setForm(prev => {
            const ids = prev.bantuan_ids.includes(id) ? prev.bantuan_ids.filter(x => x !== id) : [...prev.bantuan_ids, id];
            return { ...prev, bantuan_ids: ids };
        });
    };

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

    const canGoNext = () => {
        if (step === 0) return form.nik.length === 16 && form.nama && form.jenis_kelamin && form.kelurahan_id;
        if (step === 1) return !!form.disabilitas_id;
        return true;
    };

    if (typeof document === "undefined" || !mounted) return null;

    const inputCls = "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm";
    const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                {/* Gradient bar */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600">
                            <Accessibility className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{editRow ? "Edit" : "Registrasi"} Penduduk Disabilitas</h2>
                            <p className="text-xs text-gray-500">Langkah {step + 1} dari {STEPS.length}: {STEPS[step]}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                {/* Step indicator */}
                <div className="flex gap-1 px-6 pt-3">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-blue-600" : "bg-gray-200"}`} />
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {step === 0 && (
                        <div className="space-y-4">
                            {/* NIK Search */}
                            <div>
                                <label className={labelCls}>NIK <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input value={form.nik} onChange={e => handleNIKChange(e.target.value.replace(/\D/g, "").slice(0, 16))} className={inputCls + " pl-10"} placeholder="Masukkan 16 digit NIK" disabled={!!editRow} />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                                </div>
                                {nikFound === true && <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Penduduk terdaftar — data otomatis terisi</p>}
                                {nikFound === false && <p className="flex items-center gap-1 text-xs text-amber-600 mt-1 font-medium"><AlertCircle className="w-3.5 h-3.5" /> NIK belum terdaftar — silakan isi data manual</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Nama Lengkap <span className="text-red-500">*</span></label>
                                    <input value={form.nama} onChange={e => set("nama", e.target.value)} className={inputCls} placeholder="Nama lengkap" />
                                </div>
                                <div>
                                    <label className={labelCls}>Jenis Kelamin <span className="text-red-500">*</span></label>
                                    <select value={form.jenis_kelamin} onChange={e => set("jenis_kelamin", e.target.value)} className={inputCls}>
                                        <option value="">Pilih</option>
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Tanggal Lahir</label>
                                    <input type="date" value={form.tanggal_lahir} onChange={e => set("tanggal_lahir", e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Tempat Lahir</label>
                                    <input value={form.tempat_lahir} onChange={e => set("tempat_lahir", e.target.value)} className={inputCls} placeholder="Kota/Kabupaten" />
                                </div>
                            </div>

                            <hr className="border-gray-100" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data Keluarga</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>No. KK</label>
                                    <input value={form.no_kk} onChange={e => set("no_kk", e.target.value.replace(/\D/g, "").slice(0, 16))} className={inputCls} placeholder="16 digit No. KK" />
                                </div>
                                <div>
                                    <label className={labelCls}>Kelurahan <span className="text-red-500">*</span></label>
                                    <select value={form.kelurahan_id} onChange={e => set("kelurahan_id", e.target.value)} className={inputCls}>
                                        <option value="">Pilih kelurahan</option>
                                        {kelurahans.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Alamat</label>
                                    <input value={form.alamat} onChange={e => set("alamat", e.target.value)} className={inputCls} placeholder="Jalan/Kampung/Dusun" />
                                </div>
                                <div>
                                    <label className={labelCls}>RT</label>
                                    <input value={form.rt} onChange={e => set("rt", e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputCls} placeholder="001" />
                                </div>
                                <div>
                                    <label className={labelCls}>RW</label>
                                    <input value={form.rw} onChange={e => set("rw", e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputCls} placeholder="001" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label className={labelCls}>Jenis Disabilitas <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {masterDisabilitas.map(md => (
                                        <button key={md.id} type="button" onClick={() => set("disabilitas_id", md.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${form.disabilitas_id === md.id ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                                            <div className={`p-1.5 rounded-lg ${form.disabilitas_id === md.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                                                <Accessibility className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-semibold ${form.disabilitas_id === md.id ? "text-indigo-700" : "text-gray-700"}`}>{md.nama_disabilitas}</p>
                                                {md.keterangan && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{md.keterangan}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {masterDisabilitas.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">Belum ada data master disabilitas. Silakan tambahkan di menu Master Disabilitas.</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Keterangan Kondisi</label>
                                <textarea value={form.keterangan_disabilitas} onChange={e => set("keterangan_disabilitas", e.target.value)} rows={3} className={inputCls + " resize-none"} placeholder="Jelaskan kondisi disabilitas..." />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <label className={labelCls}>Bantuan yang Diterima</label>
                                <div className="space-y-2 mt-2">
                                    {masterBantuan.map(mb => {
                                        const checked = form.bantuan_ids.includes(mb.id);
                                        return (
                                            <div key={mb.id} className={`p-3 rounded-xl border-2 transition-all ${checked ? "border-emerald-400 bg-emerald-50/50" : "border-gray-200"}`}>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" checked={checked} onChange={() => toggleBantuan(mb.id)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                                    <div className="flex-1">
                                                        <span className="text-sm font-semibold text-gray-700">{mb.nama_bantuan}</span>
                                                        {mb.keterangan && <p className="text-xs text-gray-400">{mb.keterangan}</p>}
                                                    </div>
                                                </label>
                                                {checked && (
                                                    <input value={form.bantuan_keterangan[mb.id] || ""} onChange={e => setForm(prev => ({ ...prev, bantuan_keterangan: { ...prev.bantuan_keterangan, [mb.id]: e.target.value } }))}
                                                        className="mt-2 w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500/30" placeholder="Keterangan bantuan (opsional)" />
                                                )}
                                            </div>
                                        );
                                    })}
                                    {masterBantuan.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">Belum ada data master bantuan.</p>}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl border border-slate-200 p-4 space-y-2">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ringkasan Data</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-gray-400">Nama:</span> <span className="font-semibold text-gray-800">{form.nama || "-"}</span></div>
                                    <div><span className="text-gray-400">NIK:</span> <span className="font-mono text-gray-800">{form.nik ? `****${form.nik.slice(-4)}` : "-"}</span></div>
                                    <div><span className="text-gray-400">Gender:</span> <span className="font-semibold text-gray-800">{form.jenis_kelamin || "-"}</span></div>
                                    <div><span className="text-gray-400">Kelurahan:</span> <span className="font-semibold text-gray-800">{kelurahans.find(k => k.id === form.kelurahan_id)?.nama || "-"}</span></div>
                                    <div className="col-span-2"><span className="text-gray-400">Disabilitas:</span> <span className="inline-flex ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">{masterDisabilitas.find(m => m.id === form.disabilitas_id)?.nama_disabilitas || "-"}</span></div>
                                    {form.bantuan_ids.length > 0 && (
                                        <div className="col-span-2"><span className="text-gray-400">Bantuan:</span> <span className="ml-1">{form.bantuan_ids.map(id => <span key={id} className="inline-flex mr-1 mb-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">{masterBantuan.find(m => m.id === id)?.nama_bantuan}</span>)}</span></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
                    <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
                                <ChevronLeft className="w-4 h-4" /> Kembali
                            </button>
                        )}
                        {step < 2 ? (
                            <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}
                                className="flex items-center gap-1 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed">
                                Lanjut <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmitForm} disabled={isSubmitting || !canGoNext()}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Simpan
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
