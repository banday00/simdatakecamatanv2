
-- 1. Seed Tenants
INSERT INTO sidakota.tenants (nama, slug, kode_wilayah, alamat, email)
VALUES ('Kecamatan Bogor Utara', 'bogorutara', '32.71.05', 'Jl. Gagalur No. 2', 'kec.bogorutara@kotabogor.go.id')
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Kelurahans
DO $$
DECLARE
    t_id UUID;
BEGIN
    SELECT id INTO t_id FROM sidakota.tenants WHERE slug = 'bogorutara';

    INSERT INTO sidakota.kelurahans (tenant_id, nama, slug, kode_wilayah)
    VALUES
    (t_id, 'Cibuluh', 'cibuluh', '32.71.05.1001'),
    (t_id, 'Tegal Gundil', 'tegalgundil', '32.71.05.1002'),
    (t_id, 'Bantarjati', 'bantarjati', '32.71.05.1003'),
    (t_id, 'Kedung Halang', 'kedunghalang', '32.71.05.1004'),
    (t_id, 'Ciparigi', 'ciparigi', '32.71.05.1005'),
    (t_id, 'Cimahpar', 'cimahpar', '32.71.05.1006'),
    (t_id, 'Tanah Baru', 'tanahbaru', '32.71.05.1007'),
    (t_id, 'Kedung Jaya', 'kedungjaya', '32.71.05.1008')
    ON CONFLICT (slug, tenant_id) DO NOTHING;
END $$;

-- 3. Seed Govt Population (2023-2025)
DO $$
DECLARE
    t_id UUID;
    k_rec RECORD;
    year INT;
    pop INT;
BEGIN
    SELECT id INTO t_id FROM sidakota.tenants WHERE slug = 'bogorutara';
    
    FOR k_rec IN SELECT id, nama FROM sidakota.kelurahans WHERE tenant_id = t_id LOOP
        FOR year IN 2023..2025 LOOP
            -- Random growth
            pop := (12000 + (year - 2023) * 500 + random() * 1000)::INT;
            
            INSERT INTO sidakota.gov_population (tenant_id, kelurahan_id, tahun, bulan, jumlah_penduduk, jumlah_kk, laki_laki, perempuan)
            VALUES (
                t_id,
                k_rec.id,
                year,
                12,
                pop,
                (pop / 3.5)::INT,
                (pop * 0.51)::INT,
                (pop * 0.49)::INT
            )
            ON CONFLICT (tenant_id, kelurahan_id, tahun, bulan) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 4. Seed Health Stunting (2023-2025)
DO $$
DECLARE
    t_id UUID;
    k_rec RECORD;
    year INT;
    balita INT;
    stunting INT;
BEGIN
    SELECT id INTO t_id FROM sidakota.tenants WHERE slug = 'bogorutara';
    
    FOR k_rec IN SELECT id, nama FROM sidakota.kelurahans WHERE tenant_id = t_id LOOP
        FOR year IN 2023..2025 LOOP
            balita := (800 + random() * 200)::INT;
            -- Decrease stunting over years
            stunting := (balita * (0.15 - (year - 2023) * 0.03))::INT; 
            
            INSERT INTO sidakota.health_stunting (tenant_id, kelurahan_id, tahun, jumlah_balita, jumlah_stunting, prevalensi_stunting)
            VALUES (
                t_id,
                k_rec.id,
                year,
                balita,
                stunting,
                round((stunting::numeric / balita * 100), 2)
            )
            ON CONFLICT (tenant_id, kelurahan_id, tahun) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 5. Seed Infra Sanitation (2023-2025)
DO $$
DECLARE
    t_id UUID;
    k_rec RECORD;
    year INT;
BEGIN
    SELECT id INTO t_id FROM sidakota.tenants WHERE slug = 'bogorutara';
    
    FOR k_rec IN SELECT id, nama FROM sidakota.kelurahans WHERE tenant_id = t_id LOOP
        FOR year IN 2023..2025 LOOP
            INSERT INTO sidakota.infra_sanitation (tenant_id, kelurahan_id, tahun, akses_sanitasi_layak_pct, akses_air_bersih_pct, jamban_sehat_count)
            VALUES (
                t_id,
                k_rec.id,
                year,
                round((75 + (year - 2023) * 5 + random() * 5)::numeric, 2), -- 75-90%
                round((80 + (year - 2023) * 4 + random() * 5)::numeric, 2), -- 80-95%
                (2000 + random() * 500)::INT
            )
            ON CONFLICT (tenant_id, kelurahan_id, tahun) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 6. Seed Social RTLH (2024 only)
DO $$
DECLARE
    t_id UUID;
    k_rec RECORD;
BEGIN
    SELECT id INTO t_id FROM sidakota.tenants WHERE slug = 'bogorutara';
    
    FOR k_rec IN SELECT id, nama FROM sidakota.kelurahans WHERE tenant_id = t_id LOOP
        INSERT INTO sidakota.social_rtlh (tenant_id, kelurahan_id, tahun, jumlah_rtlh, jumlah_tertangani)
        VALUES (
            t_id,
            k_rec.id,
            2024,
            (random() * 50 + 10)::INT,
            (random() * 10)::INT
        )
        ON CONFLICT (tenant_id, kelurahan_id, tahun) DO NOTHING;
    END LOOP;
END $$;
