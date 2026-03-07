import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
    // Create a response to modify
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // ---- Tenant Detection ----
    const hostname = request.headers.get("host") || "";
    const isLocalhost =
        hostname.includes("localhost") || hostname.includes("127.0.0.1");

    let tenantSlug: string;

    if (isLocalhost) {
        // Development: use cookie or default
        tenantSlug =
            request.cookies.get("tenant_slug")?.value ||
            process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ||
            "bogorutara";
    } else {
        // Production: extract from subdomain
        // e.g., "bogorutara.kotabogor.go.id" → "bogorutara"
        const parts = hostname.split(".");
        tenantSlug = parts[0];
    }

    // Resolve tenant from database
    const { data: tenant } = await supabase
        .schema("sidakota")
        .from("tenants")
        .select("id, slug, nama")
        .eq("slug", tenantSlug)
        .eq("is_active", true)
        .single();

    if (!tenant && !request.nextUrl.pathname.startsWith("/_next")) {
        // Tenant not found — show 404
        return NextResponse.rewrite(new URL("/not-found", request.url));
    }

    // Set tenant info in headers for downstream use
    if (tenant) {
        supabaseResponse.headers.set("x-tenant-id", tenant.id);
        supabaseResponse.headers.set("x-tenant-slug", tenant.slug);
        supabaseResponse.headers.set("x-tenant-nama", encodeURIComponent(tenant.nama));
    }

    // ---- Auth Protection for /admin routes ----
    if (request.nextUrl.pathname.startsWith("/admin")) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("redirect", request.nextUrl.pathname);
            return NextResponse.redirect(url);
        }
    }

    // Refresh session (important for Supabase SSR)
    await supabase.auth.getUser();

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
