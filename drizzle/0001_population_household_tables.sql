CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.keluarga (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    kelurahan_id uuid NOT NULL REFERENCES public.kelurahans(id) ON DELETE CASCADE,
    no_kk text NOT NULL,
    alamat text,
    rw text,
    rt text,
    desil_nasional integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT keluarga_no_kk_unique UNIQUE (no_kk),
    CONSTRAINT keluarga_no_kk_check CHECK (no_kk ~ '^[0-9]{16}$'),
    CONSTRAINT keluarga_rt_check CHECK (rt IS NULL OR rt ~ '^[0-9]{1,3}$'),
    CONSTRAINT keluarga_rw_check CHECK (rw IS NULL OR rw ~ '^[0-9]{1,3}$'),
    CONSTRAINT keluarga_desil_nasional_check CHECK (
        desil_nasional IS NULL OR desil_nasional BETWEEN 1 AND 10
    )
);

CREATE TABLE IF NOT EXISTS public.penduduk (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    keluarga_id uuid NOT NULL REFERENCES public.keluarga(id) ON DELETE CASCADE,
    nik text NOT NULL,
    nama text NOT NULL,
    jenis_kelamin text,
    tanggal_lahir date,
    tempat_lahir text,
    status_perkawinan text,
    hubungan_keluarga text,
    nama_ibu_kandung text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT penduduk_nik_unique UNIQUE (nik),
    CONSTRAINT penduduk_nik_check CHECK (nik ~ '^[0-9]{16}$'),
    CONSTRAINT penduduk_jenis_kelamin_check CHECK (
        jenis_kelamin IS NULL
        OR lower(jenis_kelamin) IN ('l', 'p', 'laki-laki', 'perempuan')
    )
);

CREATE TABLE IF NOT EXISTS public.master_disabilitas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_disabilitas text NOT NULL,
    keterangan text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT master_disabilitas_nama_unique UNIQUE (nama_disabilitas)
);

CREATE TABLE IF NOT EXISTS public.penduduk_disabilitas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    penduduk_id uuid NOT NULL REFERENCES public.penduduk(id) ON DELETE CASCADE,
    disabilitas_id uuid NOT NULL REFERENCES public.master_disabilitas(id) ON DELETE RESTRICT,
    keterangan_disabilitas text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT penduduk_disabilitas_unique UNIQUE (penduduk_id, disabilitas_id)
);

CREATE TABLE IF NOT EXISTS public.master_bantuan (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_bantuan text NOT NULL,
    keterangan text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT master_bantuan_nama_unique UNIQUE (nama_bantuan)
);

CREATE TABLE IF NOT EXISTS public.penduduk_bantuan (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    penduduk_id uuid NOT NULL REFERENCES public.penduduk(id) ON DELETE CASCADE,
    bantuan_id uuid NOT NULL REFERENCES public.master_bantuan(id) ON DELETE RESTRICT,
    status_penerima boolean NOT NULL DEFAULT true,
    keterangan text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT penduduk_bantuan_unique UNIQUE (penduduk_id, bantuan_id)
);

CREATE INDEX IF NOT EXISTS keluarga_tenant_kelurahan_idx
    ON public.keluarga (tenant_id, kelurahan_id);

CREATE INDEX IF NOT EXISTS keluarga_kelurahan_idx
    ON public.keluarga (kelurahan_id);

CREATE INDEX IF NOT EXISTS penduduk_keluarga_idx
    ON public.penduduk (keluarga_id);

CREATE INDEX IF NOT EXISTS penduduk_disabilitas_disabilitas_idx
    ON public.penduduk_disabilitas (disabilitas_id);

CREATE INDEX IF NOT EXISTS penduduk_bantuan_bantuan_idx
    ON public.penduduk_bantuan (bantuan_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_keluarga_updated_at') THEN
        CREATE TRIGGER trg_keluarga_updated_at
            BEFORE UPDATE ON public.keluarga
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_penduduk_updated_at') THEN
        CREATE TRIGGER trg_penduduk_updated_at
            BEFORE UPDATE ON public.penduduk
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_master_disabilitas_updated_at') THEN
        CREATE TRIGGER trg_master_disabilitas_updated_at
            BEFORE UPDATE ON public.master_disabilitas
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_penduduk_disabilitas_updated_at') THEN
        CREATE TRIGGER trg_penduduk_disabilitas_updated_at
            BEFORE UPDATE ON public.penduduk_disabilitas
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_master_bantuan_updated_at') THEN
        CREATE TRIGGER trg_master_bantuan_updated_at
            BEFORE UPDATE ON public.master_bantuan
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_penduduk_bantuan_updated_at') THEN
        CREATE TRIGGER trg_penduduk_bantuan_updated_at
            BEFORE UPDATE ON public.penduduk_bantuan
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
    END IF;
END $$;

INSERT INTO public.master_bantuan (nama_bantuan) VALUES
    ('PBI JK'),
    ('Bansos PKH'),
    ('Bansos Sembako')
ON CONFLICT (nama_bantuan) DO NOTHING;

INSERT INTO public.master_disabilitas (nama_disabilitas) VALUES
    ('Disabilitas Fisik'),
    ('Disabilitas Netra'),
    ('Disabilitas Rungu'),
    ('Disabilitas Wicara'),
    ('Disabilitas Mental'),
    ('Disabilitas Intelektual'),
    ('Disabilitas Ganda')
ON CONFLICT (nama_disabilitas) DO NOTHING;
