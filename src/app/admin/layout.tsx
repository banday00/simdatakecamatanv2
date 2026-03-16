"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { useTenant } from "@/lib/tenant/context";
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
                    { label: "Kependudukan", href: "/admin/pemerintahan/kependudukan" },
                    { label: "Lembaga", href: "/admin/pemerintahan/lembaga" },
                    { label: "Organisasi", href: "/admin/pemerintahan/organisasi" },
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
        title: "KONTEN & ANALISIS",
        items: [
            { label: "Berita", href: "/admin/berita", icon: Newspaper },
            { label: "WebGIS", href: "/admin/peta", icon: Map },
            { label: "Perbandingan", href: "/admin/perbandingan", icon: GitCompareArrows },
            { label: "Analisis Tren", href: "/admin/tren", icon: TrendingUp },
        ],
    },
    {
        title: "PENGATURAN",
        items: [
            { label: "Pengguna", href: "/admin/pengguna", icon: Users },
            { label: "Log Aktivitas", href: "/admin/log-aktivitas", icon: Activity },
        ],
    },
];

// Flatten for header title lookup
const allNavItems = navGroups.flatMap(g => g.items);

type NavItem = (typeof allNavItems)[number];

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
    const isActive =
        pathname === item.href ||
        (item as any).children?.some((c: any) => pathname.startsWith(c.href));
    const hasChildren = (item as any).children?.length > 0;
    const [open, setOpen] = useState(isActive);

    return (
        <div>
            <Link
                href={hasChildren ? (item as any).children[0].href : item.href}
                className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] transition-all duration-150",
                    isActive
                        ? "bg-white/10 text-white font-semibold"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
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
                <div className="ml-9 mt-0.5 space-y-0.5 border-l border-white/5 pl-3">
                    {(item as any).children.map((child: any) => (
                        <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                                "block px-3 py-1.5 rounded-md text-[12px] transition-colors",
                                pathname === child.href || pathname.startsWith(child.href + "/")
                                    ? "text-cyan-300 font-semibold bg-white/5"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
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
    const pathname = usePathname();
    const router = useRouter();
    const { profile, signOut } = useAuth();
    const { tenant } = useTenant();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Add reference for auto-logout timer
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Create a supabase client to handle auth tasks like update password
    const supabase = createClient();

    const handleSignOut = useCallback(async () => {
        await signOut();
        router.push("/login");
    }, [signOut, router]);

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

        // Also perform periodic check against Supabase actual session expiry
        const intervalId = setInterval(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.expires_at) {
                // expires_at is in seconds
                const expiresAtMs = session.expires_at * 1000;
                if (Date.now() >= expiresAtMs) {
                    handleSignOut();
                }
            } else if (!session) {
                handleSignOut();
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => {
            clearTimeout(absoluteReauthTimer);
            clearInterval(intervalId);
        };
    }, [handleSignOut, supabase.auth]);

    // Check for password expiration (365 days) or First Login on mount
    useEffect(() => {
        const checkPasswordAge = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const passwordChangedAt = user?.user_metadata?.password_changed_at;

            // Scenario 1: First login (password_changed_at is strictly null)
            if (passwordChangedAt === null && !pathname.includes("/admin/force-rubah-password")) {
                router.replace("/admin/force-rubah-password");
                return;
            }

            // Scenario 2: Password age exceeds 365 days
            if (passwordChangedAt) {
                const lastUpdatedDate = new Date(passwordChangedAt);
                const daysSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);

                if (daysSinceUpdate > 365 && !pathname.includes("/admin/force-rubah-password")) {
                    router.replace("/admin/force-rubah-password");
                }
            } else if (user?.updated_at) {
                const lastUpdatedDate = new Date(user.updated_at);
                const daysSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);

                // If password is older than 365 days, and we are not on the force change page
                if (daysSinceUpdate > 365 && !pathname.includes("/admin/force-rubah-password")) {
                    router.replace("/admin/force-rubah-password");
                }
            }
        };
        checkPasswordAge();
    }, [pathname, router, supabase.auth]);

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
                pathname === n.href ||
                (n as any).children?.some((c: any) => pathname.startsWith(c.href))
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
                    "fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-[#0c1222] flex flex-col transition-transform duration-300 lg:translate-x-0 border-r border-white/5",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-bold text-white tracking-tight">SIDAKOTA</h1>
                        <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">
                            {tenant?.nama || "Dashboard"}
                        </p>
                    </div>
                    <button
                        className="lg:hidden text-slate-500 hover:text-white"
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
                            if (item.label === "Pengaturan" || item.label === "Log Aktivitas") {
                                return profile?.role === "admin_kecamatan" || profile?.role === "super_admin";
                            }
                            return true;
                        });

                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={group.title}>
                                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
                                    {group.title}
                                </p>
                                <div className="space-y-0.5">
                                    {visibleItems.map((item) => (
                                        <SidebarItem key={item.href} item={item} pathname={pathname} />
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
                    supabase={supabase}
                />
            )}
        </div>
    );
}

function ChangePasswordModal({ onClose, supabase }: { onClose: () => void, supabase: any }) {
    const [oldPassword, setOldPassword] = useState("");
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
        if (password.length < 6) {
            setError("Password minimal 6 karakter.");
            return;
        }

        if (!oldPassword) {
            setError("Password lama wajib diisi.");
            return;
        }

        setIsSubmitting(true);
        try {
            // First, get the current user to know their email
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user?.email) throw new Error("Gagal mengambil data user saat ini.");

            // Verify the old password by trying to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: oldPassword,
            });

            if (signInError) {
                // Return a user-friendly error if old password is wrong
                throw new Error("Password lama yang Anda masukkan salah.");
            }

            // If sign in succeeds, old password is correct. Now update to the new password.
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

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

                        <div className="pb-4 mb-4 border-b border-gray-100">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Password Lama <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={e => setOldPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all shadow-sm"
                                    placeholder="Masukkan password lama"
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">Diperlukan untuk memverifikasi identitas Anda.</p>
                        </div>

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
                            disabled={isSubmitting || !password || password !== confirm || !oldPassword}
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
