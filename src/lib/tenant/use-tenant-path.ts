"use client";

import { useCallback } from "react";
import { useTenant } from "@/lib/tenant/context";
import { tenantPath } from "@/lib/tenant/path";

export function useTenantPath() {
    const { tenant } = useTenant();

    return useCallback(
        (href: string) => tenantPath(tenant?.slug, href),
        [tenant?.slug]
    );
}
