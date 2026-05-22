import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { randomUUID } from "crypto";
import { pool } from "@/db/client";
import type { AppSessionUser } from "@/lib/auth/types";

const LOCKOUT_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

async function isLocked(email: string) {
    const result = await pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM login_attempts
         WHERE email = $1
           AND success = false
           AND attempted_at > now() - ($2 || ' minutes')::interval`,
        [email, LOCKOUT_MINUTES]
    );

    return (result.rows[0]?.count ?? 0) >= MAX_FAILED_ATTEMPTS;
}

async function recordLoginAttempt(email: string, success: boolean, failureReason?: string) {
    await pool.query(
        `INSERT INTO login_attempts (email, success, failure_reason)
         VALUES ($1, $2, $3)`,
        [email, success, failureReason ?? null]
    );
}

async function findUser(email: string): Promise<AppSessionUser | null> {
    const result = await pool.query(
        `SELECT
            u.id,
            u.email,
            u.password_hash,
            u.password_changed_at,
            u.password_reset_required,
            u.is_active AS user_is_active,
            u.updated_at,
            p.tenant_id,
            p.kelurahan_id,
            p.nama_lengkap,
            p.nip,
            p.jabatan,
            p.foto,
            p.role,
            p.is_active AS profile_is_active,
            p.last_login
         FROM users u
         JOIN user_profiles p ON p.id = u.id
         WHERE lower(u.email) = lower($1)
         LIMIT 1`,
        [email]
    );

    const row = result.rows[0];
    if (!row) return null;

    const profile = {
        id: row.id,
        tenant_id: row.tenant_id,
        kelurahan_id: row.kelurahan_id,
        nama_lengkap: row.nama_lengkap,
        nip: row.nip,
        jabatan: row.jabatan,
        foto: row.foto,
        role: row.role,
        is_active: row.profile_is_active,
        last_login: row.last_login?.toISOString?.() ?? row.last_login ?? null,
    };

    return {
        ...profile,
        id: row.id,
        email: row.email,
        passwordChangedAt: row.password_changed_at?.toISOString?.() ?? row.password_changed_at ?? null,
        passwordResetRequired: row.password_reset_required,
        updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at ?? null,
        sessionToken: null,
        profile,
    } satisfies AppSessionUser;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: {
        strategy: "jwt",
        maxAge: 12 * 60 * 60,
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            async authorize(credentials, request) {
                const email = String(credentials?.email ?? "").trim().toLowerCase();
                const password = String(credentials?.password ?? "");

                if (!email || !password) return null;
                if (await isLocked(email)) {
                    await recordLoginAttempt(email, false, "account_locked");
                    return null;
                }

                const result = await pool.query<{ password_hash: string; is_active: boolean }>(
                    `SELECT password_hash, is_active FROM users WHERE lower(email) = lower($1) LIMIT 1`,
                    [email]
                );
                const userRow = result.rows[0];

                if (!userRow || !(await compare(password, userRow.password_hash))) {
                    await recordLoginAttempt(email, false, "invalid_password");
                    return null;
                }

                if (!userRow.is_active) {
                    await recordLoginAttempt(email, false, "inactive_account");
                    return null;
                }

                const appUser = await findUser(email);
                if (!appUser || !appUser.profile.is_active) {
                    await recordLoginAttempt(email, false, "inactive_profile");
                    return null;
                }

                // Generate unique session token for single-session enforcement
                const sessionToken = randomUUID();
                const loginIp = request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim()
                    ?? request?.headers?.get?.("x-real-ip")
                    ?? null;
                const loginUa = request?.headers?.get?.("user-agent") ?? null;

                await Promise.all([
                    recordLoginAttempt(email, true),
                    pool.query(
                        `UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1`,
                        [appUser.id]
                    ),
                    pool.query(
                        `UPDATE user_profiles
                         SET last_login = now(),
                             current_session_id = $2,
                             current_session_ip = $3,
                             current_session_ua = $4,
                             current_session_at = now()
                         WHERE id = $1`,
                        [appUser.id, sessionToken, loginIp, loginUa]
                    ),
                ]);

                appUser.sessionToken = sessionToken;

                return {
                    ...appUser,
                    id: appUser.id,
                    email: appUser.email,
                    name: appUser.profile.nama_lengkap,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const appUser = user as unknown as AppSessionUser;
                token.user = appUser;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.user) {
                (session as unknown as { user: AppSessionUser }).user = token.user as AppSessionUser;
            }
            return session;
        },
    },
});
