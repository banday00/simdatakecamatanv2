import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center">
                <h1 className="text-8xl font-bold text-primary-200 mb-4">404</h1>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Halaman Tidak Ditemukan
                </h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Kecamatan yang Anda cari tidak terdaftar atau halaman tidak tersedia.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
                >
                    Kembali ke Beranda
                </Link>
            </div>
        </div>
    );
}
