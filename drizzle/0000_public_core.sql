CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin_kecamatan', 'admin_kelurahan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    password_changed_at timestamptz,
    password_reset_required boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nama text NOT NULL,
    slug text NOT NULL UNIQUE,
    kode_wilayah text,
    alamat text,
    telepon text,
    email text,
    website text,
    logo text,
    favicon text,
    hero_image text,
    tema_warna jsonb,
    social_media jsonb,
    meta_title text,
    meta_description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kelurahans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nama text NOT NULL,
    slug text NOT NULL,
    kode_wilayah text,
    luas_km2 text,
    jumlah_rw integer,
    jumlah_rt integer,
    batas_utara text,
    batas_selatan text,
    batas_timur text,
    batas_barat text,
    koordinat_kantor text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT kelurahans_tenant_slug_unique UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    kelurahan_id uuid REFERENCES kelurahans(id),
    nama_lengkap text NOT NULL,
    nip text,
    jabatan text,
    foto text,
    role user_role NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    last_login timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    current_session_id text,
    password_changed_at timestamptz,
    email text
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    tenant_id uuid REFERENCES tenants(id),
    ip_address inet,
    user_agent text,
    attempted_at timestamptz NOT NULL DEFAULT now(),
    success boolean NOT NULL DEFAULT false,
    failure_reason text,
    locked_until timestamptz
);

CREATE INDEX IF NOT EXISTS login_attempts_email_attempted_idx
    ON login_attempts (email, attempted_at DESC);

CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id),
    user_id uuid REFERENCES users(id),
    user_email text,
    user_name text,
    action text NOT NULL,
    module text,
    record_table text,
    record_id text,
    detail text,
    ip_address inet,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_tenant_created_idx
    ON activity_logs (tenant_id, created_at DESC);
