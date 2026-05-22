"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useTenant } from "@/lib/tenant/context";
import { stripTenantPath } from "@/lib/tenant/path";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    Landmark,
    Heart,
    GraduationCap,
    TrendingUp,
    Building2,
    HandHeart,
    Shield,
    Newspaper,
    Map,
    Settings,
    Users,
    Users2,
    LogOut,
    ChevronDown,
    Menu,
    X,
    Home,
    GitCompareArrows,
    Bell,
    Search,
    Key,
    Lock,
    Loader2,
    Save,
    Activity,
    DatabaseBackup,
} from "lucide-react";

const navGroups = [
    {
        title: "UTAMA",
        items: [
            { label: "Dashboard", href: "/admin", icon: BarChart3 },
        ],
    },
    {
        title: "MODUL DATA",
        items: [
            {
                label: "Pemerintahan", href: "/admin/pemerintahan", icon: Landmark,
                children: [
                    { label: "Profil", href: "/admin/pemerintahan/profil" },
                    { label: "Lembaga", href: "/admin/pemerintahan/lembaga" },
                    { label: "Organisasi", href: "/admin/pemerintahan/organisasi" },
                ],
            },
            {
                label: "Kependudukan", href: "/admin/pemerintahan/kependudukan", icon: Users2,
                children: [
                    { label: "Ringkasan", href: "/admin/pemerintahan/kependudukan?tab=summary" },
                    { label: "Kelompok Umur", href: "/admin/pemerintahan/kependudukan?tab=kelompok_umur" },
                    { label: "Umur Tunggal", href: "/admin/pemerintahan/kependudukan?tab=umur_tunggal" },
                    { label: "Agama", href: "/admin/pemerintahan/kependudukan?tab=agama" },
                    { label: "Pendidikan", href: "/admin/pemerintahan/kependudukan?tab=pendidikan" },
                    { label: "Pekerjaan", href: "/admin/pemerintahan/kependudukan?tab=pekerjaan" },
                    { label: "Status Kawin", href: "/admin/pemerintahan/kependudukan?tab=status_kawin" },
                    { label: "Gol. Darah", href: "/admin/pemerintahan/kependudukan?tab=golongan_darah" },
                    { label: "Dokumen KTP", href: "/admin/pemerintahan/kependudukan?tab=ktp" },
                    { label: "Dokumen KIA", href: "/admin/pemerintahan/kependudukan?tab=kia" },
                    { label: "Akta Lahir", href: "/admin/pemerintahan/kependudukan?tab=akta" },
                ],
            },
            {
                label: "Kesehatan", href: "/admin/kesehatan", icon: Heart,
                children: [
                    { label: "Fasilitas", href: "/admin/kesehatan/fasilitas" },
                    { label: "Stunting", href: "/admin/kesehatan/stunting" },
                    { label: "Posyandu", href: "/admin/kesehatan/posyandu" },
                    { label: "Ibu & Anak", href: "/admin/kesehatan/maternal" },
                ],
            },
            {
                label: "Pendidikan", href: "/admin/pendidikan", icon: GraduationCap,
                children: [
                    { label: "Sarana", href: "/admin/pendidikan/sarana" },
                    { label: "Partisipasi", href: "/admin/pendidikan/partisipasi" },
                ],
            },
            {
                label: "Ekonomi", href: "/admin/ekonomi", icon: TrendingUp,
                children: [
                    { label: "Sarana", href: "/admin/ekonomi/sarana" },
                    { label: "Potensi", href: "/admin/ekonomi/potensi" },
                    { label: "Sektor Usaha", href: "/admin/ekonomi/sektor-usaha" },
                ],
            },
            {
                label: "Infrastruktur", href: "/admin/infrastruktur", icon: Building2,
                children: [
                    { label: "Olahraga", href: "/admin/infrastruktur/olahraga" },
                    { label: "Sanitasi", href: "/admin/infrastruktur/sanitasi" },
                    { label: "Pembangunan", href: "/admin/infrastruktur/pembangunan" },
                ],
            },
            {
                label: "Sosial", href: "/admin/sosial", icon: HandHeart,
                children: [
                    { label: "Bantuan", href: "/admin/sosial/bantuan" },
                    { label: "Disabilitas", href: "/admin/sosial/disabilitas" },
                    { label: "RTLH", href: "/admin/sosial/perumahan" },
                    { label: "Keagamaan", href: "/admin/sosial/keagamaan" },
                    { label: "Master Disabilitas", href: "/admin/sosial/master-disabilitas" },
                    { label: "Master Bantuan", href: "/admin/sosial/master-bantuan" },
                ],
            },
            {
                label: "Ketentraman", href: "/admin/ketentraman", icon: Shield,
                children: [
                    { label: "Kader", href: "/admin/ketentraman/kader" },
                    { label: "Rawan Bencana", href: "/admin/ketentraman/bencana" },
                    { label: "Insiden", href: "/admin/ketentraman/insiden" },

                ],
            },
        ],
    },
    {
        title: "ANALISIS",
        items: [
            // { label: "Berita", href: "/admin/berita", icon: Newspaper },
            // { label: "WebGIS", href: "/admin/peta", icon: Map },
            { label: "Perbandingan", href: "/admin/perbandingan", icon: GitCompareArrows },
            { label: "Analisis Tren", href: "/admin/tren", icon: TrendingUp },
        ],
    },

    {
        title: "PENGATURAN",
        items: [
            { label: "Pengguna", href: "/admin/pengguna", icon: Users },
            { label: "Backup database", href: "/admin/backup-database", icon: DatabaseBackup },
            { label: "Log Aktivitas", href: "/admin/log-aktivitas", icon: Activity },
        ],
    },
];

