"use client";

import {
    createContext,
    useContext,
    type ReactNode,
} from "react";
import { SessionProvider, signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from "next-auth/react";
import type { UserProfile } from "@/types";
import type { AppSessionUser } from "@/lib/auth/types";

type AuthContextType = {
    user: AppSessionUser | null;
    profile: UserProfile | null;
    session: { user: AppSessionUser } | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null; actionRequired?: string }>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    signIn: async () => ({ error: null }),
    signOut: async () => { },
    refreshSession: async () => { },
});

async function logAuthActivity(action: "login" | "logout") {
    try {
        await fetch("/api/auth/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
    } catch {
        // Activity logging must never block auth UX.
    }
}

function AuthContextBridge({ children }: { children: ReactNode }) {
    const { data, status, update } = useSession();
    const user = data?.user ?? null;
    const profile = user?.profile ?? null;

    async function signIn(email: string, password: string) {
        const result = await nextAuthSignIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            return { error: "Email atau password salah.", actionRequired: undefined };
        }

        const session = await update();
        const nextUser = session?.user ?? user;

        if (nextUser?.profile) {
            logAuthActivity("login");
        }

        if (nextUser?.passwordResetRequired) {
            return { error: null, actionRequired: "force_change_password" };
        }

        if (nextUser?.passwordChangedAt) {
            const lastUpdatedDate = new Date(nextUser.passwordChangedAt);
            const daysSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);
            if (daysSinceUpdate > 365) {
                return { error: null, actionRequired: "force_change_password" };
            }
        }

        return { error: null, actionRequired: undefined };
    }

    async function signOut() {
        if (user && profile) {
            await logAuthActivity("logout");
        }
        await nextAuthSignOut({ redirect: false });
    }

    async function refreshSession() {
        await update();
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                session: data?.user ? { user: data.user } : null,
                isLoading: status === "loading",
                signIn,
                signOut,
                refreshSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <SessionProvider refetchInterval={5 * 60}>
            <AuthContextBridge>{children}</AuthContextBridge>
        </SessionProvider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
