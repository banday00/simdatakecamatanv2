import { type NextRequest, NextResponse } from "next/server";

// ========== Tenant Resolution ==========

function shouldSkipTenantResolution(pathname: string): boolean {
    if (pathname === "/" || pathname === "/not-found") return true;
    if (pathname.startsWith("/api/")) return true;
    if (pathname.startsWith("/uploads/")) return true;
    if (pathname.startsWith("/_next/")) return true;
    if (pathname === "/favicon.ico" || pathname === "/manifest.webmanifest" || pathname === "/sw.js") {
        return true;
    }

    const lastSegment = pathname.split("/").pop() ?? "";
    return lastSegment.includes(".");
}

// ========== Security Headers ==========

function applySecurityHeaders(response: NextResponse): void {
    // Prevent clickjacking — block all iframe embedding
    response.headers.set("X-Frame-Options", "DENY");

    // Prevent MIME-type sniffing attacks
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Control referrer information leakage
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Restrict browser features/APIs that the app doesn't need
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );

    // Force HTTPS connections (effective in production behind TLS)
    response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
    );

    // Legacy XSS protection for older browsers
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // DNS prefetch control for performance
    response.headers.set("X-DNS-Prefetch-Control", "on");

    // Remove server identification headers
    response.headers.delete("X-Powered-By");
    response.headers.delete("Server");
}

// ========== Main Proxy ==========

export async function proxy(request: NextRequest) {
    let response: NextResponse;

    if (shouldSkipTenantResolution(request.nextUrl.pathname)) {
        response = NextResponse.next({ request });
    } else {
        response = NextResponse.next({ request });
        const tenantSlug = decodeURIComponent(
            request.nextUrl.pathname.split("/").filter(Boolean)[0] ?? ""
        );

        if (tenantSlug) {
            response.headers.set("x-tenant-slug", tenantSlug);
        }
    }

    // Apply security headers to ALL responses
    applySecurityHeaders(response);

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
