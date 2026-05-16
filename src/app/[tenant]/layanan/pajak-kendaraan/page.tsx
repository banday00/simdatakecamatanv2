"use client";

import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Car, Search, ArrowLeft, CheckCircle2, Info, ChevronRight, Activity, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";

// Interfaces for Response
interface PembayaranPKB {
    "pkb-pokok": number;
    "pkb-denda": number;
    "opsen-pkb-pokok": number;
    "opsen-pkb-denda": number;
    "swdkllj-pokok": number;
    "swdkllj-denda": number;
    "pnbp-stnk": number;
    "pnbp-tnkb": number;
    total: number;
}

interface PajakResponse {
    success: boolean;
    code: string;
    message: string;
    data: {
        "informasi-umum": {
            merk: string;
            model: string;
            "nomor-polisi": string;
            warna: string;
            "milik-ke": string;
            jenis: string;
            "tahun-buatan": string;
        };
        "informasi-pkb-pnbp": {
            dari: string;
            ke: string;
            "tanggal-pajak": string;
            "tanggal-stnk": string;
            wilayah: string;
        };
        "pembayaran-pkb-pnbp": PembayaranPKB;
        "pembayaran-pkb-pnbp-non-program"?: PembayaranPKB;
        "tanggal-proses": string;
        keterangan: string;
        isFiveYear: boolean;
        canBePaid: boolean;
    };
}

