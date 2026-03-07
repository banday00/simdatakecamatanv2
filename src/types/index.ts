export type Tenant = {
    id: string;
    nama: string;
    slug: string;
    kode_wilayah: string | null;
    alamat: string | null;
    telepon: string | null;
    email: string | null;
    website: string | null;
    logo: string | null;
    favicon: string | null;
    hero_image: string | null;
    tema_warna: { primary: string; secondary: string } | null;
    social_media: Record<string, string> | null;
    meta_title: string | null;
    meta_description: string | null;
    is_active: boolean;
};

export type Kelurahan = {
    id: string;
    tenant_id: string;
    nama: string;
    slug: string;
    kode_wilayah: string | null;
    luas_km2: number | null;
    jumlah_rw: number | null;
    jumlah_rt: number | null;
    is_active: boolean;
};

export type UserProfile = {
    id: string;
    tenant_id: string;
    kelurahan_id: string | null;
    nama_lengkap: string;
    nip: string | null;
    jabatan: string | null;
    foto: string | null;
    role: "super_admin" | "admin_kecamatan" | "admin_kelurahan";
    is_active: boolean;
    last_login: string | null;
};