// Flatten for header title lookup
const allNavItems = navGroups.flatMap(g => g.items);

type NavItem = (typeof allNavItems)[number];

function SidebarItem({ item, pathname, searchString, toTenantPath }: { item: NavItem; pathname: string; searchString: string; toTenantPath: (href: string) => string }) {
    // Helper: check if a href (potentially with ?query) matches current location
    function isHrefActive(href: string): boolean {
        const [hPath, hQuery] = href.split("?");
        if (hQuery) {
            // Must match path AND have matching query param
            return pathname === hPath && searchString.includes(hQuery);
        }
        return pathname === href || pathname.startsWith(href + "/");
    }

    const isActive =
        isHrefActive(item.href) ||
        (item as any).children?.some((c: any) => isHrefActive(c.href));
    const hasChildren = (item as any).children?.length > 0;
    const [open, setOpen] = useState(isActive);

    return (
        <div>
            <Link
                href={toTenantPath(hasChildren ? (item as any).children[0].href : item.href)}
                className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] transition-all duration-150",
                    isActive
                        ? "bg-sky-100 text-sky-900 font-semibold shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
                onClick={(e) => {
                    if (hasChildren) {
                        e.preventDefault();
                        setOpen(!open);
                    }
                }}
            >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                    <ChevronDown
                        className={cn(
                            "w-3.5 h-3.5 transition-transform duration-200",
                            open && "rotate-180"
                        )}
                    />
                )}
            </Link>
            {hasChildren && open && (
                <div className="ml-9 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
                    {(item as any).children.map((child: any) => (
                        <Link
                            key={child.href}
                            href={toTenantPath(child.href)}
                            className={cn(
                                "block px-3 py-1.5 rounded-md text-[12px] transition-colors",
                                isHrefActive(child.href)
                                    ? "bg-sky-50 text-sky-800 font-semibold"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            )}
                        >
                            {child.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={null}>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </Suspense>
    );
}

function AdminLayoutInner({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const searchString = searchParams.toString();
    const router = useRouter();
    const { profile, user, signOut } = useAuth();
    const { tenant } = useTenant();
    const toTenantPath = useTenantPath();
    const appPathname = stripTenantPath(pathname, tenant?.slug);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Single-session enforcement: kick user if another device logs in
    useSessionGuard();

    // Add reference for auto-logout timer
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleSignOut = useCallback(async () => {
        await signOut();
        router.push(toTenantPath("/login"));
    }, [signOut, router, toTenantPath]);

    useEffect(() => {
        if (!tenant || !profile) return;
        if (profile.role === "executive_dashboard") {
            router.replace(toTenantPath("/executive"));
            return;
        }
        if (profile.role !== "super_admin" && profile.tenant_id !== tenant.id) {
            router.replace(toTenantPath("/"));
        }
    }, [profile, router, tenant, toTenantPath]);

    // Setup auto-logout on 15 mins idle
    const resetLogoutTimer = useCallback(() => {
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
        }

        // 15 minutes = 15 * 60 * 1000 = 900000 ms
        logoutTimerRef.current = setTimeout(() => {
            handleSignOut();
        }, 900000);
    }, [handleSignOut]);

    // Hard forced re-authentication after 12 hours (43200000 ms)
    useEffect(() => {
        const SESSION_MAX_LIFETIME = 12 * 60 * 60 * 1000;

        const absoluteReauthTimer = setTimeout(() => {
            handleSignOut();
        }, SESSION_MAX_LIFETIME);

        return () => {
            clearTimeout(absoluteReauthTimer);
        };
    }, [handleSignOut]);

    // Check for password expiration (365 days) or First Login on mount
    useEffect(() => {
        if (!user || appPathname.includes("/force-rubah-password")) return;
        if (user.passwordResetRequired) {
            router.replace(toTenantPath("/force-rubah-password"));
            return;
        }
        if (user.passwordChangedAt) {
            const lastUpdatedDate = new Date(user.passwordChangedAt);
            const daysSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);
            if (daysSinceUpdate > 365) {
                router.replace(toTenantPath("/force-rubah-password"));
            }
        }
    }, [appPathname, router, toTenantPath, user]);

    useEffect(() => {
        resetLogoutTimer();

        const events = ["click", "mousemove", "keydown", "scroll", "touchstart"];

        const handleUserActivity = () => {
            resetLogoutTimer();
        };

        events.forEach(event => {
            window.addEventListener(event, handleUserActivity);
        });

        return () => {
            if (logoutTimerRef.current) {
                clearTimeout(logoutTimerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleUserActivity);
            });
        };
    }, [resetLogoutTimer]);

    const currentPage =
        allNavItems.find(
            (n) =>
                appPathname === n.href ||
                (n as any).children?.some((c: any) => appPathname.startsWith(c.href))
        )?.label || "Admin";

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Sidebar Overlay (mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-white flex flex-col transition-transform duration-300 lg:translate-x-0 border-r border-slate-200 shadow-sm",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200">
                    <div className="flex h-9 w-9 items-center justify-center shrink-0">
                        <Image
                            src="/bogor.png"
                            alt="Logo Kabupaten Bogor"
                            width={28}
                            height={28}
                            className="h-7 w-7 object-contain"
                            priority
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-bold text-slate-900 tracking-tight">SIMDATA Kecamatan</h1>
                        <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">
                            {tenant?.nama || "Dashboard"}
                        </p>
                    </div>
                    <button
                        className="lg:hidden text-slate-400 hover:text-slate-700"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav Groups */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
                    {navGroups.map((group) => {
                        // Filter items based on role
                        const visibleItems = group.items.filter(item => {
                            if (item.label === "Pengguna" || item.label === "Backup database") {
                                return profile?.role === "super_admin";
                            }
                            if (item.label === "Log Aktivitas") {
                                return profile?.role === "admin_kecamatan" || profile?.role === "super_admin";
                            }
                            return true;
                        });

                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={group.title}>
                                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                                    {group.title}
                                </p>
                                <div className="space-y-0.5">
                                    {visibleItems.map((item) => (
                                        <SidebarItem key={item.href} item={item} pathname={appPathname} searchString={searchString} toTenantPath={toTenantPath} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* User section removed from sidebar as requested */}
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden text-slate-400 hover:text-slate-700 transition-colors"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">{currentPage}</h2>
                            <p className="text-[11px] text-slate-400">{tenant?.nama}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 relative">
                        {/* User Profile Info & Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                className="flex items-center gap-2 focus:outline-none"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white hover:ring-blue-100 transition-all cursor-pointer">
                                    {profile?.nama_lengkap?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                            </button>

                            {profileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                            <p className="text-sm font-bold text-slate-700 truncate">{profile?.nama_lengkap || "Admin"}</p>
                                            <p className="text-[10px] text-slate-500 capitalize">{profile?.role?.replace("_", " ") || "—"}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setProfileMenuOpen(false);
                                                setIsPasswordModalOpen(true);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-2.5"
                                        >
                                            <Key className="w-4 h-4" />
                                            Rubah Password
                                        </button>


                                        <button
                                            onClick={handleSignOut}
                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Keluar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <ChangePasswordModal
                    onClose={() => setIsPasswordModalOpen(false)}
                />
            )}
        </div>
    );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirm) {
            setError("Kombinasi password tidak cocok.");
            return;
        }
        if (password.length < 8) {
            setError("Password minimal 8 karakter.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/auth/password/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword: password }),
            });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || "Gagal mengubah password.");
            }

            setSuccess("Password berhasil diubah!");
            setTimeout(() => onClose(), 2000);
        } catch (err: any) {
            setError(err.message || "Gagal mengubah password");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Need to make sure we render in document.body, checking if mounted
    const [mounted, setMounted] = useState(false);

    // NextJS fix for hydration issue with portals
    useEffect(() => setMounted(true), []);

    if (typeof document === "undefined" || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />

                <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-gray-100 shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                            <Key className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Rubah Password</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Perbarui kata sandi akun Anda.</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <form id="password-form" onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-100">
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Password Baru <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="Masukkan password baru"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Konfirmasi Password Baru <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    className={cn(
                                        "w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:ring-2 transition-all shadow-sm",
                                        confirm && password !== confirm ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" :
                                            confirm && password === confirm ? "border-green-300 focus:border-green-500 focus:ring-green-500/20" :
                                                "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                                    )}
                                    placeholder="Ulangi password baru"
                                    required
                                />
                            </div>
                            {confirm && password === confirm && (
                                <p className="text-xs text-green-600 mt-1 font-medium">Sandi cocok.</p>
                            )}
                        </div>
                    </form>
                </div>

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
                            form="password-form"
                            disabled={isSubmitting || !password || password !== confirm}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan Password
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
