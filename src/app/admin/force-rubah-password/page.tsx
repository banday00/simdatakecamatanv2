"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, ShieldAlert, Loader2, LogOut } from "lucide-react";

export default function ForceChangePasswordPage() {
    const { profile, user, signOut } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI states
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // If there is no profile, they shouldn't be here
    useEffect(() => {
        if (!profile) {
            router.replace("/login");
        }
    }, [profile, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            setError("Semua field wajib diisi.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Konfirmasi password tidak cocok.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password baru minimal 6 karakter.");
            return;
        }

        if (oldPassword === newPassword) {
            setError("Password baru tidak boleh sama dengan password lama.");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Verify old password by trying to log in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user?.email || "",
                password: oldPassword,
            });

            if (signInError) {
                setError("Password lama salah.");
                setIsSubmitting(false);
                return;
            }

            // 2. Update to new password and set metadata
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
                data: {
                    password_changed_at: new Date().toISOString()
                }
            });

            if (updateError) {
                setError(updateError.message);
                setIsSubmitting(false);
                return;
            }

            setSuccess(true);

            // Redirect to admin after short delay
            setTimeout(() => {
                router.push("/admin");
            }, 2000);

        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan saat merubah password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    // Calculate password strength
    const getStrength = (pass: string) => {
        let s = 0;
        if (pass.length > 5) s += 1;
        if (pass.length > 7) s += 1;
        if (/[A-Z]/.test(pass)) s += 1;
        if (/[0-9]/.test(pass)) s += 1;
        if (/[^A-Za-z0-9]/.test(pass)) s += 1;
        return s;
    };

    const strength = getStrength(newPassword);
    const strengthText =
        strength === 0 ? ""
            : strength <= 2 ? "Lemah"
                : strength <= 3 ? "Sedang"
                    : "Kuat";
    const strengthColor =
        strength <= 2 ? "bg-red-400"
            : strength <= 3 ? "bg-amber-400"
                : "bg-emerald-500";

    if (!profile) return null; // Wait for redirect if not logged in

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                    <ShieldAlert className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
                    Otentikasi Keamanan SIDAKOTA
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    User baru atau password berumur lebih dari 365 hari wajib rubah password. Demi keamanan sistem kelurahan, Anda diwajibkan untuk memperbarui kata sandi sebelum melanjutkan.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-xl sm:px-10 border border-slate-100">
                    {success ? (
                        <div className="text-center py-4 text-emerald-600 font-medium">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <KeyRound className="w-6 h-6" />
                            </div>
                            Sandi sukses diperbarui!<br />Mengarahkan ke dashboard...
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-start gap-2">
                                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Password Lama</label>
                                <div className="mt-1">
                                    <input
                                        type="password"
                                        required
                                        className="block w-full rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-slate-50 px-3 py-2 border outline-none"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Password Baru</label>
                                <div className="mt-1">
                                    <input
                                        type="password"
                                        required
                                        className="block w-full rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-slate-50 px-3 py-2 border outline-none"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                {newPassword.length > 0 && (
                                    <div className="mt-2 text-xs flex items-center gap-2">
                                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${strengthColor} transition-all duration-300`}
                                                style={{ width: `${(strength / 5) * 100}%` }}
                                            />
                                        </div>
                                        <span className={
                                            strength <= 2 ? "text-red-500 font-medium" :
                                                strength <= 3 ? "text-amber-500 font-medium" :
                                                    "text-emerald-600 font-medium"
                                        }>{strengthText}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Konfirmasi Password</label>
                                <div className="mt-1">
                                    <input
                                        type="password"
                                        required
                                        className="block w-full rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-slate-50 px-3 py-2 border outline-none"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                {confirmPassword && (
                                    <p className={`mt-1.5 text-xs font-medium flex items-center gap-1.5 ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {newPassword === confirmPassword ? '✓ Password cocok' : '✗ Password tidak sama'}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || strength < 4 || newPassword !== confirmPassword}
                                    className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                                    Perbarui Sandi Sekarang
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    disabled={isSubmitting}
                                    className="flex w-full justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Keluar (Logout)
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
