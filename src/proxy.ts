import { type NextRequest, NextResponse } from "next/server";

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

export async function proxy(request: NextRequest) {
    if (shouldSkipTenantResolution(request.nextUrl.pathname)) {
        return NextResponse.next({ request });
    }

    const response = NextResponse.next({ request });
    const tenantSlug = decodeURIComponent(
        request.nextUrl.pathname.split("/").filter(Boolean)[0] ?? ""
    );

    if (tenantSlug) {
        response.headers.set("x-tenant-slug", tenantSlug);
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
