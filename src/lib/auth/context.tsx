"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity-logger";
import type { UserProfile } from "@/types";
import type { User, Session } from "@supabase/supabase-js";

type AuthContextType = {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null; actionRequired?: string }>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    signIn: async () => ({ error: null }),
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            setUser(s?.user ?? null);
            if (s?.user) loadProfile(s.user.id);
            else setIsLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            setUser(s?.user ?? null);
            if (s?.user) loadProfile(s.user.id);
            else {
                setProfile(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function loadProfile(userId: string) {
        try {
            const { data } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", userId)
                .single();

            setProfile(data as UserProfile | null);
        } catch {
            // Profile might not exist yet
        } finally {
            setIsLoading(false);
        }
    }

    async function signIn(email: string, password: string) {
        try {
            // Check lockout first
            const { data: isLocked } = await supabase.rpc("check_login_lockout", {
                p_email: email,
            });

            if (isLocked) {
                // Log the attempt
                await supabase.from("login_attempts").insert({
                    email,
                    success: false,
                    failure_reason: "account_locked",
                });
                return {
                    error: "Akun terkunci. Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.",
                    actionRequired: undefined,
                };
            }

            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // Log failed attempt
                await supabase.from("login_attempts").insert({
                    email,
                    success: false,
                    failure_reason: "invalid_password",
                });
                return { error: "Email atau password salah.", actionRequired: undefined };
            }

            // Check if user is active
            if (authData.user) {
                const { data: profile } = await supabase
                    .schema("sidakota")
                    .from("user_profiles")
                    .select("is_active")
                    .eq("id", authData.user.id)
                    .single();

                if (profile && profile.is_active === false) {
                    // Sign out immediately
                    await supabase.auth.signOut();

                    // Log failed attempt due to inactive account
                    await supabase.from("login_attempts").insert({
                        email,
                        success: false,
                        failure_reason: "inactive_account",
                    });

                    return { error: "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.", actionRequired: undefined };
                }
            }

            // Check if user is forced to change password because it is their first login (password_changed_at is strictly null)
            const passwordChangedAt = authData.user?.user_metadata?.password_changed_at;
            if (passwordChangedAt === null) {
                // Log success but flag as needing password reset
                await supabase.from("login_attempts").insert({
                    email,
                    success: true,
                    failure_reason: "first_login_requires_password_change"
                });
                return { error: null, actionRequired: "force_change_password" };
            }

            // Check if password has expired (older than 365 days)
            // If we have passwordChangedAt defined, use it. Otherwise fallback to user.updated_at
            if (passwordChangedAt) {
                const lastUpdatedDate = new Date(passwordChangedAt);
                const daysSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);

                if (daysSinceUpdate > 365) {
                    await supabase.from("login_attempts").insert({
                        email,
                        success: true,
                        failure_reason: "password_expired_requires_change"
                    });
                    return { error: null, actionRequired: "force_change_password" };
                }
            } else if (authData.user?.updated_at) {
                const lastUpdatedDate = new Date(authData.user.updated_at);
                const daysSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);

                if (daysSinceUpdate > 365) {
                    await supabase.from("login_attempts").insert({
                        email,
                        success: true,
                        failure_reason: "password_expired_requires_change"
                    });
                    return { error: null, actionRequired: "force_change_password" };
                }
            }

            // Log success
            await supabase.from("login_attempts").insert({
                email,
                success: true,
            });

            // Log activity with IP + user agent
            const userProfile = authData.user ? await supabase
                .schema("sidakota")
                .from("user_profiles")
                .select("tenant_id, nama_lengkap")
                .eq("id", authData.user.id)
                .single() : null;

            logActivity({
                action: "login",
                module: "auth",
                detail: `Login berhasil: ${email}`,
                userId: authData.user?.id,
                userEmail: email,
                userName: userProfile?.data?.nama_lengkap || email,
                tenantId: userProfile?.data?.tenant_id || undefined,
            });

            return { error: null, actionRequired: undefined };
        } catch {
            return { error: "Terjadi kesalahan. Coba lagi.", actionRequired: undefined };
        }
    }

    async function signOut() {
        // Log logout before clearing session
        if (user && profile) {
            logActivity({
                action: "logout",
                module: "auth",
                detail: `Logout: ${profile.nama_lengkap || user.email}`,
                userId: user.id,
                userEmail: user.email || undefined,
                userName: profile.nama_lengkap || undefined,
                tenantId: profile.tenant_id || undefined,
            });
        }
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
    }

    return (
        <AuthContext.Provider
            value={{ user, profile, session, isLoading, signIn, signOut }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
