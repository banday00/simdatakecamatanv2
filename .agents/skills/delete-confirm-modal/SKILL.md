---
name: delete-confirm-modal
description: Panduan komponen DeleteConfirm — modal konfirmasi hapus data di proyek SIDAKOTA. Gunakan skill ini kapanpun perlu menambah/memperbaiki dialog hapus agar konsisten dengan pola yang sudah ada.
---

# DeleteConfirm Modal — Pola & Implementasi SIDAKOTA

## Lokasi Komponen

```
src/components/ui/delete-confirm.tsx
```

## Cara Penggunaan

```tsx
import { DeleteConfirm } from "@/components/ui/delete-confirm";

// State
const [deleteRow, setDeleteRow] = useState<RowType | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);

// Handler
async function handleDelete() {
    if (!deleteRow) return;
    setIsSubmitting(true);
    try {
        await remove(deleteRow.id);
        setDeleteRow(null);
    } catch (err: any) {
        console.error("[ModuleName] handleDelete:", err);
        alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
    } finally {
        setIsSubmitting(false);
    }
}

// JSX
<DeleteConfirm
    open={!!deleteRow}
    onClose={() => setDeleteRow(null)}
    onConfirm={handleDelete}
    title="Hapus [Nama Item]"
    message={`Apakah Anda yakin ingin menghapus "${deleteRow?.nama}"?`}
    isDeleting={isSubmitting}
/>
```

## Props

| Prop | Tipe | Default | Keterangan |
|------|------|---------|-----------|
| `open` | `boolean` | — | Kontrol visibilitas modal |
| `onClose` | `() => void` | — | Dipanggil saat klik backdrop atau tombol X |
| `onConfirm` | `() => Promise<void>` | — | Dipanggil saat klik "Ya, Hapus" |
| `title` | `string` | `"Hapus Data"` | Judul dialog |
| `message` | `string` | Generic | Pesan konfirmasi, sertakan nama item yang dihapus |
| `isDeleting` | `boolean` | `false` | Nonaktifkan tombol & backdrop selama proses berjalan |

## Desain & Arsitektur

### Mengapa createPortal?
Komponen menggunakan `createPortal(...)` ke `document.body` agar modal **selalu tampil di atas semua elemen** — termasuk form modal lain yang mungkin memiliki z-index tinggi.

### Z-index Hierarchy
```
z-[200]  → DeleteConfirm (selalu paling atas)
z-[100]  → Form modals (FasilitasFormModal, dll.)
z-50     → Dropdown / Tooltip
```

### Fitur Penting
- **Backdrop penuh** `bg-slate-900/75 backdrop-blur-md` — backdrop tidak dapat diklik saat `isDeleting=true`
- **Red accent bar** di atas modal (konsisten dengan form modal lain)
- **Spinner animasi** saat menghapus
- **Tombol "Ya, Hapus"** dengan ikon `Trash2` + gradient merah
- **Tombol X** (close) dinonaktifkan saat `isDeleting=true`

## Antipattern yang HARUS Dihindari

```tsx
// ❌ JANGAN: catch kosong tanpa log/detail
} catch {
    alert("Gagal menghapus");
}

// ✅ BENAR: sertakan pesan error dari Supabase
} catch (err: any) {
    console.error("[Module] handleDelete:", err);
    alert(`Gagal menghapus: ${err?.message || 'Silakan coba lagi'}`);
}
```

```tsx
// ❌ JANGAN: DeleteConfirm tanpa title/message spesifik
<DeleteConfirm open={!!deleteRow} onClose={...} onConfirm={handleDelete} isDeleting={isSubmitting} />

// ✅ BENAR: sertakan konteks nama data yang akan dihapus
<DeleteConfirm
    open={!!deleteRow}
    onClose={() => setDeleteRow(null)}
    onConfirm={handleDelete}
    title="Hapus Lembaga"
    message={`Apakah Anda yakin ingin menghapus "${deleteRow?.nama}"?`}
    isDeleting={isSubmitting}
/>
```

## Halaman yang Menggunakan Komponen Ini

- `src/app/admin/pemerintahan/lembaga/page.tsx`
- `src/app/admin/pemerintahan/organisasi/page.tsx`
- `src/app/admin/pemerintahan/kependudukan/page.tsx`
- `src/app/admin/kesehatan/fasilitas/page.tsx`
- Dan semua halaman admin lainnya yang memiliki fitur hapus data
