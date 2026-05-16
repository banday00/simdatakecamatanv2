"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Home, Search, ArrowLeft, Info, CheckCircle2, AlertCircle, Activity, Building, Landmark, Calendar, MapPin, Map, FileText, XCircle, Clock, Table2, Timer } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";

// Interface for Response
interface PBBResponse {
    rec: string;
    nop: string;
    tahun: string;
    nm_wp: string;
    provinsi_op: string;
    wilayah_op: string;
    kecamatan_op: string;
    kelurahan_op: string;
    luas_bumi: string;
    luas_bangunan: string;
    njop_bumi: string;
    njop_bangunan: string;
    tagihan: string;
    tgl_jatuh_tempo: string;
    denda: string;
    diskon: string;
    bayar: string;
    tgl_bayar: string;
    tp_bayar: string;
}

export default function PBBPage() {
    const { tenant } = useTenant();
    const toTenantPath = useTenantPath();

    const [nik, setNik] = useState("");
    const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
    const [captchaInput, setCaptchaInput] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    // Simpan semua record dari webhook (bisa multi-tahun)
    const [allRecords, setAllRecords] = useState<PBBResponse[]>([]);
    // Record terakhir (tahun terbaru) untuk ditampilkan di detail utama
    const [latestRecord, setLatestRecord] = useState<PBBResponse | null>(null);

    // Initialize Captcha
    useEffect(() => {
        generateCaptcha();
    }, []);

    const generateCaptcha = () => {
        const n1 = Math.floor(Math.random() * 10) + 1;
        const n2 = Math.floor(Math.random() * 10) + 1;
        setCaptcha({ num1: n1, num2: n2, answer: n1 + n2 });
        setCaptchaInput("");
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        // Specific Validation for NIK (Numbers only, Exactly 16 digits)
        const numericNik = nik.replace(/\D/g, '');
        if (numericNik.length !== 16) {
            setErrorMsg("Nomor Induk Kependudukan (NIK) harus terdiri dari 16 digit angka.");
            return;
        }

        if (parseInt(captchaInput) !== captcha.answer) {
            setErrorMsg("Jawaban penjumlahan keamanan salah.");
            generateCaptcha();
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/layanan/pbb", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nik: numericNik }),
            });

            if (!res.ok) throw new Error("Gagal mengambil data dari server.");

            const data = await res.json();

            // Webhook may return various formats: 
            // - nested array: [[{...}, {...}]]
            // - flat array: [{...}, {...}]  
            // - single object: {...}
            // - wrapped: { data: [...] }
            let resData = data.data;
            let records: PBBResponse[] = [];

            // Flatten if nested array [[{...}]]
            if (Array.isArray(resData) && resData.length > 0 && Array.isArray(resData[0])) {
                resData = resData.flat();
            }

            if (Array.isArray(resData) && resData.length > 0) {
                records = resData;
            } else if (resData && typeof resData === 'object' && !Array.isArray(resData)) {
                // Could be a single object or wrapped { data: [...] }
                if (resData.nop) {
                    records = [resData];
                } else if (Array.isArray(resData.data)) {
                    records = resData.data;
                } else if (Array.isArray(resData.result)) {
                    records = resData.result;
                }
            }

            if (records.length === 0) {
                setErrorMsg("Data PBB untuk pencarian tersebut tidak ditemukan.");
            } else {
                // Sort by tahun descending (terbaru di atas)
                records.sort((a, b) => parseInt(b.tahun) - parseInt(a.tahun));
                setAllRecords(records);
                setLatestRecord(records[0]); // Ambil tahun terbaru
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Terjadi kesalahan sistem saat menghubungi layanan data.");
        } finally {
            setIsLoading(false);
            generateCaptcha();
        }
    };

    const handleReset = () => {
        setLatestRecord(null);
        setAllRecords([]);
        setNik("");
        setCaptchaInput("");
        generateCaptcha();
    };

    const formatRupiah = (angkaStr: string | number) => {
        const angka = typeof angkaStr === 'string' ? parseFloat(angkaStr) : angkaStr;
        if (isNaN(angka)) return "0";
        return new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
        }).format(angka);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === "0000-00-00" || dateStr.includes("1900-")) return "-";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(date);
        } catch (e) {
            return dateStr;
        }
    };

    const formatDateShort = (dateStr: string) => {
        if (!dateStr || dateStr === "0000-00-00" || dateStr.includes("1900-")) return "-";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }).format(date);
        } catch (e) {
            return dateStr;
        }
    };

    /** Cek apakah record sudah dibayar */
    const isSudahBayar = (rec: PBBResponse) => {
        const bayarNum = parseFloat(rec.bayar || "0");
        return bayarNum > 0;
    };

    /**
     * Tentukan status per-record:
     * - 'lunas'       → bayar > 0
     * - 'menunggak'   → bayar = 0 DAN tanggal sekarang > tgl_jatuh_tempo
     * - 'belum_bayar' → bayar = 0 DAN tanggal sekarang <= tgl_jatuh_tempo (belum jatuh tempo)
     */
    const getRecordStatus = (rec: PBBResponse): 'lunas' | 'menunggak' | 'belum_bayar' => {
        if (isSudahBayar(rec)) return 'lunas';
        // Cek jatuh tempo
        const now = new Date();
        const jatuhTempo = new Date(rec.tgl_jatuh_tempo);
        if (!isNaN(jatuhTempo.getTime()) && now > jatuhTempo) {
            return 'menunggak';
        }
        return 'belum_bayar';
    };

    // Calculation for Logic Tunggakan
    const result = latestRecord;
    const currentYear = new Date().getFullYear();
    const dataYear = result ? parseInt(result.tahun) : 0;
    const selisihTahun = currentYear - dataYear;

    // Status record terakhir
    const latestStatus = result ? getRecordStatus(result) : 'belum_bayar';

    // Hitung jumlah record berdasarkan status
    const recordsMenunggak = allRecords.filter(r => getRecordStatus(r) === 'menunggak');
    const recordsBelumBayar = allRecords.filter(r => getRecordStatus(r) === 'belum_bayar');
    const recordsLunas = allRecords.filter(r => getRecordStatus(r) === 'lunas');
    const totalTagihanMenunggak = recordsMenunggak.reduce((sum, r) => {
        return sum + (parseFloat(r.tagihan || "0") + parseFloat(r.denda || "0") - parseFloat(r.diskon || "0"));
    }, 0);
    const totalTagihanBelumBayar = recordsBelumBayar.reduce((sum, r) => {
        return sum + (parseFloat(r.tagihan || "0") + parseFloat(r.denda || "0") - parseFloat(r.diskon || "0"));
    }, 0);

    // Hitung NOP dan Tahun unik untuk keterangan di banner
    const countNOPMenunggak = new Set(recordsMenunggak.map(r => r.nop)).size;
    const countTahunMenunggak = new Set(recordsMenunggak.map(r => r.tahun)).size;

    const countNOPBelumBayar = new Set(recordsBelumBayar.map(r => r.nop)).size;
    const countTahunBelumBayar = new Set(recordsBelumBayar.map(r => r.tahun)).size;

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <div className="bg-slate-900 border-b border-white/10">
                <Navbar />
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 md:py-16">

                {/* Header Title */}
                <div className="mb-10 animate-fade-in-up">
                    <Link href={toTenantPath("/")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                            <Home className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Cek Tagihan PBB</h1>
                            <p className="text-slate-500 mt-1 md:text-lg">
                                Pantau rincian tagihan Pajak Bumi & Bangunan Anda secara mandiri.
                            </p>
                        </div>
                    </div>
                </div>

                {!result ? (
                    /* ======== FORM CARI PBB ======== */
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-10 border border-slate-100 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-1.5 h-6 rounded-full bg-emerald-500 mb-2"></div>
                            <h2 className="text-xl font-bold text-slate-800 text-center">Identitas Subjek Pajak</h2>
                            <p className="text-slate-500 font-medium text-center mt-2">Silakan masukkan Nomor Induk Kependudukan (NIK) e-KTP Anda.</p>
                        </div>

                        <form onSubmit={handleSearch} className="space-y-8 max-w-4xl mx-auto flex flex-col items-center">

                            {/* Input Nomor Induk Kependudukan (NIK) */}
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-2 w-full rounded-2xl border-4 border-slate-700 shadow-2xl overflow-hidden">
                                <div className="border border-white/10 bg-black/20 rounded-xl px-4 py-8 md:px-10 md:py-10 flex flex-col items-center justify-center gap-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-5 h-5 text-emerald-400" />
                                        <span className="text-sm font-bold tracking-widest text-slate-300 uppercase">Input NIK (16-Digit)</span>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={16}
                                        value={nik}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, ''); // Numeric only
                                            setNik(val);
                                        }}
                                        placeholder="XXXXXXXXXXXXXXXX"
                                        className="w-full max-w-2xl bg-slate-900/80 border border-white/20 text-center text-3xl md:text-5xl font-bold text-slate-100 placeholder:text-white/10 outline-none font-mono tracking-[0.2em] focus:bg-slate-800 focus:border-emerald-500 rounded-2xl transition-all py-4 md:py-6 shadow-inner"
                                        required
                                    />
                                    <div className="flex justify-between w-full max-w-2xl px-2 mt-1">
                                        <span className={`text-xs font-medium ${nik.length === 16 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {nik.length}/16 Digit Dimasukkan
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Captcha Card (Center Aligned) */}
                            <div className="w-full max-w-md">
                                <div className="p-6 md:p-8 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col justify-center items-center text-center shadow-inner">
                                    <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-widest">
                                        Verifikasi Keamanan
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl text-2xl font-extrabold shadow-sm text-slate-800">
                                            {captcha.num1} + {captcha.num2} =
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={captchaInput}
                                            onChange={(e) => setCaptchaInput(e.target.value)}
                                            className="w-28 px-4 py-3 bg-white border-2 border-slate-300 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-2xl text-center text-slate-800 shadow-sm"
                                            placeholder="?"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Center */}
                            <div className="pt-6 mt-2 flex flex-col items-center w-full border-t border-slate-100">
                                {errorMsg && (
                                    <div className="mb-6 w-full max-w-md p-4 bg-rose-50 border border-rose-200 text-rose-600 font-medium rounded-xl flex items-center justify-center gap-3 animate-fade-in-up">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span className="text-center">{errorMsg}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full sm:w-auto min-w-[280px] px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-1"
                                >
                                    {isLoading ? (
                                        <>
                                            <Activity className="w-6 h-6 animate-spin" />
                                            <span className="text-lg">Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-6 h-6" />
                                            <span className="text-lg">Cek Tagihan PBB</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                ) : (
                    /* ======== HASIL PENCARIAN ======== */
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-6 rounded-full bg-emerald-500"></div>
                            <h2 className="text-xl font-bold text-slate-800">Detail Pembayaran Terakhir</h2>
                        </div>

                        {/* Banner Logika Tunggakan & Edukasi Pajak */}
                        {latestStatus === 'menunggak' ? (
                            <div className="mb-8 bg-rose-50 border border-rose-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-5 items-start">
                                <div className="p-3 bg-rose-100 rounded-full shrink-0">
                                    <AlertCircle className="w-7 h-7 text-rose-600" />
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-xl font-bold text-rose-800 mb-2">Terindikasi Menunggak Pembayaran</h3>
                                    <p className="text-rose-700 font-medium mb-3">
                                        Data sistem menunjukkan bahwa PBB tahun <span className="font-extrabold">{result.tahun}</span> telah <span className="font-extrabold bg-rose-200 px-2 py-0.5 rounded text-rose-900">melewati jatuh tempo</span> ({formatDate(result.tgl_jatuh_tempo)}) dan belum dilakukan pembayaran.
                                        {recordsMenunggak.length > 1 && (
                                            <> Total terdapat <span className="font-extrabold">{recordsMenunggak.length} tagihan</span> (dari {countNOPMenunggak} Objek Pajak selama {countTahunMenunggak} Tahun) yang menunggak dengan estimasi total tagihan <span className="font-extrabold bg-rose-200 px-2 py-0.5 rounded text-rose-900">Rp {formatRupiah(totalTagihanMenunggak)}</span>.</>
                                        )}
                                    </p>
                                    <p className="text-sm text-rose-600/80 italic font-medium">Segera lakukan pembayaran untuk menghindari akumulasi denda administrasi bulanan dan pemblokiran NOP.</p>
                                </div>
                            </div>
                        ) : latestStatus === 'belum_bayar' ? (
                            <div className="mb-8 bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-5 items-start">
                                <div className="p-3 bg-amber-100 rounded-full shrink-0">
                                    <Timer className="w-7 h-7 text-amber-600" />
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-xl font-bold text-amber-800 mb-2">PBB Belum Dibayar</h3>
                                    <p className="text-amber-700 font-medium mb-3">
                                        PBB tahun <span className="font-extrabold">{result.tahun}</span> belum dilakukan pembayaran. Jatuh tempo pembayaran pada tanggal <span className="font-extrabold bg-amber-200 px-2 py-0.5 rounded text-amber-900">{formatDate(result.tgl_jatuh_tempo)}</span>.
                                        {recordsBelumBayar.length > 1 && (
                                            <> Total terdapat <span className="font-extrabold">{recordsBelumBayar.length} tagihan</span> (dari {countNOPBelumBayar} Objek Pajak selama {countTahunBelumBayar} Tahun) yang belum dibayar dengan estimasi total tagihan <span className="font-extrabold bg-amber-200 px-2 py-0.5 rounded text-amber-900">Rp {formatRupiah(totalTagihanBelumBayar)}</span>.</>
                                        )}
                                    </p>
                                    <p className="text-sm text-amber-600/80 italic font-medium">Silakan lakukan pembayaran sebelum jatuh tempo untuk menghindari denda administrasi.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-5 items-start">
                                <div className="p-3 bg-emerald-100 rounded-full shrink-0">
                                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-xl font-bold text-emerald-800 mb-2">Terima Kasih Telah Membayar Pajak!</h3>
                                    <p className="text-emerald-700 font-medium mb-3">
                                        Pencatatan kami menunjukkan Nomor Objek Pajak ini lunas hingga tahun <span className="font-extrabold">{result.tahun}</span>. Pajak yang Anda bayarkan sangat berkontribusi besar untuk <strong>Pembangunan Kota Bogor</strong>.
                                    </p>
                                    <p className="text-sm text-emerald-600/80 italic font-medium">Data PBB secara otomatis dimutakhirkan secara terpadu oleh Bappenda Kota Bogor.</p>
                                </div>
                            </div>
                        )}

                        {/* Kartu Profil Subjek & Objek Pajak */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Card 1: Subjek Pajak */}
                            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                                <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-6 flex items-center gap-2">
                                    <Landmark className="w-4 h-4" /> Informasi Subjek
                                </h3>
                                <div className="mb-6">
                                    <p className="text-sm text-slate-500 mb-1">Nomor Objek Pajak (NOP)</p>
                                    <p className="font-mono text-xl font-extrabold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg inline-block border border-slate-200">{result.nop}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Nama Wajib Pajak</p>
                                    <p className="text-2xl font-black text-emerald-700 uppercase">{result.nm_wp}</p>
                                </div>
                            </div>

                            {/* Card 2: Objek Pajak - Lokasi */}
                            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                                <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-6 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Letak Objek Pajak
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <Map className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-slate-800">{result.kelurahan_op}</p>
                                            <p className="text-sm text-slate-500">Kecamatan {result.kecamatan_op}, {result.wilayah_op}</p>
                                            <p className="text-sm text-slate-400">{result.provinsi_op}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-2 border-t border-slate-100 flex gap-6">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Luas Bumi</p>
                                            <p className="font-extrabold text-slate-800">{result.luas_bumi} <span className="text-sm font-medium text-slate-500">m²</span></p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Luas Bangunan</p>
                                            <p className="font-extrabold text-slate-800">{result.luas_bangunan} <span className="text-sm font-medium text-slate-500">m²</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rincian Finansial Tabel Tagihan Terakhir */}
                        <div className="bg-slate-900 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden mb-8">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                            <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
                                <Activity className="w-6 h-6 text-emerald-400" /> Rincian Transaksi Terakhir (Thn {result.tahun})
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Left: Breakdown */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                        <span className="text-slate-400 text-sm">NJOP Bumi</span>
                                        <span className="text-white font-mono">Rp {formatRupiah(result.njop_bumi)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                        <span className="text-slate-400 text-sm">NJOP Bangunan</span>
                                        <span className="text-white font-mono">Rp {formatRupiah(result.njop_bangunan)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-white/10 mt-4">
                                        <span className="text-slate-300 font-medium">Tagihan Pokok</span>
                                        <span className="text-white font-bold font-mono text-lg">Rp {formatRupiah(result.tagihan)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                        <span className="text-slate-300 font-medium text-rose-300">Denda / Sanksi Administrasi</span>
                                        <span className="text-rose-400 font-bold font-mono">Rp {formatRupiah(result.denda)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                        <span className="text-slate-300 font-medium text-emerald-300">Diskon Pembayaran</span>
                                        <span className="text-emerald-400 font-bold font-mono">- Rp {formatRupiah(result.diskon)}</span>
                                    </div>
                                </div>

                                {/* Right: Total Bayar Highlight */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-center backdrop-blur-sm relative z-10">
                                    <p className="text-slate-400 text-sm mb-2 font-medium">
                                        {latestStatus === 'lunas' ? "Total Terbayar" : "Status Pembayaran"}
                                    </p>

                                    {latestStatus === 'lunas' ? (
                                        <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-6 font-mono tracking-tight">
                                            Rp {formatRupiah(result.bayar)}
                                        </p>
                                    ) : latestStatus === 'menunggak' ? (
                                        <div className="mb-6">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/20 border border-rose-400/30 rounded-xl mb-2">
                                                <XCircle className="w-6 h-6 text-rose-400" />
                                                <span className="text-2xl md:text-3xl font-extrabold text-rose-400">MENUNGGAK</span>
                                            </div>
                                            <p className="text-sm text-slate-400 mt-2">Tagihan yang harus dibayar:</p>
                                            <p className="text-2xl font-bold text-rose-400 font-mono">Rp {formatRupiah(
                                                parseFloat(result.tagihan || "0") + parseFloat(result.denda || "0") - parseFloat(result.diskon || "0")
                                            )}</p>
                                        </div>
                                    ) : (
                                        <div className="mb-6">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-400/30 rounded-xl mb-2">
                                                <Clock className="w-6 h-6 text-amber-400" />
                                                <span className="text-2xl md:text-3xl font-extrabold text-amber-400">BELUM BAYAR</span>
                                            </div>
                                            <p className="text-sm text-slate-400 mt-2">Tagihan yang harus dibayar:</p>
                                            <p className="text-2xl font-bold text-amber-400 font-mono">Rp {formatRupiah(
                                                parseFloat(result.tagihan || "0") + parseFloat(result.denda || "0") - parseFloat(result.diskon || "0")
                                            )}</p>
                                        </div>
                                    )}

                                    <div className="p-4 bg-black/20 rounded-xl space-y-3">
                                        {latestStatus === 'lunas' ? (
                                            <>
                                                <div className="flex items-start gap-3">
                                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Waktu Transaksi</p>
                                                        <p className="text-sm font-medium text-slate-200">{formatDate(result.tgl_bayar)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Tempat Pembayaran</p>
                                                        <p className="text-sm font-bold text-emerald-400">{result.tp_bayar || "-"}</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : latestStatus === 'menunggak' ? (
                                            <>
                                                <div className="flex items-start gap-3">
                                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Jatuh Tempo (Terlewat)</p>
                                                        <p className="text-sm font-medium text-rose-300">{formatDate(result.tgl_jatuh_tempo)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Keterangan</p>
                                                        <p className="text-sm font-medium text-rose-300">Pajak tahun {result.tahun} telah melewati jatuh tempo dan belum dibayar</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-start gap-3">
                                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Jatuh Tempo</p>
                                                        <p className="text-sm font-medium text-amber-300">{formatDate(result.tgl_jatuh_tempo)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Keterangan</p>
                                                        <p className="text-sm font-medium text-amber-300">Pajak tahun {result.tahun} belum dibayar, masih dalam tenggat waktu</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ======== TABEL HISTORI PEMBAYARAN ======== */}
                        {allRecords.length > 0 && (
                            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-12">
                                <div className="px-6 md:px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-blue-50">
                                                <Table2 className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">Histori Pembayaran PBB</h3>
                                                <p className="text-sm text-slate-500">Seluruh riwayat tagihan dan pembayaran berdasarkan data Dispenda</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                                                {recordsLunas.length} Lunas
                                            </span>
                                            {recordsMenunggak.length > 0 && (
                                                <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-100">
                                                    {recordsMenunggak.length} Menunggak
                                                </span>
                                            )}
                                            {recordsBelumBayar.length > 0 && (
                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100">
                                                    {recordsBelumBayar.length} Belum Bayar
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tahun</th>
                                                <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">NOP</th>
                                                <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tagihan</th>
                                                <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bayar</th>
                                                <th className="text-left px-4 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tgl Bayar</th>
                                                <th className="text-center px-4 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {allRecords.map((rec, idx) => {
                                                const status = getRecordStatus(rec);
                                                return (
                                                    <tr
                                                        key={`${rec.tahun}-${idx}`}
                                                        className={`transition-colors ${status === 'menunggak'
                                                            ? 'bg-rose-50/50 hover:bg-rose-50'
                                                            : status === 'belum_bayar'
                                                                ? 'bg-amber-50/50 hover:bg-amber-50'
                                                                : 'hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <td className="px-4 md:px-6 py-4">
                                                            <span className="font-extrabold text-slate-800 text-base">{rec.tahun}</span>
                                                        </td>
                                                        <td className="px-4 md:px-6 py-4">
                                                            <span className="font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">{rec.nop}</span>
                                                        </td>
                                                        <td className="px-4 md:px-6 py-4">
                                                            <span className="font-mono font-semibold text-slate-700">Rp {formatRupiah(rec.tagihan)}</span>
                                                        </td>
                                                        <td className="px-4 md:px-6 py-4">
                                                            <span className={`font-mono font-bold ${status === 'lunas' ? 'text-emerald-700' : status === 'menunggak' ? 'text-rose-600' : 'text-amber-600'}`}>
                                                                {status === 'lunas' ? `Rp ${formatRupiah(rec.bayar)}` : 'Rp 0'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 md:px-6 py-4">
                                                            <span className="text-slate-600 font-medium">
                                                                {status === 'lunas' ? formatDateShort(rec.tgl_bayar) : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 md:px-6 py-4 text-center">
                                                            {status === 'lunas' ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    Lunas
                                                                </span>
                                                            ) : status === 'menunggak' ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                    Menunggak
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    Belum Bayar
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* Footer ringkasan */}
                                        {allRecords.length > 1 && (
                                            <tfoot>
                                                <tr className="bg-slate-50 border-t-2 border-slate-200">
                                                    <td colSpan={2} className="px-4 md:px-6 py-4 font-bold text-slate-700 uppercase pr-8 text-right text-xs tracking-wider">Total</td>
                                                    <td className="px-4 md:px-6 py-4 font-mono font-bold text-slate-800">
                                                        Rp {formatRupiah(allRecords.reduce((s, r) => s + parseFloat(r.tagihan || "0"), 0))}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 font-mono font-bold text-emerald-700">
                                                        Rp {formatRupiah(allRecords.reduce((s, r) => s + parseFloat(r.bayar || "0"), 0))}
                                                    </td>
                                                    <td colSpan={2} className="px-4 md:px-6 py-4"></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* Info footer */}
                                <div className="px-6 md:px-8 py-4 border-t border-slate-100 bg-slate-50/50">
                                    <p className="text-xs text-slate-400 flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5 shrink-0" />
                                        Data pembayaran bersumber dari sistem informasi Bappenda Kota Bogor dan bersifat informatif.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Banner & Tombol Kembali */}
                        <div className="flex justify-center h-full">
                            <button
                                onClick={handleReset}
                                className="w-full md:w-auto min-w-[300px] px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold rounded-2xl transition-all shadow-sm text-center flex items-center justify-center gap-3 transform hover:-translate-y-1"
                            >
                                <ArrowLeft className="w-5 h-5" /> Cari NIK / NOP Lainnya
                            </button>
                        </div>

                    </div>
                )}
            </div>

            <Footer />
        </main>
    );
}
