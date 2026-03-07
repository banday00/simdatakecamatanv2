"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useTenant } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
    Shield, Eye, EyeOff, Loader2, AlertCircle, Lock, Mail,
    ArrowLeft, CheckCircle2, X,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Animated Background (CSS-only, no Three.js)
   ═══════════════════════════════════════════════════════════ */
function AnimatedBackground() {
    return (
        <>
            {/* Base gradient */}
            <div className="fixed inset-0 -z-20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
            {/* Animated orbs */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
                <div className="absolute top-1/2 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "1s" }} />
                <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "2s" }} />
                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════
   Login Form
   ═══════════════════════════════════════════════════════════ */
function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Captcha state
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [operator, setOperator] = useState<"+" | "-">("+");
    const [captchaInput, setCaptchaInput] = useState("");

    // Consent state
    const [consent, setConsent] = useState(true);

    // Reset password states
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    const { signIn, profile } = useAuth();
    const { tenant } = useTenant();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/admin";

    // If already authenticated, redirect
    useEffect(() => {
        if (profile) {
            router.replace(redirect);
        }
    }, [profile, router, redirect]);

    // Generate Captcha
    const generateCaptcha = () => {
        const n1 = Math.floor(Math.random() * 10);
        let n2 = Math.floor(Math.random() * 10);
        const op = Math.random() > 0.5 ? "+" : "-";

        // Prevent negative results for simplicity
        if (op === "-" && n2 > n1) {
            const temp = n1;
            setNum1(n2);
            setNum2(temp);
        } else {
            setNum1(n1);
            setNum2(n2);
        }
        setOperator(op);
        setCaptchaInput("");
    };

    // Initialize Captcha on mount
    useEffect(() => {
        generateCaptcha();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email.trim()) { setError("Email harus diisi"); return; }
        if (!password.trim()) { setError("Password harus diisi"); return; }
        if (!captchaInput.trim()) { setError("Kode keamanan harus diisi"); return; }
        if (!consent) { setError("Anda harus menyetujui pernyataan pertanggungjawaban data."); return; }

        // Validate Captcha
        const expectedAnswer = operator === "+" ? num1 + num2 : num1 - num2;
        if (parseInt(captchaInput, 10) !== expectedAnswer) {
            setError("Kode keamanan (jawaban hitungan) salah.");
            generateCaptcha();
            return;
        }

        setIsSubmitting(true);

        const result = await signIn(email.trim(), password.trim());

        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
            generateCaptcha(); // regenerate on failed login
        } else if (result.actionRequired === "force_change_password") {
            router.push("/admin/force-rubah-password");
        } else {
            router.push(redirect);
        }
    }

    async function handleResetPassword() {
        if (!resetEmail.trim()) {
            setError("Masukkan email untuk reset password");
            return;
        }
        setResetLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
                redirectTo: `${siteUrl}/login`,
            });
            if (error) {
                setError(error.message);
            } else {
                setResetSuccess(true);
            }
        } catch {
            setError("Gagal mengirim link reset password.");
        } finally {
            setResetLoading(false);
        }
    }

    // Determine if submit should be disabled
    const isCaptchaValid = captchaInput.trim() !== "" && parseInt(captchaInput, 10) === (operator === "+" ? num1 + num2 : num1 - num2);
    const isSubmitDisabled = isSubmitting || !email.trim() || !password.trim() || !isCaptchaValid || !consent;

    return (
        <div className="relative w-full max-w-[360px] z-10">
            {/* Glassmorphism card */}
            <div className="relative backdrop-blur-xl bg-slate-900/80 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Gradient accent top */}
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <div className="p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4">
                            <Shield className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-xl font-extrabold text-white">SIDAKOTA</h1>
                        <p className="text-slate-300 text-xs mt-1">
                            {tenant?.nama || "Panel Administrasi Kecamatan"}
                        </p>
                    </div>

                    {/* Error */}
                    {error && !showResetPassword && (
                        <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                            <p className="text-rose-200 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-white mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@kotabogor.go.id"
                                    autoComplete="email"
                                    disabled={isSubmitting}
                                    className="w-full pl-11 pr-4 py-2.5 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all focus:outline-none disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-white mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    disabled={isSubmitting}
                                    className="w-full pl-11 pr-11 py-2.5 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all focus:outline-none disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="flex justify-end -mt-2">
                            <button
                                type="button"
                                onClick={() => { setShowResetPassword(!showResetPassword); setResetSuccess(false); setError(null); setResetEmail(email); }}
                                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Lupa Password?
                            </button>
                        </div>

                        {/* Reset Password Inline */}
                        {showResetPassword && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3">
                                {resetSuccess ? (
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                                        <p className="text-emerald-300 text-sm">Link reset password telah dikirim ke <strong>{resetEmail}</strong>. Periksa inbox atau folder spam.</p>
                                    </div>
                                ) : (
                                    <>
                                        {error && (
                                            <div className="flex items-center gap-2 text-rose-300 text-sm">
                                                <AlertCircle className="h-4 w-4 shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        )}
                                        <p className="text-slate-300 text-sm">Masukkan email Anda untuk menerima link reset password.</p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="email"
                                                    value={resetEmail}
                                                    onChange={(e) => setResetEmail(e.target.value)}
                                                    placeholder="email@kotabogor.go.id"
                                                    className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleResetPassword}
                                                disabled={resetLoading}
                                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 shrink-0 transition-colors"
                                            >
                                                {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim"}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Math Captcha */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2">Kode Keamanan</label>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-mono text-lg font-bold min-w-[100px] shrink-0">
                                    {num1} {operator} {num2} = ?
                                </div>
                                <input
                                    type="number"
                                    value={captchaInput}
                                    onChange={(e) => setCaptchaInput(e.target.value)}
                                    placeholder="Hasil"
                                    required
                                    disabled={isSubmitting}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all focus:outline-none disabled:opacity-50 text-center font-mono text-lg"
                                />
                            </div>
                        </div>

                        {/* Consent Toggle */}
                        <div className="flex items-start gap-3 pt-2">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={consent}
                                onClick={() => setConsent(!consent)}
                                disabled={isSubmitting}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${consent ? 'bg-blue-500' : 'bg-slate-700'
                                    }`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${consent ? 'translate-x-5' : 'translate-x-0'
                                    }`} />
                            </button>
                            <label className="text-[10px] text-slate-300 leading-tight cursor-pointer" onClick={() => !isSubmitting && setConsent(!consent)}>
                                Saya menyatakan bahwa data yang diinput adalah benar dan dapat dipertanggungjawabkan
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className={`w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed opacity-50 grayscale-[50%]' : 'hover:-translate-y-0.5'
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-slate-400 text-xs mt-6">
                        Sistem Informasi Data Kecamatan Terpadu
                        <br />
                        <span className="text-slate-500">© 2026 SIDAKOTA — {tenant?.nama || "Kota Bogor"}</span>
                    </p>
                </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl -z-10" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <AnimatedBackground />

            {/* Back to Home */}
            <Link
                href="/"
                className="fixed top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors z-50"
            >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Kembali ke Beranda</span>
            </Link>

            <Suspense
                fallback={
                    <div className="flex items-center gap-2 text-white/70">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Memuat...
                    </div>
                }
            >
                <LoginForm />
            </Suspense>
        </div>
    );
}
