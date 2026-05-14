"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ChevronLeft, HelpCircle, ChevronDown, MessageCircleQuestion } from "lucide-react";

const FAQ_DATA = [
    {
        category: "Tentang SIMDATA Kecamatan",
        items: [
            {
                q: "Apa itu SIMDATA Kecamatan?",
                a: "SIMDATA Kecamatan (Sistem Informasi dan Manajemen Data Kecamatan) adalah portal data terpadu untuk mengeksplorasi potensi, infrastruktur, kependudukan, dan profil setiap kelurahan secara komprehensif dan real-time."
            },
            {
                q: "Siapa yang mengelola SIMDATA Kecamatan?",
                a: "Platform ini dikelola oleh Pemerintah Kecamatan berkolaborasi dengan aparatur dari masing-masing kelurahan yang secara rutin melakukan pemutakhiran data operasional dan statistik wilayah."
            },
            {
                q: "Seberapa sering data di dalam platform ini diperbarui?",
                a: "Sebagian besar data diperbarui secara berkala (bulanan atau tahunan) tergantung pada jenis modul datanya. Modul seperti kependudukan dan insiden keamanan diperbarui secara real-time saat ada laporan atau perubahan status dari operator kelurahan."
            }
        ]
    },
    {
        category: "Modul Data & Fitur Umum",
        items: [
            {
                q: "Apa saja kategori data yang tersedia?",
                a: "Saat ini SIMDATA Kecamatan mencakup 7 (tujuh) kategori utama: Pemerintahan, Kesehatan, Pendidikan, Infrastruktur, Sosial, Ketentraman & Ketertiban, serta Ekonomi."
            },
            {
                q: "Darimana sumber data yang ditampilkan?",
                a: "Seluruh data dihimpun secara langsung oleh aparatur kelurahan melalui panel admin SIMDATA dan divalidasi oleh instansi tingkat kecamatan atau dinas terkait untuk memastikan akurasi data."
            },
            {
                q: "Apakah data ini bisa diunduh untuk keperluan penelitian?",
                a: "Saat ini data disajikan dalam bentuk dashboard analitik interaktif. Fitur untuk mengunduh raw dataset publik (Open Data) sedang dalam tahap pengembangan dan akan segera dirilis pada pembaruan mendatang."
            }
        ]
    },
    {
        category: "Istilah & Metodologi Kependudukan",
        items: [
            {
                q: "Apa itu Kepadatan Penduduk dan bagaimana menghitungnya?",
                a: "Kepadatan Penduduk adalah rasio jumlah populasi terhadap luas wilayah. Di SIMDATA, perhitungan didapatkan dari Total Penduduk / Luas Wilayah (kmÂ²)."
            },
            {
                q: "Apa perbedaan RT dan RW dalam statistik wilayah?",
                a: "RT (Rukun Tetangga) merupakan pembagian wilayah di bawah RW, sedangkan RW (Rukun Warga) membawahi beberapa RT. Data jumlah ini menjadi indikator jangkauan administrasi kelurahan."
            }
        ]
    },
    {
        category: "Istilah & Metodologi Kesehatan & Pendidikan",
        items: [
            {
                q: "Apa itu Kasus Stunting dan bagaimana cara perhitungannya?",
                a: "Stunting adalah kondisi gagal tumbuh pada balita. Dalam dashboard ini, persentase stunting dihitung berdasarkan (Jumlah Balita Stunting / Total Balita yang Diukur) Ã— 100%."
            },
            {
                q: "Apa yang dimaksud dengan Rasio Posyandu?",
                a: "Rasio ini menunjukkan ketersediaan layanan kesehatan dasar per populasi balita, diukur dari Jumlah Posyandu Aktif berbanding Populasi Balita."
            },
            {
                q: "Bagaimana Rasio Guru-Murid dihitung?",
                a: "Rasio Guru-Murid mencerminkan beban mengajar setiap guru, diperolah dari pembagian Total Siswa / Total Guru pada tingkat satuan pendidikan bersangkutan. Angka ideal bervariasi bergantung tingkat pendidikannya (SD, SMP, atau SMA)."
            },
            {
                q: "Apa pengertian dari Angka Partisipasi Sekolah (APS)?",
                a: "Data persentase anak usia sekolah yang sedang atau telah menempuh pendidikan di suatu wilayah kelurahan pada jenjang pendidikan tertentu."
            }
        ]
    },
    {
        category: "Istilah & Metodologi Infrastruktur & Sosial",
        items: [
            {
                q: "Bagaimana status persentase kondisi jalan (\"Mantap\") diukur?",
                a: "Kondisi \"Mantap\" mengacu pada kondisi jalan kategori Baik dan Sedang. Persentasenya adalah ((Jalan Baik + Jalan Sedang) / Total Panjang Jalan) Ã— 100%."
            },
            {
                q: "Apa kriteria dari RTLH (Rumah Tidak Layak Huni)?",
                a: "Hunian yang tidak memenuhi standar keselamatan bangunan, kecukupan ruang minimum, maupun akses sanitasi dan air bersih yang layak."
            },
            {
                q: "Apa definisi PMKS (Penyandang Masalah Kesejahteraan Sosial)?",
                a: "Warga yang mengalami hambatan, kesulitan, atau gangguan fungsi sosial sehingga tidak dapat memenuhi kebutuhan dasarnya baik jasmani, rohani, maupun sosial secara mandiri (contoh: lansia terlantar, anak jalanan, disabilitas kurang mampu)."
            },
            {
                q: "Apa kriteria Penerima Bantuan Sosial?",
                a: "Keluarga atau individu yang terverifikasi dalam DTKS (Data Terpadu Kesejahteraan Sosial) berdasarkan kriteria kerentanan ekonomi yang dievaluasi secara berkala."
            }
        ]
    },
    {
        category: "Istilah & Metodologi Ketentraman, Ketertiban & Ekonomi",
        items: [
            {
                q: "Bagaimana perhitungan Indeks Kerentanan Keamanan (IKK) atau Tingkat Risiko pada Zona Rawan?",
                a: "IKK adalah sistem skoring (0-100) berdasarkan pembobotan tingkat keparahan suatu insiden/zona. Risiko Tinggi bernilai 1.0 (bobot 3), Sedang 0.6 (bobot 2), dan Rendah 0.3 (bobot 1). Skoring dinormalisasi terhadap wilayah dengan kerentanan tertinggi."
            },
            {
                q: "Siapa itu Kader Keamanan (misal: Linmas, FKDM)?",
                a: "Warga masyarakat yang diberdayakan untuk membantu penanganan ketentraman masyarakat (Linmas) serta deteksi dini terhadap ancaman/gangguan keamanan di tingkat kelurahan (FKDM)."
            },
            {
                q: "Bagaimana cara membaca grafik Fluktuasi Harga Pangan?",
                a: "Grafik ini menampilkan rata-rata pergerakan harga komoditas (misal: beras, telur) di pasar-pasar tradisional. Tren harga dihitung dari rata-rata pelaporan mingguan di setiap pasar."
            },
            {
                q: "Apa definisi dari Industri Kecil dan Menengah (IKM) pada dashboard ini?",
                a: "Usaha produktif milik warga (Wirausaha) yang diklasifikasikan berdasarkan jumlah tenaga kerja dan modal usaha. Klasifikasinya mencakup kategori Mikro, Kecil, dan Menengah."
            }
        ]
    }
];

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<string | null>("0-0");

    const toggleAccordion = (id: string) => {
        setOpenIndex(openIndex === id ? null : id);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col">
            {/* â”€â”€â”€ Header â”€â”€â”€ */}
            <header className="relative overflow-x-clip text-white bg-digital-batik shrink-0 flex-shrink-0">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />

                <Navbar />

                <div className="relative z-10 px-6 pt-8 pb-32 max-w-4xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm font-medium mb-6 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Beranda
                    </Link>
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
                            <MessageCircleQuestion className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                Pusat Bantuan
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">FAQ</h1>
                            <p className="mt-2 text-lg text-white/70 max-w-2xl leading-relaxed">
                                Pertanyaan umum seputar SIMDATA Kecamatan dan panduan penggunaan data.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* â”€â”€â”€ FAQ Content â”€â”€â”€ */}
            <main className="px-6 w-full max-w-4xl mx-auto -mt-16 relative z-20 pb-20 flex-1">
                <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/5 border border-slate-100 p-6 md:p-10">
                    <div className="space-y-10">
                        {FAQ_DATA.map((section, sIdx) => (
                            <div key={sIdx}>
                                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">0{sIdx + 1}</span>
                                    {section.category}
                                </h2>
                                <div className="space-y-4">
                                    {section.items.map((item, iIdx) => {
                                        const id = `${sIdx}-${iIdx}`;
                                        const isOpen = openIndex === id;
                                        return (
                                            <div
                                                key={iIdx}
                                                className={`border rounded-2xl transition-all duration-200 overflow-hidden ${isOpen ? 'border-indigo-200 bg-indigo-50/30 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                            >
                                                <button
                                                    onClick={() => toggleAccordion(id)}
                                                    className="w-full flex items-center justify-between p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-2xl"
                                                >
                                                    <span className={`font-bold text-[15px] pr-8 ${isOpen ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                        {item.q}
                                                    </span>
                                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </button>
                                                <div
                                                    className={`transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'} grid`}
                                                >
                                                    <div className="overflow-hidden">
                                                        <div className="p-5 pt-0 text-slate-600 text-[15px] leading-relaxed border-t border-indigo-100/50 mt-1">
                                                            {item.a}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 bg-slate-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-100">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1">Masih punya pertanyaan?</h3>
                            <p className="text-slate-500 text-sm">Tim pusat bantuan kami siap membantu menjawab pertanyaan Anda yang tidak tercantum di atas.</p>
                        </div>
                        <button className="whitespace-nowrap px-6 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-700 font-bold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/20">
                            Hubungi Kami
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

