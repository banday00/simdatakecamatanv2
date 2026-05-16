"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useTenant } from "@/lib/tenant/context";
import { useTenantPath } from "@/lib/tenant/use-tenant-path";
import Link from "next/link";
import Image from "next/image";
import {
    Eye, EyeOff, Loader2, AlertCircle, Lock, Mail,
    ArrowLeft, CheckCircle2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Light Animated Background
   ═══════════════════════════════════════════════════════════ */
function AnimatedBackground() {
    return (
        <>
            {/* Soft light base */}
            <div className="fixed inset-0 -z-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" />
            {/* Subtle colour orbs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
                <div className="absolute top-1/2 -right-24 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s", animationDelay: "1s" }} />
                <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "7s", animationDelay: "2s" }} />
                {/* Faint grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />
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
    const toTenantPath = useTenantPath();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectParam = searchParams.get("redirect");
    const fallbackRedirect = toTenantPath("/admin");
    const redirect =
        redirectParam && tenant?.slug && (
            redirectParam === `/${tenant.slug}` ||
            redirectParam.startsWith(`/${tenant.slug}/`)
        )
            ? redirectParam
            : fallbackRedirect;

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

        if (op === "-" && n2 > n1) {
            setNum1(n2);
            setNum2(n1);
        } else {
            setNum1(n1);
            setNum2(n2);
        }
        setOperator(op);
        setCaptchaInput("");
    };

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
            generateCaptcha();
        } else if (result.actionRequired === "force_change_password") {
            router.push(toTenantPath("/admin/force-rubah-password"));
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
            const res = await fetch("/api/auth/password-reset/request", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email: resetEmail.trim() }),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                setError(json.error || "Gagal meminta reset password.");
            } else {
                setResetSuccess(true);
            }
        } catch {
            setError("Gagal mengirim link reset password.");
        } finally {
            setResetLoading(false);
        }
    }

    const isCaptchaValid = captchaInput.trim() !== "" && parseInt(captchaInput, 10) === (operator === "+" ? num1 + num2 : num1 - num2);
    const isSubmitDisabled = isSubmitting || !email.trim() || !password.trim() || !isCaptchaValid || !consent;

    // Shared input style (light theme)
    const inputCls = "w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all focus:outline-none disabled:opacity-50";

    return (
        <div className="relative w-full max-w-[380px] z-10">
            {/* Card */}
            <div className="relative bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden">


                <div className="p-7">
                    {/* Header */}
                    <div className="text-center mb-7">
                        {/* Logos row */}
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Image
                                src="/bogor.png"
                                alt="Logo Kota Bogor"
                                width={52}
                                height={52}
                                className="object-contain drop-shadow-sm"
                                priority
                            />
                            <div className="w-px h-10 bg-slate-200" />
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal</span>
                                <span className="text-lg font-extrabold text-slate-800 leading-tight">SIMDATA</span>
                                <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Kecamatan</span>
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Panel Admin</span>
                        </div>

                        <p className="text-slate-500 text-sm font-medium">
                            {tenant?.nama || "Kecamatan — Kota Bogor"}
                        </p>
                    </div>

                    {/* Error */}
                    {error && !showResetPassword && (
                        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
                            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                            <p className="text-rose-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@kotabogor.go.id"
                                    autoComplete="email"
                                    disabled={isSubmitting}
                                    className={`${inputCls} pl-10 pr-4`}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    disabled={isSubmitting}
                                    className={`${inputCls} pl-10 pr-11`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="flex justify-end -mt-1">
                            <button
                                type="button"
                                onClick={() => { setShowResetPassword(!showResetPassword); setResetSuccess(false); setError(null); setResetEmail(email); }}
                                className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                            >
                                Lupa Password?
                            </button>
                        </div>

                        {/* Reset Password Inline */}
                        {showResetPassword && (
                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                                {resetSuccess ? (
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                        <p className="text-emerald-700 text-sm">Link reset password dikirim ke <strong>{resetEmail}</strong>. Cek inbox atau spam.</p>
                                    </div>
                                ) : (
                                    <>
                                        {error && (
                                            <div className="flex items-center gap-2 text-rose-600 text-sm">
                                                <AlertCircle className="h-4 w-4 shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        )}
                                        <p className="text-slate-600 text-sm">Masukkan email Anda untuk menerima link reset password.</p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="email"
                                                    value={resetEmail}
                                                    onChange={(e) => setResetEmail(e.target.value)}
                                                    placeholder="email@kotabogor.go.id"
                                                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleResetPassword}
                                                disabled={resetLoading}
                                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 shrink-0 transition-colors"
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
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Kode Keamanan</label>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-mono text-base font-bold min-w-[100px] shrink-0 select-none">
                                    {num1} {operator} {num2} = ?
                                </div>
                                <input
                                    type="number"
                                    value={captchaInput}
                                    onChange={(e) => setCaptchaInput(e.target.value)}
                                    placeholder="Hasil"
                                    required
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all focus:outline-none disabled:opacity-50 text-center font-mono text-base"
                                />
                            </div>
                        </div>

                        {/* Consent Toggle */}
                        <div className="flex items-start gap-3 pt-1">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={consent}
                                onClick={() => setConsent(!consent)}
                                disabled={isSubmitting}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${consent ? 'bg-indigo-500' : 'bg-slate-200'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${consent ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                            <label
                                className="text-[11px] text-slate-500 leading-relaxed cursor-pointer"
                                onClick={() => !isSubmitting && setConsent(!consent)}
                            >
                                Saya menyatakan bahwa data yang diinput adalah benar dan dapat dipertanggungjawabkan
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className={`w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed grayscale-[30%]' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200'}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-slate-400 text-[11px] mt-6 leading-relaxed">
                        Sistem Informasi Manajemen Data
                        <br />
                        <span className="text-slate-300">© 2026 SIMDATA KECAMATAN — {tenant?.nama || "Kota Bogor"}</span>
                    </p>
                </div>
            </div>

            {/* Soft glow below card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-200/30 via-indigo-200/30 to-purple-200/30 rounded-3xl blur-2xl -z-10" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
    const toTenantPath = useTenantPath();

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <AnimatedBackground />

            {/* Back to Home */}
            <Link
                href={toTenantPath("/")}
                className="fixed top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors z-50 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">Beranda</span>
            </Link>

            <Suspense
                fallback={
                    <div className="flex items-center gap-2 text-slate-500">
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
