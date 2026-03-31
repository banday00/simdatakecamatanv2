-- Migration: Kelompok umur + semester pada tabel edu_participation
-- Tanggal: 2026-03-30

-- Kelompok umur SD/MI: 7-12 tahun
ALTER TABLE sidakota.edu_participation
    ADD COLUMN IF NOT EXISTS jumlah_usia_7_12  INTEGER NOT NULL DEFAULT 0;

-- Kelompok umur SMP/MTs: 13-15 tahun
ALTER TABLE sidakota.edu_participation
    ADD COLUMN IF NOT EXISTS jumlah_usia_13_15 INTEGER NOT NULL DEFAULT 0;

-- Kelompok umur SMA/SMK: 16-18 tahun
ALTER TABLE sidakota.edu_participation
    ADD COLUMN IF NOT EXISTS jumlah_usia_16_18 INTEGER NOT NULL DEFAULT 0;

-- Semester dalam format gabungan (tahun*10+semester, misal 20251)
ALTER TABLE sidakota.edu_participation
    ADD COLUMN IF NOT EXISTS semester INTEGER NOT NULL DEFAULT 0;

-- Hapus kolom yang tidak diperlukan (data siswa diambil dari edu_facilities)
ALTER TABLE sidakota.edu_participation
    DROP COLUMN IF EXISTS jumlah_usia_7_12_sekolah,
    DROP COLUMN IF EXISTS jumlah_usia_13_15_sekolah,
    DROP COLUMN IF EXISTS jumlah_usia_16_18_sekolah;

COMMENT ON COLUMN sidakota.edu_participation.jumlah_usia_7_12  IS 'Jumlah penduduk usia 7-12 tahun (Kelompok Umur SD/MI)';
COMMENT ON COLUMN sidakota.edu_participation.jumlah_usia_13_15 IS 'Jumlah penduduk usia 13-15 tahun (Kelompok Umur SMP/MTs)';
COMMENT ON COLUMN sidakota.edu_participation.jumlah_usia_16_18 IS 'Jumlah penduduk usia 16-18 tahun (Kelompok Umur SMA/SMK)';
COMMENT ON COLUMN sidakota.edu_participation.semester IS 'Semester dalam format gabungan tahun+semester, misal 20251 = Tahun 2025 Semester 1';
