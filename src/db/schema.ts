import {
    boolean,
    inet,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
    "super_admin",
    "admin_kecamatan",
    "admin_kelurahan",
]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    passwordResetRequired: boolean("password_reset_required").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenants = pgTable("tenants", {
    id: uuid("id").defaultRandom().primaryKey(),
    nama: text("nama").notNull(),
    slug: text("slug").notNull().unique(),
    kodeWilayah: text("kode_wilayah"),
    alamat: text("alamat"),
    telepon: text("telepon"),
    email: text("email"),
    website: text("website"),
    logo: text("logo"),
    favicon: text("favicon"),
    heroImage: text("hero_image"),
    temaWarna: jsonb("tema_warna").$type<{ primary: string; secondary: string } | null>(),
    socialMedia: jsonb("social_media").$type<Record<string, string> | null>(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kelurahans = pgTable(
    "kelurahans",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
        nama: text("nama").notNull(),
        slug: text("slug").notNull(),
        kodeWilayah: text("kode_wilayah"),
        luasKm2: text("luas_km2"),
        jumlahRw: integer("jumlah_rw"),
        jumlahRt: integer("jumlah_rt"),
        batasUtara: text("batas_utara"),
        batasSelatan: text("batas_selatan"),
        batasTimur: text("batas_timur"),
        batasBarat: text("batas_barat"),
        koordinatKantor: text("koordinat_kantor"),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        tenantSlugUnique: uniqueIndex("kelurahans_tenant_slug_unique").on(table.tenantId, table.slug),
    })
);

export const userProfiles = pgTable("user_profiles", {
    id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    kelurahanId: uuid("kelurahan_id").references(() => kelurahans.id),
    namaLengkap: text("nama_lengkap").notNull(),
    nip: text("nip"),
    jabatan: text("jabatan"),
    foto: text("foto"),
    role: userRoleEnum("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    currentSessionId: text("current_session_id"),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    email: text("email"),
});

export const loginAttempts = pgTable("login_attempts", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
    success: boolean("success").notNull().default(false),
    failureReason: text("failure_reason"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

export const activityLogs = pgTable("activity_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    userId: uuid("user_id").references(() => users.id),
    userEmail: text("user_email"),
    userName: text("user_name"),
    action: text("action").notNull(),
    module: text("module"),
    recordTable: text("record_table"),
    recordId: text("record_id"),
    detail: text("detail"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
