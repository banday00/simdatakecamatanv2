-- Migration: Convert social_rtlh_recipients from flat to relational model
-- Links to penduduk(id) instead of storing nama, nik, alamat, rt, rw, kelurahan_id, tenant_id directly.

-- 1. Add penduduk_id FK
ALTER TABLE social_rtlh_recipients
    ADD COLUMN IF NOT EXISTS penduduk_id uuid REFERENCES public.penduduk(id) ON DELETE CASCADE;

-- 2. Drop flat identity columns (nama, nik, alamat, rt, rw)
ALTER TABLE social_rtlh_recipients
    DROP COLUMN IF EXISTS nama,
    DROP COLUMN IF EXISTS nik,
    DROP COLUMN IF EXISTS alamat,
    DROP COLUMN IF EXISTS rt,
    DROP COLUMN IF EXISTS rw;

-- 3. Drop kelurahan_id and tenant_id (now derived via penduduk → keluarga)
ALTER TABLE social_rtlh_recipients
    DROP COLUMN IF EXISTS kelurahan_id,
    DROP COLUMN IF EXISTS tenant_id;

-- 4. Set NOT NULL after migration
ALTER TABLE social_rtlh_recipients
    ALTER COLUMN penduduk_id SET NOT NULL;

-- 5. Unique constraint: one penduduk per tahun+kategori
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rtlh_penduduk_tahun_kategori_unique') THEN
        ALTER TABLE social_rtlh_recipients
            ADD CONSTRAINT rtlh_penduduk_tahun_kategori_unique UNIQUE (penduduk_id, tahun, kategori);
    END IF;
END $$;

-- 6. Index
CREATE INDEX IF NOT EXISTS rtlh_penduduk_idx ON social_rtlh_recipients (penduduk_id);

-- 7. Updated_at trigger
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_social_rtlh_recipients_updated_at') THEN
        CREATE TRIGGER trg_social_rtlh_recipients_updated_at
            BEFORE UPDATE ON public.social_rtlh_recipients
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;
END $$;
