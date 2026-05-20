"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import {
    LogOut,
    Loader2,
    Key,
    Lock,
    Save,
    BarChart3,
} from "lucide-react";

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <ExecutiveLayoutInner>{children}</ExecutiveLayoutInner>
        </Suspense>
    );
}

function ExecutiveLayoutInner({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { profile, user, signOut } = useAuth();
    const { tenant } = useTenant();
    const toTenantPath = useTenantPath();
    const pathname = usePathname();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleSignOut = useCallback(async () => {
        await signOut();
        router.push(toTenantPath("/login"));
    }, [signOut, router, toTenantPath]);

    // Guard: redirect non-executive users to admin
    useEffect(() => {
        if (!tenant || !profile) return;
        if (profile.role !== "executive_dashboard" && profile.role !== "super_admin") {
            router.replace(toTenantPath("/admin"));
        }
    }, [profile, router, tenant, toTenantPath]);

    // Auto-logout on 15 mins idle
    const resetLogoutTimer = useCallback(() => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = setTimeout(() => handleSignOut(), 900000);
    }, [handleSignOut]);

    // Hard re-auth after 12 hours
    useEffect(() => {
        const timer = setTimeout(() => handleSignOut(), 12 * 60 * 60 * 1000);
        return () => clearTimeout(timer);
    }, [handleSignOut]);

    // Password expiration check
    useEffect(() => {
        if (!user) return;
        if (user.passwordResetRequired) {
            router.replace(toTenantPath("/force-rubah-password"));
            return;
        }
        if (user.passwordChangedAt) {
            const days = (Date.now() - new Date(user.passwordChangedAt).getTime()) / (1000 * 3600 * 24);
            if (days > 365) router.replace(toTenantPath("/force-rubah-password"));
        }
    }, [router, toTenantPath, user]);

    useEffect(() => {
        resetLogoutTimer();
        const events = ["click", "mousemove", "keydown", "scroll", "touchstart"];
        const handler = () => resetLogoutTimer();
        events.forEach(e => window.addEventListener(e, handler));
        return () => {
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            events.forEach(e => window.removeEventListener(e, handler));
        };
    }, [resetLogoutTimer]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 h-14 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-4 md:px-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <Image src="/bogor.png" alt="Logo" width={28} height={28} className="h-7 w-7 object-contain" priority />
                    <div className="hidden sm:block w-px h-7 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        <div>
                            <h1 className="text-sm font-bold text-slate-800 leading-tight">Executive Dashboard</h1>
                            <p className="text-[10px] text-slate-500 leading-tight">{tenant?.nama || "SIMDATA Kecamatan"}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative">
                    <div className="relative">
                        <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="flex items-center gap-2 focus:outline-none">
                            <span className="hidden md:block text-right">
                                <span className="block text-xs font-semibold text-slate-700">{profile?.nama_lengkap || "User"}</span>
                                <span className="block text-[10px] text-slate-400 capitalize">{profile?.jabatan || profile?.role?.replace("_", " ") || "—"}</span>
                            </span>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white hover:ring-indigo-100 transition-all cursor-pointer">
                                {profile?.nama_lengkap?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                        </button>
                        {profileMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                        <p className="text-sm font-bold text-slate-700 truncate">{profile?.nama_lengkap || "Admin"}</p>
                                        <p className="text-[10px] text-slate-500 capitalize">{profile?.role?.replace("_", " ") || "—"}</p>
                                    </div>
                                    <button
                                        onClick={() => { setProfileMenuOpen(false); setIsPasswordModalOpen(true); }}
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

            {/* Page Content */}
            <main className="p-4 md:p-6 max-w-[1600px] mx-auto">{children}</main>

            {/* Password Modal */}
            {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />}
        </div>
    );
}

/* ═══════════════════════════════════════════
   Change Password Modal (reused pattern)
   ═══════════════════════════════════════════ */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setSuccess("");
        if (password !== confirm) { setError("Kombinasi password tidak cocok."); return; }
        if (password.length < 8) { setError("Password minimal 8 karakter."); return; }
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/auth/password/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword: password }),
            });
            const result = await res.json();
            if (!res.ok || result.error) throw new Error(result.error || "Gagal mengubah password.");
            setSuccess("Password berhasil diubah!");
            setTimeout(() => onClose(), 2000);
        } catch (err: any) { setError(err.message || "Gagal mengubah password"); }
        finally { setIsSubmitting(false); }
    };

    if (typeof document === "undefined" || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ animation: "modalSlideIn 0.3s ease-out" }}>
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shrink-0" />
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600"><Key className="w-6 h-6" /></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Rubah Password</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Perbarui kata sandi akun Anda.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <form id="exec-pw-form" onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">{error}</div>}
                        {success && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-100">{success}</div>}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password Baru</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="Masukkan password baru" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Konfirmasi Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:ring-2 transition-all shadow-sm ${confirm && password !== confirm ? "border-red-300" : confirm && password === confirm ? "border-green-300" : "border-gray-200"}`} placeholder="Ulangi password baru" required />
                            </div>
                        </div>
                    </form>
                </div>
                <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">Batal</button>
                    <button type="submit" form="exec-pw-form" disabled={isSubmitting || !password || password !== confirm} className="flex items-center gap-2 px-7 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Simpan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