export default function PajakKendaraanPage() {
    const { tenant } = useTenant();
    const toTenantPath = useTenantPath();

    const [prefix, setPrefix] = useState("F");
    const [number, setNumber] = useState("");
    const [suffix, setSuffix] = useState("");
    const [kdPlat, setKdPlat] = useState("1"); // 1=Hitam, 2=Merah, 3=Kuning

    const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
    const [captchaInput, setCaptchaInput] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [result, setResult] = useState<PajakResponse | null>(null);

    // References for auto-focus
    const refPrefix = useRef<HTMLInputElement>(null);
    const refNumber = useRef<HTMLInputElement>(null);
    const refSuffix = useRef<HTMLInputElement>(null);

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

        if (!prefix || !number) {
            setErrorMsg("Plat nomor tidak lengkap.");
            return;
        }

        if (parseInt(captchaInput) !== captcha.answer) {
            setErrorMsg("Jawaban penjumlahan salah.");
            generateCaptcha();
            return;
        }

        setIsLoading(true);

        // Format no polisi: "F 1234 AB"
        const noPolisiFormatted = `${prefix.toUpperCase()} ${number} ${suffix.toUpperCase()}`.trim();

        try {
            const res = await fetch("/api/layanan/pajak-kendaraan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    no_polisi: noPolisiFormatted,
                    kd_plat: kdPlat
                }),
            });

            if (!res.ok) throw new Error("Gagal mengambil data dari server.");

            const data = await res.json();

            // Webhook returns array of 1 object
            let resData = data;
            if (Array.isArray(data) && data.length > 0) {
                resData = data[0];
            }

            if (resData.success && resData.data) {
                setResult(resData);
            } else {
                setErrorMsg(resData.message || "Data kendaraan tidak ditemukan.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Terjadi kesalahan sistem.");
        } finally {
            setIsLoading(false);
            generateCaptcha();
        }
    };

    const handleReset = () => {
        setResult(null);
        setPrefix("F");
        setNumber("");
        setSuffix("");
        setCaptchaInput("");
        generateCaptcha();
    };

    const formatRupiah = (angka: number) => {
        return new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
        }).format(angka);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(date);
    };

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
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                            <Car className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Info Pajak Kendaraan</h1>
                            <p className="text-slate-500 mt-1 md:text-lg">
                                Cari tahu status pajak & biaya perpanjangan STNK kendaraan Anda.
                            </p>
                        </div>
                    </div>
                </div>

                {!result ? (
                    /* ======== FORM CARI KENDARAAN ======== */
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-10 border border-slate-100 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-1.5 h-6 rounded-full bg-blue-500 mb-2"></div>
                            <h2 className="text-xl font-bold text-slate-800 text-center">Info Kendaraan Bermotor</h2>
                            <p className="text-slate-500 font-medium text-center mt-2">Silakan masukkan Nomor Polisi kendaraan Anda yang ingin dicari.</p>
                        </div>

                        <form onSubmit={handleSearch} className="space-y-8 max-w-4xl mx-auto flex flex-col items-center">

                            {/* Input Plat Nomor - Gaya Plat Asli */}
                            <div className="bg-black text-white p-2 w-full rounded-2xl border-4 border-slate-800 shadow-2xl overflow-hidden">
                                <div className="border border-white/20 rounded-xl px-4 py-8 md:px-10 md:py-14 flex items-center justify-center gap-4 sm:gap-8">
                                    <input
                                        ref={refPrefix}
                                        type="text"
                                        maxLength={2}
                                        value={prefix}
                                        onChange={(e) => {
                                            setPrefix(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase());
                                            if (e.target.value.length === 2 && refNumber.current) refNumber.current.focus();
                                        }}
                                        placeholder="XX"
                                        className="w-24 md:w-32 bg-transparent text-center text-5xl md:text-8xl font-bold text-slate-300 placeholder:text-white/20 outline-none uppercase font-mono tracking-widest placeholder:tracking-normal focus:bg-white/10 rounded-lg transition-colors py-2"
                                        required
                                    />
                                    <input
                                        ref={refNumber}
                                        type="text"
                                        maxLength={4}
                                        value={number}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setNumber(val);
                                            if (val.length === 4 && refSuffix.current) refSuffix.current.focus();
                                        }}
                                        placeholder="XXXX"
                                        className="w-32 md:w-64 bg-transparent text-center text-5xl md:text-8xl font-bold text-slate-300 placeholder:text-white/20 outline-none font-mono tracking-widest placeholder:tracking-normal focus:bg-white/10 rounded-lg transition-colors py-2"
                                        required
                                    />
                                    <input
                                        ref={refSuffix}
                                        type="text"
                                        maxLength={3}
                                        value={suffix}
                                        onChange={(e) => setSuffix(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                                        placeholder="XXX"
                                        className="w-24 md:w-40 bg-transparent text-center text-5xl md:text-8xl font-bold text-slate-300 placeholder:text-white/20 outline-none uppercase font-mono tracking-widest placeholder:tracking-normal focus:bg-white/10 rounded-lg transition-colors py-2"
                                    />
                                </div>
                            </div>

                            {/* Pilihan Warna Plat & Captcha (Side by Side Grid) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">

                                {/* Warna TNKB Card */}
                                <div className="p-5 md:p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <Info className="w-4 h-4 text-blue-500" /> Pilih Warna TNKB
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        <label className={`relative cursor-pointer flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-sm transition-all border-2 ${kdPlat === "1" ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                                            <input type="radio" name="kd_plat" value="1" checked={kdPlat === "1"} onChange={(e) => setKdPlat(e.target.value)} className="sr-only" />
                                            Hitam
                                            {kdPlat === "1" && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </label>
                                        <label className={`relative cursor-pointer flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-sm transition-all border-2 ${kdPlat === "2" ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                                            <input type="radio" name="kd_plat" value="2" checked={kdPlat === "2"} onChange={(e) => setKdPlat(e.target.value)} className="sr-only" />
                                            Merah
                                            {kdPlat === "2" && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </label>
                                        <label className={`relative cursor-pointer flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-sm transition-all border-2 ${kdPlat === "3" ? "bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-400/30" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                                            <input type="radio" name="kd_plat" value="3" checked={kdPlat === "3"} onChange={(e) => setKdPlat(e.target.value)} className="sr-only" />
                                            Kuning
                                            {kdPlat === "3" && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </label>
                                    </div>
                                </div>

                                {/* Captcha Card */}
                                <div className="p-5 md:p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center items-center text-center">
                                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                                        Perhitungan Keamanan
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xl font-extrabold shadow-sm text-slate-800">
                                            {captcha.num1} + {captcha.num2} =
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={captchaInput}
                                            onChange={(e) => setCaptchaInput(e.target.value)}
                                            className="w-24 px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-xl text-center text-slate-800 shadow-sm"
                                            placeholder="?"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Center */}
                            <div className="pt-6 mt-2 flex flex-col items-center w-full">
                                {errorMsg && (
                                    <div className="mb-6 w-full p-4 bg-rose-50 border border-rose-200 text-rose-600 font-medium rounded-xl flex items-center justify-center gap-3 animate-fade-in-up">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {errorMsg}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full sm:w-auto min-w-[200px] px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-1"
                                >
                                    {isLoading ? (
                                        <>
                                            <Activity className="w-6 h-6 animate-spin" />
                                            <span className="text-lg">Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-6 h-6" />
                                            <span className="text-lg">Cari Kendaraan</span>
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
                            <div className="w-1.5 h-6 rounded-full bg-blue-500"></div>
                            <h2 className="text-xl font-bold text-slate-800">Detail Kendaraan Anda</h2>
                        </div>

                        {/* Alert Keterangan */}
                        {result.data.keterangan && (
                            <div className="mb-6 bg-[#ffeebf] border border-[#f3d052] p-5 rounded-xl shadow-sm flex gap-4">
                                <Info className="w-6 h-6 text-[#b58c0c] shrink-0 mt-0.5" />
                                <p className="text-[#8c6700] text-sm md:text-base font-medium leading-relaxed">
                                    {result.data.keterangan}
                                </p>
                            </div>
                        )}

                        {/* Detail 3 Kolom */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                            {/* Kolom 1: Info Kendaraan */}
                            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full">
                                <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                    <Car className="w-5 h-5 text-blue-500" /> Informasi Kendaraan
                                </h3>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Nomor Polisi</p>
                                        <p className="font-bold text-slate-900">{result.data["informasi-umum"]["nomor-polisi"]}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Warna KB</p>
                                        <p className="font-bold text-slate-900">{result.data["informasi-umum"]["warna"]}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Merek</p>
                                        <p className="font-bold text-slate-900">{result.data["informasi-umum"]["merk"]}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Model</p>
                                        <p className="font-bold text-slate-900">{result.data["informasi-umum"]["model"]}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Kolom 2: Info PKB PNBP */}
                            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full">
                                <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                    <Search className="w-5 h-5 text-indigo-500" /> Informasi Pajak dan PNBP
                                </h3>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">MS. Berlaku Pajak</p>
                                        <p className="font-bold text-slate-900">
                                            {formatDate(result.data["informasi-pkb-pnbp"]["dari"])} - {formatDate(result.data["informasi-pkb-pnbp"]["ke"])}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Tgl. Akhir STNK</p>
                                        <p className="font-bold text-slate-900">{formatDate(result.data["informasi-pkb-pnbp"]["tanggal-stnk"])}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Tgl. Proses</p>
                                        <p className="font-bold text-slate-900">{result.data["tanggal-proses"]}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Milik Ke -</p>
                                        <p className="font-bold text-slate-900">{result.data["informasi-umum"]["milik-ke"] || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Kolom 3: Biaya */}
                            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full">
                                <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-emerald-500" /> Informasi Biaya
                                </h3>
                                <div className="space-y-3 font-mono text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-sans">PKB Pokok</span>
                                        <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-400">: Rp</span><span className="font-bold text-slate-800">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["pkb-pokok"])}</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-sans">PKB Denda</span>
                                        <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-400">: Rp</span><span className="font-bold text-slate-800">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["pkb-denda"])}</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-sans">Opsen PKB Pokok</span>
                                        <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-400">: Rp</span><span className="font-bold text-slate-800">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["opsen-pkb-pokok"])}</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-sans">Opsen PKB Denda</span>
                                        <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-400">: Rp</span><span className="font-bold text-slate-800">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["opsen-pkb-denda"])}</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-sans">SWDKLLJ Pokok</span>
                                        <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-400">: Rp</span><span className="font-bold text-slate-800">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["swdkllj-pokok"])}</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-sans">SWDKLLJ Denda</span>
                                        <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-400">: Rp</span><span className="font-bold text-slate-800">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["swdkllj-denda"])}</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-sans">PNBP STNK</span>
                                        <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-400">: Rp</span><span className="font-bold text-slate-800">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["pnbp-stnk"])}</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-sans">PNBP TNKB</span>
                                        <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-400">: Rp</span><span className="font-bold text-slate-800">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["pnbp-tnkb"])}</span></div>
                                    </div>

                                    <div className="pt-3 mt-3 border-t border-slate-200">
                                        <div className="flex justify-between">
                                            <span className="text-slate-900 font-bold font-sans">Total</span>
                                            <div className="flex max-w-[50%] justify-between gap-2 w-full"><span className="text-slate-900 font-bold font-sans">: Rp</span><span className="font-extrabold text-blue-600 text-lg">{formatRupiah(result.data["pembayaran-pkb-pnbp"]["total"])}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Banner & Tombol Kembali */}
                        <div className="flex flex-col md:flex-row gap-4 items-center mb-10">
                            <button
                                onClick={handleReset}
                                className="w-full md:w-auto flex-1 px-6 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-bold rounded-2xl transition-colors shadow-sm text-center"
                            >
                                Kembali Pencarian
                            </button>

                            <div className="w-full md:w-2/3 bg-blue-100/50 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Info className="w-6 h-6 text-blue-500 shrink-0" />
                                    <p className="text-sm font-medium text-blue-900 leading-snug">
                                        Untuk memperoleh kode bayar, silahkan akses <span className="font-bold">Sambara</span> pada Aplikasi <span className="font-bold">Sapawarga</span>
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <a href="https://play.google.com/store/apps/details?id=id.go.jabarprov.sapawarga" target="_blank" rel="noopener noreferrer">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-10 opacity-90 hover:opacity-100 transition-opacity" />
                                    </a>
                                    <a href="https://apps.apple.com/id/app/sapawarga-jabar-super-apps/id6443805562?l=id" target="_blank" rel="noopener noreferrer">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-10 opacity-90 hover:opacity-100 transition-opacity" />
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            <Footer />
        </main>
    );
}
