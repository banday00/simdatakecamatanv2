import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            db: {
                schema: "sidakota",
            },
            auth: {
                flowType: 'pkce',
            },
            cookieOptions: {
                // Set cookie maximum age to 12 hours (12 * 60 * 60)
                maxAge: 43200,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            }
        }
    );
}
