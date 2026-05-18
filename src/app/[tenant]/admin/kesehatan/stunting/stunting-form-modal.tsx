"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Save, Search, CheckCircle2, AlertCircle, Baby, Activity, MapPin } from "lucide-react";

type ChildInfo = {
    penduduk_id: string;
    nik: string;
    nama: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    kelurahan_id: string;
    [key: string]: unknown;
};

type MeasurementEdit = {
    id: string;
    posyandu_id: string | null;
    nama_ortu: string | null;
    tanggal_pengukuran: string;
    berat_badan: number | null;
    tinggi_badan: number | null;
    status_tbu: string;
    status_bbu: string;
    intervensi_diterima: string[];
    kelurahan_id: string;
};

type SearchResult = {
    penduduk_id: string;
    nik: string;
    nama: string;
    jenis_kelamin: string | null;
    tanggal_lahir: string | null;
    nama_ibu_kandung: string | null;
    keluarga_id: string;
    no_kk: string | null;
    alamat: string | null;
    rt: string | null;
    rw: string | null;
    kelurahan_id: string;
} | null;

type Props = {
    onClose: () => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
    editMeasurement: MeasurementEdit | null;
    child: ChildInfo | null;
    kelurahanOptions: { label: string; value: string }[];
    posyandus: { id: string; nama: string; kelurahan_id?: string }[];
    isKelurahanAdmin?: boolean;
    filterKelurahanId?: string | null;
    onSearchNIK: (nik: string) => Promise<SearchResult>;
};

const statusTbuOptions = ["Normal", "Pendek", "Sangat Pendek", "Tinggi"];
const statusBbuOptions = ["Normal", "Risiko Lebih", "Gizi Lebih", "Obesitas", "Gizi Kurang", "Gizi Buruk"];
const intervensiOptions = ["PMT Pemulihan", "Susu Formula", "Vitamin A", "Obat Cacing", "Edukasi Gizi"];

