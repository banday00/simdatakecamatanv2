const EXTERNAL_PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i;

export function isTenantlessHref(href: string): boolean {
    return (
        href === "" ||
        href.startsWith("#") ||
        href.startsWith("?") ||
        href.startsWith("/api") ||
        href.startsWith("/_next") ||
        EXTERNAL_PROTOCOL_RE.test(href)
    );
}

export function tenantPath(tenantSlug: string | null | undefined, href: string): string {
    if (!tenantSlug || isTenantlessHref(href)) return href;

    const normalizedHref = href.startsWith("/") ? href : `/${href}`;
    if (normalizedHref === `/${tenantSlug}` || normalizedHref.startsWith(`/${tenantSlug}/`)) {
        return normalizedHref;
    }

    if (normalizedHref === "/") return `/${tenantSlug}`;
    return `/${tenantSlug}${normalizedHref}`;
}

export function stripTenantPath(pathname: string, tenantSlug: string | null | undefined): string {
    if (!tenantSlug) return pathname;
    if (pathname === `/${tenantSlug}`) return "/";
    if (pathname.startsWith(`/${tenantSlug}/`)) {
        return pathname.slice(tenantSlug.length + 1) || "/";
    }
    return pathname;
}
