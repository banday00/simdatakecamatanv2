---
description: Panduan Pembuatan Custom Form Modal (Gaya SIDAKOTA)
---
# Panduan Pembuatan Custom Form Modal

Workflow ini menjelaskan arsitektur dan panduan penerapan *Custom Form Modal* dengan gaya UI elegan yang telah diterapkan pada halaman Profil dan Lembaga SIDAKOTA, sehingga mudah untuk diduplikasi/dipanggil lagi di halaman lain.

## 1. Struktur Dasar Modal & Portal
Selalu gunakan `createPortal` dari `react-dom` agar modal dirender di `document.body`. Gunakan latar belakang (_backdrop_) gelap dengan efek *blur*.
```tsx
import { createPortal } from "react-dom";

return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />
        
        {/* Modal Container */}
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
            {/* ... Modal content ... */}
        </div>
    </div>,
    document.body
);
```

## 2. Aksen Gradient Header
Tambahkan garis *gradient* di bagian paling atas form modal untuk memberikan kesan premium. Warna bisa disesuaikan dengan konteks fitur (misal: teal untuk Profil, biru-ungu untuk Lembaga).
```tsx
{/* Gradient accent */}
<div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />
```

## 3. Title Header & Ikon
Gunakan *icon box* dengan latar belakang gradient yang senada dengan garis aksen di atasnya, diletakkan berdampingan dengan judul modal.
```tsx
<div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
    <div className="flex items-center gap-4">
        {/* Icon Box */}
        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
            <Building2 className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-gray-900">Judul Modal</h2>
            <p className="text-sm text-gray-500 mt-0.5">Deskripsi singkat fungsi modal ini.</p>
        </div>
    </div>
</div>
```

## 4. Layout 2 Kolom (Grid Base)
Untuk form yang memiliki banyak *field*, gunakan layout 2-kolom memisahkan Informasi Dasar (Konteks) dengan Detail Isian menggunakan grid (misal rasio 2:3 `lg:grid-cols-5`).
```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
    {/* Kolom Kiri - Konteks Form (lg:col-span-2) */}
    <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <MapPin className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi Dasar</span>
        </div>
        {/* Form Fields Kiri ... */}
    </div>

    {/* Kolom Kanan - Detail Form (lg:col-span-3) */}
    <div className="lg:col-span-3 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <Users className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detail Data</span>
        </div>
        {/* Form Fields Kanan ... */}
    </div>
</div>
```

## 5. Form Control & Styling
Gunakan susunan _label_ modern dipadu dengan input _rounded_ bersudut besar (`rounded-xl`):
```tsx
<div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        Nama Field <span className="text-red-500">*</span>
    </label>
    <input
        type="text"
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
        placeholder="Contoh Isian"
    />
</div>
```

## 6. Footer Layout Responsif
Pastikan tombol aksi (Simpan & Batal) menyesuaikan layar: pada _mobile_ tombol tampil 100% lebar layar dan berjajar vertikal (`flex-col-reverse`), sedangkan di _desktop_ berjajar horizontal merapat ke kanan (`sm:flex-row`).
```tsx
<div className="flex items-center justify-between px-6 py-4 md:px-8 border-t border-gray-100 bg-white shrink-0">
    <p className="text-xs text-gray-400">
        <span className="text-red-400">*</span> Wajib diisi
    </p>
    <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
        <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors"
        >
            Batal
        </button>
        <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Perubahan
        </button>
    </div>
</div>
```

> **Referensi File:** Anda dapat melihat `src/app/admin/pemerintahan/lembaga/page.tsx` atau `src/app/admin/pemerintahan/profil/page.tsx` untuk susunan *code* lengkap dengan tipe data *React*.