export function StuntingFormModal({
    onClose, onSubmit, editMeasurement, child,
    kelurahanOptions, posyandus, isKelurahanAdmin, filterKelurahanId, onSearchNIK,
}: Props) {
    const isEdit = !!editMeasurement;
    const hasChild = !!child; // Adding measurement for existing child

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [nikFound, setNikFound] = useState<boolean | null>(hasChild ? true : null);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    const [form, setForm] = useState({
        penduduk_id: "",
        nik_anak: "",
        nama_anak: "",
        jenis_kelamin: "L",
        tanggal_lahir: "",
        nama_ortu: "",
        no_kk: "",
        alamat: "",
        rt: "",
        rw: "",
        kelurahan_id: (isKelurahanAdmin && filterKelurahanId) ? filterKelurahanId : "",
        posyandu_id: "",
        tanggal_pengukuran: new Date().toISOString().split("T")[0],
        berat_badan: "",
        tinggi_badan: "",
        status_tbu: "Normal",
        status_bbu: "Normal",
        intervensi_diterima: [] as string[],
    });

    useEffect(() => {
        if (hasChild && child) {
            setForm(prev => ({
                ...prev,
                penduduk_id: child.penduduk_id,
                nik_anak: child.nik || "",
                nama_anak: child.nama || "",
                jenis_kelamin: child.jenis_kelamin || "L",
                tanggal_lahir: child.tanggal_lahir ? String(child.tanggal_lahir).split("T")[0] : "",
                kelurahan_id: child.kelurahan_id || prev.kelurahan_id,
            }));
            setNikFound(true);
        }
        if (isEdit && editMeasurement) {
            setForm(prev => ({
                ...prev,
                posyandu_id: editMeasurement.posyandu_id || "",
                nama_ortu: editMeasurement.nama_ortu || "",
                tanggal_pengukuran: editMeasurement.tanggal_pengukuran || prev.tanggal_pengukuran,
                berat_badan: editMeasurement.berat_badan != null ? String(editMeasurement.berat_badan) : "",
                tinggi_badan: editMeasurement.tinggi_badan != null ? String(editMeasurement.tinggi_badan) : "",
                status_tbu: editMeasurement.status_tbu || "Normal",
                status_bbu: editMeasurement.status_bbu || "Normal",
                intervensi_diterima: Array.isArray(editMeasurement.intervensi_diterima) ? editMeasurement.intervensi_diterima : [],
                kelurahan_id: editMeasurement.kelurahan_id || prev.kelurahan_id,
            }));
        }
    }, [hasChild, child, isEdit, editMeasurement]);

    const set = (key: string, val: unknown) => setForm(prev => ({ ...prev, [key]: val }));

    // NIK search with debounce
    const handleNIKChange = useCallback((nik: string) => {
        set("nik_anak", nik);
        setNikFound(null);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (nik.length === 16) {
            setIsSearching(true);
            searchTimer.current = setTimeout(async () => {
                const result = await onSearchNIK(nik);
                setIsSearching(false);
                if (result) {
                    setNikFound(true);
                    setForm(prev => ({
                        ...prev,
                        penduduk_id: result.penduduk_id,
                        nama_anak: result.nama || prev.nama_anak,
                        jenis_kelamin: result.jenis_kelamin || prev.jenis_kelamin,
                        tanggal_lahir: result.tanggal_lahir ? String(result.tanggal_lahir).split("T")[0] : prev.tanggal_lahir,
                        nama_ortu: result.nama_ibu_kandung || prev.nama_ortu,
                        no_kk: result.no_kk || prev.no_kk,
                        alamat: result.alamat || prev.alamat,
                        rt: result.rt || prev.rt,
                        rw: result.rw || prev.rw,
                        kelurahan_id: result.kelurahan_id || prev.kelurahan_id,
                    }));
                } else {
                    setNikFound(false);
                    setForm(prev => ({ ...prev, penduduk_id: "" }));
                }
            }, 500);
        }
    }, [onSearchNIK]);

    const toggleIntervensi = (val: string) => {
        const arr = form.intervensi_diterima;
        set("intervensi_diterima", arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasChild && !isEdit && form.nik_anak.length !== 16) { alert("NIK Anak harus 16 digit."); return; }
        setIsSubmitting(true);
        try {
            const payload: Record<string, unknown> = {
                penduduk_id: form.penduduk_id || null,
                kelurahan_id: form.kelurahan_id,
                posyandu_id: form.posyandu_id || null,
                nama_ortu: form.nama_ortu || null,
                tanggal_pengukuran: form.tanggal_pengukuran,
                berat_badan: form.berat_badan ? Number(form.berat_badan) : null,
                tinggi_badan: form.tinggi_badan ? Number(form.tinggi_badan) : null,
                status_tbu: form.status_tbu,
                status_bbu: form.status_bbu,
                intervensi_diterima: form.intervensi_diterima,
            };
            // Include identity fields for new child
            if (!hasChild && !isEdit) {
                payload.nik_anak = form.nik_anak;
                payload.nama_anak = form.nama_anak;
                payload.jenis_kelamin = form.jenis_kelamin;
                payload.tanggal_lahir = form.tanggal_lahir || null;
                payload.no_kk = form.no_kk || null;
                payload.alamat = form.alamat || null;
                payload.rt = form.rt || null;
                payload.rw = form.rw || null;
            }
            await onSubmit(payload);
        } catch (err: any) {
            alert(err.message || "Gagal menyimpan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputCls = "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm";
    const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";

    const availablePosyandus = form.kelurahan_id ? posyandus.filter(p => String(p.kelurahan_id) === String(form.kelurahan_id)) : posyandus;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600"><Baby className="w-5 h-5" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {isEdit ? "Edit Pemeriksaan" : hasChild ? `Pemeriksaan Baru — ${child?.nama}` : "Tambah Anak & Pengukuran"}
                            </h2>
                            <p className="text-xs text-gray-500">{isEdit ? "Perbarui catatan pengukuran" : hasChild ? "Tambah catatan pengukuran baru" : "Pendataan BNBA sesuai E-PPGBM"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 overflow-y-auto bg-slate-50/30 space-y-6">

                        {/* Identity section — only for new child (not edit, not existing child) */}
                        {!hasChild && !isEdit && (
                            <div>
                                <div className="flex items-center gap-2 pb-2 mb-4 border-b border-blue-100">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Identitas Anak</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="col-span-2">
                                        <label className={labelCls}>NIK Anak <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input value={form.nik_anak} onChange={e => handleNIKChange(e.target.value.replace(/\D/g, "").slice(0, 16))} className={inputCls + " pl-10 font-mono"} placeholder="16 digit NIK" />
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
                                        </div>
                                        {nikFound === true && <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Penduduk ditemukan — identitas terisi otomatis</p>}
                                        {nikFound === false && <p className="flex items-center gap-1 text-xs text-amber-600 mt-1 font-medium"><AlertCircle className="w-3.5 h-3.5" /> NIK belum terdaftar — lengkapi data di bawah</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Nama Lengkap Anak <span className="text-red-500">*</span></label>
                                        <input value={form.nama_anak} onChange={e => set("nama_anak", e.target.value)} className={inputCls} required readOnly={nikFound === true} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Jenis Kelamin</label>
                                        <select value={form.jenis_kelamin} onChange={e => set("jenis_kelamin", e.target.value)} className={inputCls} disabled={nikFound === true}>
                                            <option value="L">Laki-laki</option><option value="P">Perempuan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Tanggal Lahir</label>
                                        <input type="date" value={form.tanggal_lahir} onChange={e => set("tanggal_lahir", e.target.value)} className={inputCls} readOnly={nikFound === true} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>No. KK</label>
                                        <input value={form.no_kk} onChange={e => set("no_kk", e.target.value.replace(/\D/g, "").slice(0, 16))} className={inputCls + " font-mono"} placeholder="16 digit" readOnly={nikFound === true} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Kelurahan <span className="text-red-500">*</span></label>
                                        <select value={form.kelurahan_id} onChange={e => set("kelurahan_id", e.target.value)} className={inputCls} required disabled={nikFound === true || kelurahanOptions.length === 1}>
                                            <option value="">Pilih</option>
                                            {kelurahanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Alamat</label>
                                        <input value={form.alamat} onChange={e => set("alamat", e.target.value)} className={inputCls} readOnly={nikFound === true} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelCls}>RT</label><input value={form.rt} onChange={e => set("rt", e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputCls} readOnly={nikFound === true} /></div>
                                        <div><label className={labelCls}>RW</label><input value={form.rw} onChange={e => set("rw", e.target.value.replace(/\D/g, "").slice(0, 3))} className={inputCls} readOnly={nikFound === true} /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Identity summary for existing child */}
                        {hasChild && child && (
                            <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                                    <div><span className="text-gray-400">Nama:</span> <span className="font-semibold text-gray-800">{child.nama}</span></div>
                                    <div><span className="text-gray-400">NIK:</span> <span className="font-mono text-gray-700">{"••••" + (child.nik || "").slice(-4)}</span></div>
                                    <div><span className="text-gray-400">JK:</span> <span className="font-medium text-gray-700">{child.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"}</span></div>
                                    <div><span className="text-gray-400">Lahir:</span> <span className="text-gray-700">{child.tanggal_lahir || "—"}</span></div>
                                </div>
                            </div>
                        )}

                        {/* Measurement section */}
                        <div>
                            <div className="flex items-center gap-2 pb-2 mb-4 border-b border-orange-100">
                                <Activity className="w-4 h-4 text-orange-500" />
                                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Data Pengukuran</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {!hasChild && !isEdit && (
                                    <div>
                                        <label className={labelCls}>Nama Orang Tua</label>
                                        <input value={form.nama_ortu} onChange={e => set("nama_ortu", e.target.value)} className={inputCls} />
                                    </div>
                                )}
                                {(hasChild || isEdit) && (
                                    <div>
                                        <label className={labelCls}>Nama Orang Tua</label>
                                        <input value={form.nama_ortu} onChange={e => set("nama_ortu", e.target.value)} className={inputCls} />
                                    </div>
                                )}
                                <div>
                                    <label className={labelCls}>Posyandu</label>
                                    <select value={form.posyandu_id} onChange={e => set("posyandu_id", e.target.value)} className={inputCls}>
                                        <option value="">— Tidak di Posyandu —</option>
                                        {availablePosyandus.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Tgl Pengukuran <span className="text-red-500">*</span></label>
                                    <input type="date" required value={form.tanggal_pengukuran} onChange={e => set("tanggal_pengukuran", e.target.value)} max={new Date().toISOString().split("T")[0]} className={inputCls} />
                                </div>
                                {(hasChild || isEdit) && (
                                    <div>
                                        <label className={labelCls}>Kelurahan</label>
                                        <select value={form.kelurahan_id} onChange={e => set("kelurahan_id", e.target.value)} className={inputCls} disabled={kelurahanOptions.length === 1}>
                                            <option value="">Pilih</option>
                                            {kelurahanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div>
                                    <label className={labelCls}>Berat Badan (kg) <span className="text-red-500">*</span></label>
                                    <input type="number" step="0.01" min={0} required value={form.berat_badan} onChange={e => set("berat_badan", e.target.value)} className={inputCls + " font-mono"} />
                                </div>
                                <div>
                                    <label className={labelCls}>Tinggi Badan (cm) <span className="text-red-500">*</span></label>
                                    <input type="number" step="0.01" min={0} required value={form.tinggi_badan} onChange={e => set("tinggi_badan", e.target.value)} className={inputCls + " font-mono"} />
                                </div>
                                <div>
                                    <label className={labelCls}>Status TB/U <span className="text-red-500">*</span></label>
                                    <select required value={form.status_tbu} onChange={e => set("status_tbu", e.target.value)} className={`${inputCls} font-semibold ${form.status_tbu === "Sangat Pendek" ? "text-red-600 bg-red-50" : form.status_tbu === "Pendek" ? "text-amber-600 bg-amber-50" : ""}`}>
                                        {statusTbuOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Status BB/U <span className="text-red-500">*</span></label>
                                    <select required value={form.status_bbu} onChange={e => set("status_bbu", e.target.value)} className={`${inputCls} font-semibold ${form.status_bbu === "Gizi Buruk" ? "text-red-600 bg-red-50" : form.status_bbu === "Gizi Kurang" ? "text-amber-600 bg-amber-50" : ""}`}>
                                        {statusBbuOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className={labelCls}>Intervensi & Bantuan</label>
                                <div className="flex flex-wrap gap-2">
                                    {intervensiOptions.map(v => {
                                        const active = form.intervensi_diterima.includes(v);
                                        return (
                                            <button type="button" key={v} onClick={() => toggleIntervensi(v)}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${active ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                                                {active ? "✓ " : ""}{v}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
                        <p className="text-xs text-gray-400"><span className="text-red-400">*</span> Wajib diisi</p>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">Batal</button>
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Simpan Perubahan" : "Simpan Data"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
